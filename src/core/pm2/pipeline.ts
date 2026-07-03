import { logger } from '../../utils/logger';
import { createPm2Bridge, type ProcessEvent } from './bridge';
import { BufferStore } from './buffer';
import { readSystem, startMetricsCollector, stopMetricsCollector } from '../system/metrics';
import { WebSocketServer, WebSocket } from 'ws';
import type { Tick, ProcessSnapshot } from '../../types';
import { createStore } from '../persistence/store';
import { createAlertEngine } from '../alerts/engine';
import { sendWebhook, sendSlack, sendDiscord, sendEmailNotification } from '../notifications/channels';

const FULL_SYNC_INTERVAL = 5000;

export function createEventPipeline() {
  const bridge = createPm2Bridge();
  const buffer = new BufferStore();
  const persistence = createStore();
  const alerts = createAlertEngine();
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  let lastFullSync = 0;
  let fullSeq = 0;
  let tickInterval: ReturnType<typeof setInterval> | null = null;
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingEvents: ProcessEvent[] = [];

  function broadcast(tick: Tick): void {
    const data = JSON.stringify(tick);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  function persistTick(tick: Tick) {
    if (!persistence) return;

    const now = tick.ts;
    const sys = tick.system;
    persistence.pushSystemMetrics({
      ts: now,
      cpu: sys.cpu,
      memoryUsed: sys.memory.used,
      memoryTotal: sys.memory.total,
      load1: sys.loadAvg[0],
      load5: sys.loadAvg[1],
      load15: sys.loadAvg[2],
    });

    for (const event of tick.events) {
      if (event.type === 'remove') continue;
      persistence.pushProcessMetrics({
        ts: now,
        processId: event.process.id,
        processName: event.process.name,
        cpu: event.process.cpu,
        memory: event.process.memory,
      });
    }
  }

  function isChannelEnabled(ch: string): boolean {
    return process.env[`NOTIFY_${ch.toUpperCase()}_ENABLED`] !== '0';
  }

  function notifyAlerts(fired: import('../alerts/engine').AlertEvent[], allRules: import('../alerts/engine').AlertRule[]) {
    const webhookUrl = process.env.WEBHOOK_URL;
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    const discordUrl = process.env.DISCORD_WEBHOOK_URL;

    for (const alertEvent of fired) {
      logger.warn(`Alert: ${alertEvent.message}`);

      const rule = allRules.find((r) => r.id === alertEvent.ruleId);
      const channels = rule?.channels?.length ? rule.channels : ['browser'];

      const notificationPayload = {
        message: alertEvent.message,
        processName: alertEvent.processName,
        metric: alertEvent.metric,
        value: alertEvent.value,
        threshold: alertEvent.threshold,
      };

      if (channels.includes('webhook') && isChannelEnabled('webhook') && webhookUrl) {
        sendWebhook(webhookUrl, notificationPayload).catch(() => {});
      }
      if (channels.includes('slack') && isChannelEnabled('slack') && slackUrl) {
        sendSlack(slackUrl, { message: alertEvent.message }).catch(() => {});
      }
      if (channels.includes('discord') && isChannelEnabled('discord') && discordUrl) {
        sendDiscord(discordUrl, { message: alertEvent.message }).catch(() => {});
      }
      if (channels.includes('email') && isChannelEnabled('email') && !!process.env.SMTP_HOST && !!process.env.SMTP_FROM && !!process.env.SMTP_TO) {
        sendEmailNotification(`Alert: ${alertEvent.processName}`, alertEvent.message).catch(() => {});
      }
      if (channels.includes('browser') && isChannelEnabled('browser')) {
        // browser notifications are handled client-side via WebSocket
      }
    }
  }

  function evaluateAlerts(tick: Tick) {
    const allRules = alerts.getRules();

    for (const event of tick.events) {
      if (event.type === 'remove') continue;
      const proc = event.process;
      const metrics: Record<string, number> = {
        cpu: proc.cpu,
        memory: proc.memory,
        restarts: proc.restarts,
      };
      const fired = alerts.evaluate(proc.id, proc.name, metrics);
      if (fired.length > 0) {
        notifyAlerts(fired, allRules);
      }
    }
  }

  function populateHistory(events: ProcessEvent[], snapshots?: ProcessSnapshot[]) {
    for (const event of events) {
      if (event.type === 'remove') continue;
      const h = buffer.read(event.process.id);
      event.process.history = h;
    }
    if (snapshots) {
      for (const snap of snapshots) {
        const h = buffer.read(snap.id);
        snap.history = h;
      }
    }
  }

  function buildTick(events: ProcessEvent[], system: ReturnType<typeof readSystem>): Tick | null {
    const now = Date.now();
    const needsFullSync = now - lastFullSync > FULL_SYNC_INTERVAL;

    if (needsFullSync) {
      lastFullSync = now;
      fullSeq++;
      bridge.list().then((snapshots) => {
        populateHistory(events, snapshots);
        const tick: Tick = {
          ts: now,
          events,
          system,
          full: snapshots,
          fullSeq,
        };
        persistTick(tick);
        evaluateAlerts(tick);
        broadcast(tick);
      });
      return null;
    }

    populateHistory(events);
    const tick: Tick = { ts: now, events, system };
    persistTick(tick);
    evaluateAlerts(tick);
    return tick;
  }

  function flushThrottled(): void {
    if (pendingEvents.length === 0) return;
    const events = pendingEvents;
    pendingEvents = [];

    if (clients.size > 0) {
      const tick = buildTick(events, readSystem());
      if (tick && tick.events.length > 0) {
        broadcast(tick);
      }
    }
  }

  function start(): void {
    startMetricsCollector();

    bridge.subscribeReconnect(() => {
      const reconnectTick: Tick = {
        ts: Date.now(),
        events: [],
        system: readSystem(),
        type: 'reconnect',
      };
      broadcast(reconnectTick);
    });

    bridge.subscribe((events) => {
      const now = Date.now();
      let hasRemoves = false;

      for (const event of events) {
        if (event.type === 'update' || event.type === 'add') {
          buffer.push(event.process.id, now, event.process.cpu, event.process.memory);
        }
        if (event.type === 'remove') {
          buffer.remove(event.process.id);
          hasRemoves = true;
        }
      }

      pendingEvents.push(...events);

      if (hasRemoves) {
        flushThrottled();
      } else if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
          flushThrottled();
        }, 100);
      }
    });

    tickInterval = setInterval(async () => {
      if (clients.size === 0) return;

      const now = Date.now();
      const snapshots = await bridge.list();
      fullSeq++;

      for (const snap of snapshots) {
        buffer.push(snap.id, now, snap.cpu, snap.memory);
      }

      for (const snap of snapshots) {
        const h = buffer.read(snap.id);
        snap.history = h;
      }

      const system = readSystem();

      persistence.pushSystemMetrics({
        ts: now,
        cpu: system.cpu,
        memoryUsed: system.memory.used,
        memoryTotal: system.memory.total,
        load1: system.loadAvg[0],
        load5: system.loadAvg[1],
        load15: system.loadAvg[2],
      });

      for (const snap of snapshots) {
        persistence.pushProcessMetrics({
          ts: now,
          processId: snap.id,
          processName: snap.name,
          cpu: snap.cpu,
          memory: snap.memory,
        });
      }

      const tick: Tick = {
        ts: now,
        events: [],
        full: snapshots,
        fullSeq,
        system,
      };

      for (const snap of snapshots) {
        const metrics: Record<string, number> = {
          cpu: snap.cpu,
          memory: snap.memory,
          restarts: snap.restarts,
        };
        const fired = alerts.evaluate(snap.id, snap.name, metrics);
        if (fired.length > 0) {
          notifyAlerts(fired, alerts.getRules());
        }
      }

      broadcast(tick);
    }, 2000);
  }

  function stop(): void {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    if (throttleTimer) {
      clearTimeout(throttleTimer);
      throttleTimer = null;
    }
    pendingEvents = [];
    for (const client of clients) client.close();
    clients.clear();
    stopMetricsCollector();
    persistence?.close();
    bridge.disconnect();
  }

  return {
    bridge,
    buffer,
    persistence,
    alerts,
    wss,
    clients,
    start,
    stop,
  };
}

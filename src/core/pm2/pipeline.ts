import { createPm2Bridge, type ProcessEvent } from './bridge';
import { BufferStore } from './buffer';
import { readSystem } from '../system/metrics';
import { WebSocketServer, WebSocket } from 'ws';
import type { Tick } from '../../types';

const FULL_SYNC_INTERVAL = 5000;

export function createEventPipeline() {
  const bridge = createPm2Bridge();
  const buffer = new BufferStore();
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set<WebSocket>();

  let lastFullSync = 0;
  let lastFullHash = '';
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  function broadcast(tick: Tick): void {
    const data = JSON.stringify(tick);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  function buildTick(events: ProcessEvent[], system: ReturnType<typeof readSystem>): Tick {
    const now = Date.now();
    const needsFullSync = now - lastFullSync > FULL_SYNC_INTERVAL;
    const tick: Tick = {
      ts: now,
      events,
      system,
    };

    if (needsFullSync) {
      lastFullSync = now;
      bridge.list().then((snapshots) => {
        const hash = bridge.computeListHash(snapshots);
        if (hash !== lastFullHash) {
          lastFullHash = hash;
          tick.full = snapshots;
          tick.fullHash = hash;
        }
        broadcast(tick);
      });
      return tick;
    }

    return tick;
  }

  function start(): void {
    bridge.subscribe((events) => {
      const now = Date.now();

      for (const event of events) {
        if (event.type === 'update' || event.type === 'add') {
          buffer.push(event.process.id, now, event.process.cpu, event.process.memory);
        }
        if (event.type === 'remove') {
          buffer.remove(event.process.id);
        }
      }

      const tick = buildTick(events, readSystem());
      if (tick.events.length > 0) {
        broadcast(tick);
      }
    });

    tickInterval = setInterval(() => {
      if (clients.size === 0) return;
      const tick: Tick = {
        ts: Date.now(),
        events: [],
        system: readSystem(),
      };
      broadcast(tick);
    }, 2000);
  }

  function stop(): void {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
    for (const client of clients) client.close();
    clients.clear();
    bridge.disconnect();
  }

  return {
    bridge,
    buffer,
    wss,
    clients,
    start,
    stop,
  };
}

import type { ProcessSnapshot, ProcessStatus, ProcessMode } from '../../types';
import { logger } from '../../utils/logger';

let pm2Module: typeof import('pm2') | null = null;

try {
  pm2Module = require('pm2');
} catch {
  // pm2 not installed — bridge will use mock data
}

interface Pm2Event {
  event: 'start' | 'stop' | 'exit' | 'data' | 'online' | 'error';
  process: { pm_id: number; name: string };
  data?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pm2Bus = any;

type Listener = (events: ProcessEvent[]) => void;

export interface ProcessEvent {
  type: 'update' | 'add' | 'remove';
  process: ProcessSnapshot;
}

const STALE_THRESHOLD_MS = 10_000;
const BUS_HEARTBEAT_MS = 60_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function procToSnapshot(proc: any): ProcessSnapshot {
  const env = proc.pm2_env || {};
  const monit = proc.monit || {};

  let uptime = env.pm_uptime || 0;
  if (uptime > 1e12) {
    uptime = Date.now() - uptime;
  }

  return {
    id: proc.pm_id as number,
    name: proc.name as string,
    status: (env.status || proc.status || 'stopped') as ProcessStatus,
    pid: proc.pid as number,
    cpu: monit.cpu || 0,
    memory: monit.memory || 0,
    uptime,
    restarts: env.restart_time || 0,
    mode: (env.exec_mode === 'cluster_mode' ? 'cluster' : 'fork') as ProcessMode,
    instances: env.instances || 1,
    history: { ts: [], cpu: [], memory: [] },
  };
}

export function createPm2Bridge() {
  let bus: Pm2Bus | null = null;
  const processCache = new Map<number, ProcessSnapshot>();
  const lastUpdateMap = new Map<number, number>();
  const listeners = new Set<Listener>();

  let lastEventTime = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  function emitToListeners(events: ProcessEvent[]) {
    lastEventTime = Date.now();
    for (const fn of listeners) {
      fn(events);
    }
  }

  function startHeartbeat() {
    stopHeartbeat();
    lastEventTime = Date.now();
    heartbeatTimer = setInterval(() => {
      if (bus && lastEventTime > 0 && Date.now() - lastEventTime > BUS_HEARTBEAT_MS) {
        logger.warn('PM2 bus heartbeat timeout — reconnecting...');
        bus.close();
        bus = null;
        connect().catch(() => {});
      }
    }, BUS_HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function refreshSingleProcess(id: number): Promise<void> {
    if (!pm2Module) return Promise.resolve();
    return new Promise((resolve) => {
      pm2Module!.list((err: Error | null, list: unknown[]) => {
        if (err) return resolve();
        const proc = list.find((p: any) => p.pm_id === id);
        if (proc) {
          const snap = procToSnapshot(proc);
          processCache.set(id, snap);
          lastUpdateMap.set(id, Date.now());
        }
        resolve();
      });
    });
  }

  async function refreshProcessList(): Promise<ProcessSnapshot[]> {
    if (!pm2Module) return Array.from(processCache.values());
    return new Promise((resolve, reject) => {
      pm2Module!.list((err: Error | null, list: unknown[]) => {
        if (err) return reject(err);
        const now = Date.now();
        const snapshots = list.map((proc) => {
          const snap = procToSnapshot(proc);
          processCache.set(snap.id, snap);
          lastUpdateMap.set(snap.id, now);
          return snap;
        });
        resolve(snapshots);
      });
    });
  }

  async function reconcileStale(): Promise<void> {
    const now = Date.now();
    const staleIds: number[] = [];
    for (const [id, lastUpdate] of lastUpdateMap) {
      if (now - lastUpdate > STALE_THRESHOLD_MS) {
        staleIds.push(id);
      }
    }
    if (staleIds.length > 0) {
      await Promise.all(staleIds.map((id) => refreshSingleProcess(id)));
    }
  }

  async function connect(): Promise<void> {
    if (!pm2Module) {
      logger.warn('PM2 not installed — running in demo mode');
      return;
    }

    return new Promise((resolve, reject) => {
      pm2Module!.connect((err: Error | null) => {
        if (err) return reject(err);
        pm2Module!.launchBus((_err: Error | null, _bus: Pm2Bus) => {
          if (_err) return reject(_err);
          bus = _bus;
          startHeartbeat();

          bus.on('process:event', async (event: Pm2Event) => {
            const events: ProcessEvent[] = [];
            const now = Date.now();

            if (event.event === 'exit' || event.event === 'stop') {
              const cached = processCache.get(event.process.pm_id);
              if (cached) {
                cached.status = 'stopped';
                events.push({ type: 'update', process: { ...cached } });
              }
              lastUpdateMap.set(event.process.pm_id, now);
            }

            if (event.event === 'online' || event.event === 'start') {
              await refreshSingleProcess(event.process.pm_id);
              const snap = processCache.get(event.process.pm_id);
              if (snap) {
                events.push({ type: 'update', process: { ...snap } });
              }
            }

            if (events.length > 0) {
              emitToListeners(events);
            }
          });

          bus.on('*', (eventName: string, data: unknown) => {
            if (eventName.startsWith('data:')) {
              void data;
            }
          });

          refreshProcessList().then(() => resolve()).catch(reject);
        });
      });
    });
  }

  async function list(): Promise<ProcessSnapshot[]> {
    await reconcileStale();
    return Array.from(processCache.values());
  }

  function subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function disconnect(): void {
    stopHeartbeat();
    bus?.close();
    bus = null;
    pm2Module?.disconnect();
  }

  return {
    connect,
    list,
    subscribe,
    disconnect,
    isConnected: () => bus !== null,
  };
}

export type Pm2Bridge = ReturnType<typeof createPm2Bridge>;

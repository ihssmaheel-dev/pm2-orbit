import type { ProcessSnapshot, ProcessStatus, ProcessMode } from '../../types';
import { logger } from '../../utils/logger';

let pm2Module: typeof import('pm2') | null = null;

try {
  pm2Module = require('pm2');
} catch {
  // pm2 not installed — bridge will use mock data
}

// systeminformation for per-process CPU/memory (more reliable than PM2 monit)
let siModule: typeof import('systeminformation') | null = null;
try {
  siModule = require('systeminformation');
} catch {}

interface Pm2Event {
  event: 'start' | 'stop' | 'exit' | 'data' | 'online' | 'error';
  process: { pm_id: number; name: string };
  data?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pm2Bus = any;

type Listener = (events: ProcessEvent[]) => void;
type ReconnectListener = () => void;

export interface ProcessEvent {
  type: 'update' | 'add' | 'remove';
  process: ProcessSnapshot;
}

export interface LogEntry {
  id?: number;
  ts: number;
  processId: number;
  processName: string;
  stream: 'stdout' | 'stderr';
  message: string;
}

type LogListener = (entry: LogEntry) => void;

const STALE_THRESHOLD_MS = 10_000;
const BUS_HEARTBEAT_MS = 60_000;
const SI_CACHE_TTL = 1500;

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

let siCache: { data: Map<number, { cpu: number; memory: number }>; time: number } | null = null;

async function fetchSiMetrics(): Promise<Map<number, { cpu: number; memory: number }>> {
  const result = new Map<number, { cpu: number; memory: number }>();
  if (!siModule) return result;
  try {
    const procs = await siModule.processes();
    for (const p of procs.list || []) {
      result.set(p.pid, { cpu: p.cpu || 0, memory: p.memRss || p.mem || 0 });
    }
  } catch {}
  return result;
}

async function getSiMetrics(): Promise<Map<number, { cpu: number; memory: number }>> {
  const now = Date.now();
  if (siCache && now - siCache.time < SI_CACHE_TTL) return siCache.data;
  const data = await fetchSiMetrics();
  siCache = { data, time: now };
  return data;
}

function enrichSnapshots(snapshots: ProcessSnapshot[], siMap: Map<number, { cpu: number; memory: number }>) {
  for (const snap of snapshots) {
    const siData = snap.pid > 0 ? siMap.get(snap.pid) : undefined;
    if (siData) {
      snap.cpu = siData.cpu;
      snap.memory = siData.memory;
    }
  }
}

const MAX_LOG_LINES = parseInt(process.env.PM2_ORBIT_LOG_BUFFER || '1000', 10);

export function createPm2Bridge() {
  let bus: Pm2Bus | null = null;
  const processCache = new Map<number, ProcessSnapshot>();
  const lastUpdateMap = new Map<number, number>();
  const listeners = new Set<Listener>();

  const logBuffers = new Map<number, { entries: LogEntry[]; totalPushed: number }>();
  const logListeners = new Set<LogListener>();
  const reconnectListeners = new Set<ReconnectListener>();
  const statusHistoryMap = new Map<number, { ts: number; status: ProcessStatus }[]>();
  const statusChangeListeners = new Set<(pid: number, status: ProcessStatus, ts: number) => void>();
  const MAX_STATUS_HISTORY = 200;

  let lastEventTime = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let staleTimer: ReturnType<typeof setInterval> | null = null;

  const EMIT_DEDUP_MS = 300;
  const lastEmitMap = new Map<number, number>();

  let logIdCounter = 0;

  function pushLog(entry: LogEntry) {
    entry.id = logIdCounter++;
    let buf = logBuffers.get(entry.processId);
    if (!buf) {
      buf = { entries: [], totalPushed: 0 };
      logBuffers.set(entry.processId, buf);
    }
    buf.entries.push(entry);
    buf.totalPushed++;
    if (buf.entries.length > MAX_LOG_LINES) {
      buf.entries.splice(0, buf.entries.length - MAX_LOG_LINES);
    }
    for (const fn of logListeners) fn(entry);
  }

  function recordStatusChange(pid: number, status: ProcessStatus, ts?: number) {
    const timestamp = ts || Date.now();
    let hist = statusHistoryMap.get(pid);
    if (!hist) {
      hist = [];
      statusHistoryMap.set(pid, hist);
    }
    hist.push({ ts: timestamp, status });
    if (hist.length > MAX_STATUS_HISTORY) hist.splice(0, hist.length - MAX_STATUS_HISTORY);
    // Notify listeners of status change
    for (const fn of statusChangeListeners) fn(pid, status, timestamp);
  }

  function getStatusHistory(pid: number): { ts: number; status: ProcessStatus }[] {
    return statusHistoryMap.get(pid) || [];
  }

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
        for (const fn of reconnectListeners) fn();
        connect().catch(() => {});
      }
    }, BUS_HEARTBEAT_MS);
  }

  async function pruneCache() {
    if (!pm2Module) return;
    return new Promise<void>((resolve) => {
      pm2Module!.list((err: Error | null, list: unknown[]) => {
        if (err) return resolve();
        const activeIds = new Set(list.map((p: any) => p.pm_id as number));
        for (const id of processCache.keys()) {
          if (!activeIds.has(id)) {
            processCache.delete(id);
            lastUpdateMap.delete(id);
            logBuffers.delete(id);
          }
        }
        resolve();
      });
    });
  }

  function startStaleTimer() {
    staleTimer = setInterval(() => {
      reconcileStale();
      pruneCache();
    }, STALE_THRESHOLD_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (staleTimer) {
      clearInterval(staleTimer);
      staleTimer = null;
    }
  }

  async function refreshSingleProcess(id: number): Promise<void> {
    if (!pm2Module) return;
    await new Promise<void>((resolve) => {
      pm2Module!.list((err: Error | null, list: unknown[]) => {
        if (err) return resolve();
        const proc = list.find((p: any) => p.pm_id === id);
        if (proc) {
          const snap = procToSnapshot(proc);
          const existing = processCache.get(id);
          if (existing?.statusHistory) {
            snap.statusHistory = existing.statusHistory;
          }
          processCache.set(id, snap);
          lastUpdateMap.set(id, Date.now());
          snap.statusHistory = getStatusHistory(id);
        }
        resolve();
      });
    });
    const snap = processCache.get(id);
    if (snap && snap.pid > 0) {
      const siMap = await getSiMetrics();
      const siData = siMap.get(snap.pid);
      if (siData) {
        snap.cpu = siData.cpu;
        snap.memory = siData.memory;
      }
    }
  }

  async function refreshProcessList(): Promise<ProcessSnapshot[]> {
    if (!pm2Module) return Array.from(processCache.values());
    const snapshots = await new Promise<ProcessSnapshot[]>((resolve, reject) => {
      pm2Module!.list((err: Error | null, list: unknown[]) => {
        if (err) return reject(err);
        const now = Date.now();
        const snapshots = list.map((proc) => {
          const snap = procToSnapshot(proc);
          const hadEntry = processCache.has(snap.id);
          // Preserve existing statusHistory from previous cache entry
          const existing = processCache.get(snap.id);
          if (existing?.statusHistory) {
            snap.statusHistory = existing.statusHistory;
          }
          processCache.set(snap.id, snap);
          lastUpdateMap.set(snap.id, now);
          // Record initial status for new processes (or processes without history)
          if (!hadEntry || !statusHistoryMap.has(snap.id)) {
            // Seed with true process uptime if available (so uptime bar reflects real uptime)
            const uptimeMs = snap.uptime || 0;
            const seedTs = uptimeMs > 0 ? Date.now() - uptimeMs : undefined;
            recordStatusChange(snap.id, snap.status, seedTs);
          }
          // Always attach statusHistory from the map
          snap.statusHistory = getStatusHistory(snap.id);
          return snap;
        });
        resolve(snapshots);
      });
    });
    const siMap = await getSiMetrics();
    enrichSnapshots(snapshots, siMap);
    return snapshots;
  }

  async function reconcileStale(): Promise<void> {
    const now = Date.now();
    const staleIds = new Set<number>();
    for (const [id, lastUpdate] of lastUpdateMap) {
      if (now - lastUpdate > STALE_THRESHOLD_MS) {
        staleIds.add(id);
      }
    }
    if (staleIds.size === 0) return;

    // Single pm2.list() call instead of N calls
    if (!pm2Module) return;
    try {
      const list = await new Promise<unknown[]>((resolve, reject) => {
        pm2Module!.list((err: Error | null, data: unknown[]) => {
          if (err) return reject(err);
          resolve(data);
        });
      });

      const now2 = Date.now();
      for (const proc of list) {
        const p = proc as any;
        const id = p.pm_id as number;
        if (staleIds.has(id)) {
          const snap = procToSnapshot(p);
          processCache.set(id, snap);
          lastUpdateMap.set(id, now2);
        }
      }
    } catch {}
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

          startStaleTimer();

          bus.on('process:event', async (event: Pm2Event) => {
            const now = Date.now();
            const pid = event.process.pm_id;

            const lastEmit = lastEmitMap.get(pid);
            if (lastEmit && now - lastEmit < EMIT_DEDUP_MS) return;
            lastEmitMap.set(pid, now);

            const events: ProcessEvent[] = [];

            if (event.event === 'exit' || event.event === 'stop') {
              const cached = processCache.get(pid);
              if (cached) {
                cached.status = 'stopped';
                recordStatusChange(pid, 'stopped');
                events.push({ type: 'update', process: { ...cached } });
              }
              lastUpdateMap.set(pid, now);
            }

            if (event.event === 'online' || event.event === 'start') {
              recordStatusChange(pid, 'online');
              await refreshSingleProcess(pid);
              const snap = processCache.get(pid);
              if (snap) {
                events.push({ type: 'update', process: { ...snap } });
              }
            }

            if (events.length > 0) {
              emitToListeners(events);
            }
          });

          const ansiRe = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORa-z]/g;

          function stripAnsi(str: string): string {
            return str.replace(ansiRe, '');
          }

          function handleLogEvent(stream: 'stdout' | 'stderr', data: any) {
            if (!data) return;
            const processId = data.process?.pm_id ?? data.pm_id;
            if (processId == null) return;
            const processName = data.process?.name ?? data.name ?? `PID ${processId}`;
            const raw = data.data;
            const msg = raw != null ? (typeof raw === 'string' ? raw.replace(/\n$/, '') : String(raw)) : '';
            pushLog({
              ts: Date.now(),
              processId,
              processName,
              stream,
              message: stripAnsi(msg),
            });
          }

          bus.on('log:out', (data: any) => { handleLogEvent('stdout', data); });
          bus.on('log:err', (data: any) => { handleLogEvent('stderr', data); });

          refreshProcessList().then(() => resolve()).catch(reject);
        });
      });
    });
  }

  async function list(): Promise<ProcessSnapshot[]> {
    const snapshots = Array.from(processCache.values());
    const siMap = await getSiMetrics();
    enrichSnapshots(snapshots, siMap);
    return snapshots;
  }

  function getProcessIds(): number[] {
    return Array.from(processCache.keys());
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

  function subscribeLogs(fn: LogListener): () => void {
    logListeners.add(fn);
    return () => logListeners.delete(fn);
  }

  function subscribeReconnect(fn: ReconnectListener): () => void {
    reconnectListeners.add(fn);
    return () => reconnectListeners.delete(fn);
  }

  function subscribeStatusChanges(fn: (pid: number, status: ProcessStatus, ts: number) => void): () => void {
    statusChangeListeners.add(fn);
    return () => statusChangeListeners.delete(fn);
  }

  function seedStatusHistory(pid: number, entries: { ts: number; status: ProcessStatus }[]): void {
    let hist = statusHistoryMap.get(pid);
    if (!hist) {
      hist = [];
      statusHistoryMap.set(pid, hist);
    }
    // Merge: keep existing entries, add new ones, sort by timestamp
    const existing = new Set(hist.map((e) => `${e.ts}-${e.status}`));
    for (const entry of entries) {
      const key = `${entry.ts}-${entry.status}`;
      if (!existing.has(key)) {
        hist.push(entry);
        existing.add(key);
      }
    }
    hist.sort((a, b) => a.ts - b.ts);
    if (hist.length > MAX_STATUS_HISTORY) hist.splice(0, hist.length - MAX_STATUS_HISTORY);
  }

  function getLogBuffer(processId: number): LogEntry[] {
    const buf = logBuffers.get(processId);
    return buf ? buf.entries : [];
  }

  function getAllLogBuffers(): Map<number, { entries: LogEntry[]; totalPushed: number }> {
    return logBuffers;
  }

  function emitRemove(pid: number) {
    const cached = processCache.get(pid);
    if (cached) {
      emitToListeners([{ type: 'remove', process: { ...cached } }]);
      processCache.delete(pid);
      lastUpdateMap.delete(pid);
      logBuffers.delete(pid);
    }
  }

  return {
    connect,
    list,
    getProcessIds,
    subscribe,
    subscribeLogs,
    subscribeReconnect,
    subscribeStatusChanges,
    seedStatusHistory,
    getLogBuffer,
    getAllLogBuffers,
    disconnect,
    emitRemove,
    getStatusHistory,
    isConnected: () => bus !== null,
  };
}

export type Pm2Bridge = ReturnType<typeof createPm2Bridge>;

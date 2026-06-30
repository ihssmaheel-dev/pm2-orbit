import { create } from 'zustand';

export interface LogEntry {
  ts: number;
  processId: number;
  processName: string;
  stream: 'stdout' | 'stderr';
  message: string;
}

interface LogsStore {
  buffers: Map<number, LogEntry[]>;
  maxSize: number;
  paused: boolean;
  addLog: (entry: LogEntry) => void;
  clearLogs: (processId?: number) => void;
  setPaused: (paused: boolean) => void;
  getLogs: (processId: number) => LogEntry[];
}

const DEFAULT_MAX_SIZE = 500;
const FLUSH_MS = 250;
const BATCH_LIMIT = 100;

const working = new Map<number, LogEntry[]>();
const pending = new Map<number, LogEntry[]>();
const lastSeen = new Map<number, number>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let gcTimer: ReturnType<typeof setInterval> | null = null;

function getBuf(map: Map<number, LogEntry[]>, pid: number): LogEntry[] {
  let buf = map.get(pid);
  if (!buf) {
    buf = [];
    map.set(pid, buf);
  }
  return buf;
}

function gcStaleEntries() {
  const cutoff = Date.now() - 120_000;
  for (const [pid, ts] of lastSeen) {
    if (ts < cutoff) {
      working.delete(pid);
      pending.delete(pid);
      lastSeen.delete(pid);
    }
  }
}

function startGC() {
  if (gcTimer) return;
  gcTimer = setInterval(gcStaleEntries, 60_000);
}

if (typeof window !== 'undefined') startGC();

function flushToStore(set: (partial: Partial<LogsStore>) => void) {
  if (pending.size === 0) return;

  const snap = new Map(pending);
  pending.clear();

  for (const [pid, entries] of snap) {
    const buf = getBuf(working, pid);
    for (const e of entries) {
      buf.push(e);
      if (buf.length > DEFAULT_MAX_SIZE) {
        buf.shift();
      }
    }
  }

  const result = new Map<number, LogEntry[]>();
  for (const [pid, buf] of working) {
    result.set(pid, buf.slice());
  }

  set({ buffers: result });
}

function scheduleFlush(set: (partial: Partial<LogsStore>) => void) {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushToStore(set);
  }, FLUSH_MS);
}

export const useLogsStore = create<LogsStore>((set, get) => ({
  buffers: new Map(),
  maxSize: DEFAULT_MAX_SIZE,
  paused: false,

  addLog: (entry) => {
    if (get().paused) return;
    lastSeen.set(entry.processId, Date.now());
    getBuf(pending, entry.processId).push(entry);
    if (pending.size >= BATCH_LIMIT) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      flushToStore(set);
    } else {
      scheduleFlush(set);
    }
  },

  clearLogs: (processId) => {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    pending.clear();
    if (processId !== undefined) {
      working.delete(processId);
      set((state) => {
        const next = new Map(state.buffers);
        next.delete(processId);
        return { buffers: next };
      });
    } else {
      working.clear();
      set({ buffers: new Map() });
    }
  },

  setPaused: (paused) => {
    if (!paused) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      flushToStore(set);
    }
    set({ paused });
  },

  getLogs: (processId) => get().buffers.get(processId) || [],
}));

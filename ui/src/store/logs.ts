import { create } from 'zustand';

export interface LogEntry {
  id?: number;
  ts: number;
  processId: number;
  processName: string;
  stream: 'stdout' | 'stderr';
  message: string;
}

let nextLogId = 0;

function assignSeqId(entry: LogEntry): LogEntry {
  if (entry.id === undefined) {
    entry.id = nextLogId++;
  }
  return entry;
}

interface LogsStore {
  buffers: Map<number, LogEntry[]>;
  paused: boolean;
  clearedAt: number;
  addLog: (entry: LogEntry) => void;
  clearLogs: (processId?: number) => void;
  setPaused: (paused: boolean) => void;
  getLogs: (processId: number) => LogEntry[];
}

const DEFAULT_MAX_SIZE = 1000;
const FLUSH_MS = 250;
const BATCH_LIMIT = 100;

const working = new Map<number, LogEntry[]>();
const pending = new Map<number, LogEntry[]>();
let pendingCount = 0;
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
      const pendingEntry = pending.get(pid);
      if (pendingEntry) {
        pendingCount -= pendingEntry.length;
        pending.delete(pid);
      }
      working.delete(pid);
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
  pendingCount = 0;

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
    result.set(pid, buf);
  }

  set({ buffers: result });
}

function scheduleFlush(set: (partial: Partial<LogsStore>) => void) {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    requestAnimationFrame(() => flushToStore(set));
  }, FLUSH_MS);
}

export const useLogsStore = create<LogsStore>((set, get) => ({
  buffers: new Map(),
  paused: false,
  clearedAt: 0,

  addLog: (entry) => {
    if (get().paused) return;
    if (entry.ts < get().clearedAt) return;
    const seqEntry = assignSeqId(entry);
    lastSeen.set(seqEntry.processId, Date.now());
    getBuf(pending, seqEntry.processId).push(seqEntry);
    pendingCount++;
    if (pendingCount >= BATCH_LIMIT) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      flushToStore(set);
    } else {
      scheduleFlush(set);
    }
  },

  clearLogs: (processId) => {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    pending.clear();
    pendingCount = 0;
    const now = Date.now();
    if (processId !== undefined) {
      working.delete(processId);
      set((state) => {
        const next = new Map(state.buffers);
        next.delete(processId);
        return { buffers: next, clearedAt: now };
      });
    } else {
      working.clear();
      set({ buffers: new Map(), clearedAt: now });
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

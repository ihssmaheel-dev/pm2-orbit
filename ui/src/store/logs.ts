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
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getBuf(map: Map<number, LogEntry[]>, pid: number): LogEntry[] {
  let buf = map.get(pid);
  if (!buf) {
    buf = [];
    map.set(pid, buf);
  }
  return buf;
}

function scheduleFlush(set: (partial: Partial<LogsStore>) => void) {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
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

    set({ buffers: new Map(working) });
  }, FLUSH_MS);
}

export const useLogsStore = create<LogsStore>((set, get) => ({
  buffers: new Map(),
  maxSize: DEFAULT_MAX_SIZE,
  paused: false,

  addLog: (entry) => {
    if (get().paused) return;
    getBuf(pending, entry.processId).push(entry);
    if (pending.size >= BATCH_LIMIT) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
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
      set({ buffers: new Map(working) });
    } else {
      scheduleFlush(set);
    }
  },

  clearLogs: (processId) => {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    pending.clear();
    if (processId !== undefined) {
      const buf = working.get(processId);
      if (buf) buf.length = 0;
      working.delete(processId);
    } else {
      working.clear();
    }
    set({ buffers: new Map(working) });
  },

  setPaused: (paused) => {
    if (!paused) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      const snap = new Map(pending);
      pending.clear();
      if (snap.size > 0) {
        for (const [pid, entries] of snap) {
          const buf = getBuf(working, pid);
          for (const e of entries) {
            buf.push(e);
            if (buf.length > DEFAULT_MAX_SIZE) {
              buf.shift();
            }
          }
        }
        set({ buffers: new Map(working), paused });
        return;
      }
    }
    set({ paused });
  },

  getLogs: (processId) => get().buffers.get(processId) || [],
}));

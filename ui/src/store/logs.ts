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

const DEFAULT_MAX_SIZE = 2000;

export const useLogsStore = create<LogsStore>((set, get) => ({
  buffers: new Map(),
  maxSize: DEFAULT_MAX_SIZE,
  paused: false,

  addLog: (entry) => {
    set((state) => {
      if (state.paused) return state;
      const next = new Map(state.buffers);
      const existing = next.get(entry.processId) || [];
      const updated = [...existing, entry];
      if (updated.length > state.maxSize) {
        updated.splice(0, updated.length - state.maxSize);
      }
      next.set(entry.processId, updated);
      return { buffers: next };
    });
  },

  clearLogs: (processId) => {
    set((state) => {
      if (processId !== undefined) {
        const next = new Map(state.buffers);
        next.delete(processId);
        return { buffers: next };
      }
      return { buffers: new Map() };
    });
  },

  setPaused: (paused) => set({ paused }),

  getLogs: (processId) => get().buffers.get(processId) || [],
}));

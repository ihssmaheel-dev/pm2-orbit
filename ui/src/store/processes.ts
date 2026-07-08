import { create } from 'zustand';
import type { ProcessSnapshot, ProcessEvent } from '@/types/pm2';

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  for (const key in a) {
    if (a[key] !== b[key]) return false;
  }
  return Object.keys(a).length === Object.keys(b).length;
}

function mergeSnapshot(existing: ProcessSnapshot, incoming: ProcessSnapshot): ProcessSnapshot {
  if (shallowEqual(existing as unknown as Record<string, unknown>, incoming as unknown as Record<string, unknown>)) {
    return existing;
  }
  return { ...existing, ...incoming };
}

interface ProcessStore {
  processes: Map<number, ProcessSnapshot>;
  selectedId: number | null;
  applyDelta: (events: ProcessEvent[]) => void;
  setAll: (snapshots: ProcessSnapshot[]) => void;
  updateProcessTags: (processName: string, tags: ProcessSnapshot['tags']) => void;
  removeTagFromAll: (tagId: string) => void;
  updateProcessNote: (pid: number, note: string | undefined) => void;
  select: (id: number | null) => void;
  getProcess: (id: number) => ProcessSnapshot | undefined;
}

export const useProcessStore = create<ProcessStore>((set, get) => ({
  processes: new Map(),
  selectedId: null,

  updateProcessTags: (processName, tags) => {
    set((state) => {
      const next = new Map(state.processes);
      let changed = false;
      for (const [id, proc] of next) {
        if (proc.name === processName) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updated: any = { ...proc };
          if (tags && tags.length > 0) {
            updated.tags = tags;
          } else {
            delete updated.tags;
          }
          next.set(id, updated);
          changed = true;
        }
      }
      return changed ? { processes: next } : {};
    });
  },

  removeTagFromAll: (tagId) => {
    set((state) => {
      const next = new Map(state.processes);
      let changed = false;
      for (const [id, proc] of next) {
        if (proc.tags && proc.tags.some((t) => t.id === tagId)) {
          const remaining = proc.tags.filter((t) => t.id !== tagId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updated: any = { ...proc };
          if (remaining.length > 0) {
            updated.tags = remaining;
          } else {
            delete updated.tags;
          }
          next.set(id, updated);
          changed = true;
        }
      }
      return changed ? { processes: next } : {};
    });
  },

  updateProcessNote: (pid, note) => {
    set((state) => {
      const proc = state.processes.get(pid);
      if (!proc) return {};
      const next = new Map(state.processes);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updated: any = { ...proc };
      if (note) {
        updated.note = note;
      } else {
        delete updated.note;
      }
      next.set(pid, updated);
      return { processes: next };
    });
  },

  applyDelta: (events) => {
    set((state) => {
      let changed = false;
      const next = new Map(state.processes);
      for (const event of events) {
        if (event.type === 'remove') {
          if (next.has(event.process.id)) {
            next.delete(event.process.id);
            changed = true;
          }
        } else {
          const existing = next.get(event.process.id);
          if (existing) {
            const merged = mergeSnapshot(existing, event.process);
            if (merged !== existing) {
              next.set(event.process.id, merged);
              changed = true;
            }
          } else {
            next.set(event.process.id, { ...event.process });
            changed = true;
          }
        }
      }
      return changed ? { processes: next } : {};
    });
  },

  setAll: (snapshots) => {
    set((state) => {
      let changed = false;
      const next = new Map(state.processes);
      for (const snap of snapshots) {
        const existing = next.get(snap.id);
        if (existing) {
          const merged = mergeSnapshot(existing, snap);
          if (merged !== existing) {
            next.set(snap.id, merged);
            changed = true;
          }
        } else {
          next.set(snap.id, { ...snap });
          changed = true;
        }
      }
      const incomingIds = new Set(snapshots.map((s) => s.id));
      for (const id of next.keys()) {
        if (!incomingIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? { processes: next } : {};
    });
  },

  select: (id) => set({ selectedId: id }),

  getProcess: (id) => get().processes.get(id),
}));

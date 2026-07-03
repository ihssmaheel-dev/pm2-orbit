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
  select: (id: number | null) => void;
  getProcess: (id: number) => ProcessSnapshot | undefined;
}

export const useProcessStore = create<ProcessStore>((set, get) => ({
  processes: new Map(),
  selectedId: null,

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

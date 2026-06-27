import { create } from 'zustand';
import type { ProcessSnapshot, ProcessEvent } from '@/types/pm2';

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
      const next = new Map(state.processes);
      for (const event of events) {
        if (event.type === 'remove') {
          next.delete(event.process.id);
        } else {
          const existing = next.get(event.process.id);
          if (existing) {
            Object.assign(existing, event.process);
          } else {
            next.set(event.process.id, { ...event.process });
          }
        }
      }
      return { processes: next };
    });
  },

  setAll: (snapshots) => {
    set((state) => {
      const next = new Map(state.processes);
      for (const snap of snapshots) {
        const existing = next.get(snap.id);
        if (existing) {
          Object.assign(existing, snap);
        } else {
          next.set(snap.id, { ...snap });
        }
      }
      const incomingIds = new Set(snapshots.map((s) => s.id));
      for (const id of next.keys()) {
        if (!incomingIds.has(id)) next.delete(id);
      }
      return { processes: next };
    });
  },

  select: (id) => set({ selectedId: id }),

  getProcess: (id) => get().processes.get(id),
}));

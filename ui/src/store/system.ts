import { create } from 'zustand';
import type { SystemSnapshot } from '@/types/system';

const defaultSystem: SystemSnapshot = {
  cpu: 0,
  memory: { used: 0, total: 0 },
  loadAvg: [0, 0, 0],
  disk: { read: 0, write: 0 },
  network: { rx: 0, tx: 0 },
};

interface SystemStore {
  system: SystemSnapshot;
  update: (snapshot: SystemSnapshot) => void;
}

export const useSystemStore = create<SystemStore>((set) => ({
  system: defaultSystem,

  update: (snapshot) => set({ system: snapshot }),
}));

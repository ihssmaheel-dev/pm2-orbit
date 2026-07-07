import { create } from 'zustand';

type WSStatus = 'connecting' | 'connected' | 'disconnected';

interface UIStore {
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tagFilter: string[];
  setTagFilter: (filter: string[]) => void;
  toggleTagFilter: (tagId: string) => void;
  wsStatus: WSStatus;
  setWsStatus: (status: WSStatus) => void;
}

const getStoredSearch = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pm2-orbit-search') || '';
};

export const useUIStore = create<UIStore>((set) => ({
  detailOpen: false,
  setDetailOpen: (open) => set({ detailOpen: open }),
  searchQuery: getStoredSearch(),
  setSearchQuery: (query) => {
    localStorage.setItem('pm2-orbit-search', query);
    set({ searchQuery: query });
  },
  tagFilter: [],
  setTagFilter: (filter) => set({ tagFilter: filter }),
  toggleTagFilter: (tagId) => set((s) => ({
    tagFilter: s.tagFilter.includes(tagId)
      ? s.tagFilter.filter((id) => id !== tagId)
      : [...s.tagFilter, tagId],
  })),
  wsStatus: 'connecting',
  setWsStatus: (status) => set({ wsStatus: status }),
}));

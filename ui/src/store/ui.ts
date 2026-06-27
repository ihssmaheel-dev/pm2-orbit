import { create } from 'zustand';

type Tab = 'processes' | 'logs' | 'alerts' | 'history' | 'settings';

interface UIStore {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string | null;
  setStatusFilter: (filter: string | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeTab: 'processes',
  setActiveTab: (tab) => set({ activeTab: tab }),
  detailOpen: false,
  setDetailOpen: (open) => set({ detailOpen: open }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  statusFilter: null,
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));

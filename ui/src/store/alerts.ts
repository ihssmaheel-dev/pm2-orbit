import { create } from 'zustand';
import type { AlertRule, AlertEvent } from '@/types/alerts';

interface AlertsStore {
  rules: AlertRule[];
  history: AlertEvent[];
  addRule: (rule: AlertRule) => void;
  removeRule: (id: string) => void;
  updateRule: (id: string, updates: Partial<AlertRule>) => void;
  addEvent: (event: AlertEvent) => void;
  clearHistory: () => void;
}

export const useAlertsStore = create<AlertsStore>((set) => ({
  rules: [],
  history: [],

  addRule: (rule) =>
    set((state) => ({ rules: [...state.rules, rule] })),

  removeRule: (id) =>
    set((state) => ({ rules: state.rules.filter((r) => r.id !== id) })),

  updateRule: (id, updates) =>
    set((state) => ({
      rules: state.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  addEvent: (event) =>
    set((state) => ({
      history: [event, ...state.history].slice(0, 50),
    })),

  clearHistory: () => set({ history: [] }),
}));

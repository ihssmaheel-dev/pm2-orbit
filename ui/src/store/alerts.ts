import { create } from 'zustand';
import { api } from '@/lib/api';
import type { AlertRule, AlertEvent } from '@/types/alerts';

interface AlertsStore {
  rules: AlertRule[];
  history: AlertEvent[];
  loading: boolean;
  fetchRules: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  addRule: (rule: AlertRule) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  updateRule: (id: string, updates: Partial<AlertRule>) => void;
  addEvent: (event: AlertEvent) => void;
  clearHistory: () => void;
}

export const useAlertsStore = create<AlertsStore>((set) => ({
  rules: [],
  history: [],
  loading: false,

  fetchRules: async () => {
    set({ loading: true });
    try {
      const res = await api('/api/alerts', { label: 'Alerts' });
      if (res.ok) {
        const rules = await res.json();
        set({ rules, loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  fetchHistory: async () => {
    try {
      const res = await api('/api/alerts/history', { silent: true });
      if (res.ok) {
        const history = await res.json();
        set({ history });
      }
    } catch {
      // ignore
    }
  },

  addRule: async (rule) => {
    set((state) => ({ rules: [...state.rules, rule] }));
    try {
      const res = await api('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
        label: 'Add rule',
      });
      if (!res.ok) {
        set((state) => ({ rules: state.rules.filter((r) => r.id !== rule.id) }));
      }
    } catch {
      set((state) => ({ rules: state.rules.filter((r) => r.id !== rule.id) }));
    }
  },

  removeRule: async (id) => {
    set((state) => ({ rules: state.rules.filter((r) => r.id !== id) }));
    try {
      await api(`/api/alerts/${id}`, {
        method: 'DELETE',
        label: 'Remove rule',
      });
    } catch {
      // Server failed, rule already removed locally
    }
  },

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

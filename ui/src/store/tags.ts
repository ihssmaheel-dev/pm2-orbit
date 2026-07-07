import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Tag } from '@/types/pm2';

interface TagsStore {
  tags: Tag[];
  loading: boolean;
  fetchTags: () => Promise<void>;
  createTag: (name: string, color: string) => Promise<Tag | null>;
  updateTag: (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  assignTags: (processName: string, tagIds: string[]) => Promise<void>;
}

export const useTagsStore = create<TagsStore>((set) => ({
  tags: [],
  loading: false,

  fetchTags: async () => {
    set({ loading: true });
    try {
      const res = await api('/api/tags', { silent: true });
      if (res.ok) {
        const tags = await res.json();
        set({ tags });
      }
    } catch { /* */ }
    set({ loading: false });
  },

  createTag: async (name, color) => {
    try {
      const res = await api('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
        silent: true,
      });
      if (res.ok) {
        const tag = await res.json();
        set((s) => ({ tags: [...s.tags, tag] }));
        return tag;
      }
    } catch { /* */ }
    return null;
  },

  updateTag: async (id, updates) => {
    try {
      await api(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        silent: true,
      });
      set((s) => ({
        tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
    } catch { /* */ }
  },

  deleteTag: async (id) => {
    try {
      await api(`/api/tags/${id}`, { method: 'DELETE', silent: true });
      set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
    } catch { /* */ }
  },

  assignTags: async (processName, tagIds) => {
    try {
      await api('/api/tags/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processName, tagIds }),
        silent: true,
      });
    } catch { /* */ }
  },
}));

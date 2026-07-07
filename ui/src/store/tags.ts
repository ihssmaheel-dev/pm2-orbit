import { create } from 'zustand';
import { api } from '@/lib/api';
import { useProcessStore } from './processes';
import type { Tag } from '@/types/pm2';

interface TagsStore {
  tags: Tag[];
  assignments: Record<string, string[]>;
  loading: boolean;
  fetchTags: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  fetchAll: () => Promise<void>;
  applyAssignmentsToProcesses: () => void;
  createTag: (name: string, color: string) => Promise<Tag | null>;
  updateTag: (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  assignTags: (processName: string, tagIds: string[]) => Promise<void>;
}

function resolveTags(tagIds: string[], allTags: Tag[]): Tag[] {
  return tagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean) as Tag[];
}

export const useTagsStore = create<TagsStore>((set, get) => ({
  tags: [],
  assignments: {},
  loading: false,

  fetchTags: async () => {
    try {
      const res = await api('/api/tags', { silent: true });
      if (res.ok) {
        const tags = await res.json();
        set({ tags });
      }
    } catch { /* */ }
  },

  fetchAssignments: async () => {
    try {
      const res = await api('/api/tags/assignments', { silent: true });
      if (res.ok) {
        const assignments = await res.json();
        set({ assignments });
        // Merge tags into process snapshots client-side
        const allTags = get().tags;
        const processes = useProcessStore.getState().processes;
        for (const [, proc] of processes) {
          const tagIds = assignments[proc.name];
          if (tagIds && tagIds.length > 0) {
            const resolved = resolveTags(tagIds, allTags);
            useProcessStore.getState().updateProcessTags(proc.name, resolved);
          } else {
            useProcessStore.getState().updateProcessTags(proc.name, undefined);
          }
        }
      }
    } catch { /* */ }
  },

  fetchAll: async () => {
    await get().fetchTags();
    await get().fetchAssignments();
    get().applyAssignmentsToProcesses();
  },

  applyAssignmentsToProcesses: () => {
    const { tags: allTags, assignments } = get();
    const processes = useProcessStore.getState().processes;
    for (const [, proc] of processes) {
      const tagIds = assignments[proc.name];
      if (tagIds && tagIds.length > 0) {
        const resolved = resolveTags(tagIds, allTags);
        useProcessStore.getState().updateProcessTags(proc.name, resolved);
      } else {
        useProcessStore.getState().updateProcessTags(proc.name, undefined);
      }
    }
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
      set((s) => ({ tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)) }));
    } catch { /* */ }
  },

  deleteTag: async (id) => {
    try {
      await api(`/api/tags/${id}`, { method: 'DELETE', silent: true });
      useProcessStore.getState().removeTagFromAll(id);
      set((s) => ({ tags: s.tags.filter((t) => t.id !== id) }));
    } catch { /* */ }
  },

  assignTags: async (processName, tagIds) => {
    const allTags = get().tags;
    const resolved = resolveTags(tagIds, allTags);
    // Update local state immediately
    useProcessStore.getState().updateProcessTags(processName, resolved.length > 0 ? resolved : undefined);
    // Update assignments map
    set((s) => {
      const next = { ...s.assignments };
      if (tagIds.length > 0) {
        next[processName] = tagIds;
      } else {
        delete next[processName];
      }
      return { assignments: next };
    });
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

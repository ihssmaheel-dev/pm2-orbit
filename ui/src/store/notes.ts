import { create } from 'zustand';
import { api } from '@/lib/api';
import { useProcessStore } from './processes';

interface NotesStore {
  notes: Record<string, string>;
  fetchNotes: () => Promise<void>;
  updateNote: (processName: string, note: string) => Promise<void>;
  deleteNote: (processName: string) => Promise<void>;
  applyNotesToProcesses: () => void;
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: {},

  fetchNotes: async () => {
    try {
      const res = await api('/api/notes', { silent: true });
      if (res.ok) {
        const notes = await res.json();
        set({ notes });
      }
    } catch { /* */ }
  },

  updateNote: async (processName, note) => {
    // Optimistic update
    set((s) => ({ notes: { ...s.notes, [processName]: note } }));
    // Update process store immediately
    const processes = useProcessStore.getState().processes;
    for (const [id, proc] of processes) {
      if (proc.name === processName) {
        useProcessStore.getState().updateProcessNote(id, note);
      }
    }
    try {
      await api(`/api/notes/${encodeURIComponent(processName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
        silent: true,
      });
    } catch { /* */ }
  },

  deleteNote: async (processName) => {
    set((s) => {
      const next = { ...s.notes };
      delete next[processName];
      return { notes: next };
    });
    // Update process store immediately
    const processes = useProcessStore.getState().processes;
    for (const [id, proc] of processes) {
      if (proc.name === processName) {
        useProcessStore.getState().updateProcessNote(id, undefined);
      }
    }
    try {
      await api(`/api/notes/${encodeURIComponent(processName)}`, {
        method: 'DELETE',
        silent: true,
      });
    } catch { /* */ }
  },

  applyNotesToProcesses: () => {
    const { notes } = get();
    const processes = useProcessStore.getState().processes;
    for (const [, proc] of processes) {
      const note = notes[proc.name];
      useProcessStore.getState().updateProcessNote(proc.id, note);
    }
  },
}));

import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useProcessStore } from '@/store/processes';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/hooks/useTheme';

export function useKeyboardShortcuts() {
  const selectedId = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'r':
        case 'R':
          if (selectedId !== null) {
            api(`/api/processes/${selectedId}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'restart' }),
              silent: true,
            });
          }
          break;
        case 's':
        case 'S':
          if (selectedId !== null) {
            api(`/api/processes/${selectedId}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'stop' }),
              silent: true,
            });
          }
          break;
        case 'l':
        case 'L':
          setActiveTab('logs');
          break;
        case '1':
          setActiveTab('processes');
          break;
        case '2':
          setActiveTab('logs');
          break;
        case '3':
          setActiveTab('alerts');
          break;
        case '4':
          setActiveTab('history');
          break;
        case '5':
          setActiveTab('settings');
          break;
        case 't':
        case 'T':
          setTheme(theme === 'dark' ? 'light' : 'dark');
          break;
        case 'Escape':
          select(null);
          break;
        case '?':
          setActiveTab('settings');
          break;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedId, select, setActiveTab, theme, setTheme]);
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useProcessStore } from '@/store/processes';
import { useTheme } from '@/hooks/useTheme';

export function useKeyboardShortcuts() {
  const selectedId = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

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
        case '1':
          navigate('/processes');
          break;
        case '2':
        case 'l':
        case 'L':
          navigate('/logs');
          break;
        case '3':
          navigate('/alerts');
          break;
        case '4':
          navigate('/history');
          break;
        case '5':
        case '?':
          navigate('/settings');
          break;
        case 't':
        case 'T':
          setTheme(theme === 'dark' ? 'light' : 'dark');
          break;
        case 'Escape':
          select(null);
          break;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedId, select, navigate, theme, setTheme]);
}

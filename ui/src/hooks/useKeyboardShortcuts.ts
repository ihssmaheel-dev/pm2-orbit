import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProcessStore } from '@/store/processes';
import { useTheme } from '@/hooks/useTheme';

export function useKeyboardShortcuts() {
  const select = useProcessStore((s) => s.select);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Skip shortcuts when a modal/dialog is open
      if (document.querySelector('[role="dialog"]') || document.querySelector('dialog[open]')) return;

      switch (e.key) {
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
  }, [select, navigate, theme, setTheme]);
}

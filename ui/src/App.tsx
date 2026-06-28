import { AppShell } from './components/layout/AppShell';
import { Toaster } from 'sonner';
import { ThemeProvider } from './hooks/useTheme';
import { useAlertNotifications } from './hooks/useAlertNotifications';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CommandPalette } from './components/command/CommandPalette';

function AppInner() {
  const { status } = useWebSocket();
  useKeyboardShortcuts();
  useAlertNotifications();
  return (
    <>
      <AppShell wsStatus={status} />
      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: '!bg-card !border !border-border/70 !text-foreground !shadow-lg !shadow-black/30 !rounded-none !font-sans',
          style: { fontFamily: 'Exo, sans-serif' },
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

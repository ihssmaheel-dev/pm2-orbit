import { AppShell } from './components/layout/AppShell';
import { Toaster } from 'sonner';
import { ThemeProvider } from './hooks/useTheme';
import { useAlertNotifications } from './hooks/useAlertNotifications';
import { useWebSocket } from './hooks/useWebSocket';

function AppInner() {
  const { status } = useWebSocket();
  useAlertNotifications();
  return (
    <>
      <AppShell wsStatus={status} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0px',
            fontFamily: 'Exo, sans-serif',
            color: 'hsl(var(--foreground))',
          },
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

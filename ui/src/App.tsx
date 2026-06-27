import { AppShell } from './components/layout/AppShell';
import { Toaster } from 'sonner';
import { useTheme } from './hooks/useTheme';

export default function App() {
  useTheme();

  return (
    <>
      <AppShell />
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

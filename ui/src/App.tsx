import { AppShell } from './components/layout/AppShell';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <>
      <AppShell />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0px',
            fontFamily: 'Exo, sans-serif',
          },
        }}
      />
    </>
  );
}

import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Dashboard } from '@/pages/Dashboard';

export function AppShell() {
  const { status } = useWebSocket();

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        <Dashboard />
      </main>
      <StatusBar wsStatus={status} />
    </div>
  );
}

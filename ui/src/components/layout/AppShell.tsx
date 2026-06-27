import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { useUIStore } from '@/store/ui';
import { Dashboard } from '@/pages/Dashboard';
import { Logs } from '@/pages/Logs';
import { Alerts } from '@/pages/Alerts';
import { History } from '@/pages/History';
import { Settings } from '@/pages/Settings';

interface AppShellProps {
  wsStatus: 'connecting' | 'connected' | 'disconnected';
}

export function AppShell({ wsStatus }: AppShellProps) {
  const activeTab = useUIStore((s) => s.activeTab);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        {activeTab === 'processes' && <Dashboard />}
        {activeTab === 'logs' && <Logs />}
        {activeTab === 'alerts' && <Alerts />}
        {activeTab === 'history' && <History />}
        {activeTab === 'settings' && <Settings />}
      </main>
      <StatusBar wsStatus={wsStatus} />
    </div>
  );
}

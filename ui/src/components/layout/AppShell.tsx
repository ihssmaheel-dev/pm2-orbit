import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { Dashboard } from '@/pages/Dashboard';
import { Logs } from '@/pages/Logs';
import { Alerts } from '@/pages/Alerts';
import { History } from '@/pages/History';
import { Settings } from '@/pages/Settings';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useLocation } from 'react-router-dom';

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/processes" replace />} />
            <Route path="/processes" element={<Dashboard />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/logs/:processName" element={<Logs />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/alerts/rules" element={<Alerts />} />
            <Route path="/alerts/history" element={<Alerts />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/processes" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <StatusBar />
    </div>
  );
}

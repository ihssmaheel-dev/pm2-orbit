import { Header } from './Header';
import { StatusBar } from './StatusBar';

interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-auto">
        {children || (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl font-light tracking-widest text-primary mb-2">PM2 ORBIT</div>
              <div className="text-sm uppercase tracking-wider">Monitoring Dashboard</div>
            </div>
          </div>
        )}
      </main>
      <StatusBar />
    </div>
  );
}

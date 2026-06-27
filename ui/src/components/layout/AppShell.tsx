import { Header } from './Header';
import { StatusBar } from './StatusBar';

export function AppShell() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <main className="flex-1 overflow-auto p-4">
        <div className="text-muted-foreground">PM2 Orbit — Loading...</div>
      </main>
      <StatusBar />
    </div>
  );
}

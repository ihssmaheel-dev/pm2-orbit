import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useUIStore } from '@/store/ui';

interface HealthData {
  version?: string;
  nodeVersion?: string;
  pm2Version?: string;
}

export function StatusBar() {
  const wsStatus = useUIStore((s) => s.wsStatus);
  const connected = wsStatus === 'connected';
  const [health, setHealth] = useState<HealthData>({});

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => {});
  }, []);

  return (
    <footer className="h-8 border-t border-border flex items-center px-4 text-xs text-muted-foreground gap-3 shrink-0 bg-background select-none">
      {connected ? (
        <Wifi size={12} className="text-success" />
      ) : (
        <WifiOff size={12} className="text-destructive" />
      )}
      <span>
        {connected ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
      </span>
      {health.pm2Version && health.pm2Version !== 'unknown' && (
        <>
          <span className="text-border">·</span>
          <span>pm2 v{health.pm2Version}</span>
        </>
      )}
      {health.nodeVersion && (
        <>
          <span className="text-border">·</span>
          <span>Node {health.nodeVersion}</span>
        </>
      )}
      {health.version && (
        <>
          <span className="text-border">·</span>
          <span className="font-mono">v{health.version}</span>
        </>
      )}
    </footer>
  );
}

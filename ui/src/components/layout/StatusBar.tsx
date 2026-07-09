import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cpu, MemoryStick } from 'lucide-react';
import { ConnectionDot } from '@/components/shared/ConnectionDot';
import { useUIStore } from '@/store/ui';
import { useSystemStore } from '@/store/system';
import { formatBytes } from '@/lib/format';

interface HealthData {
  version?: string;
  nodeVersion?: string;
  pm2Version?: string;
  self?: { cpu: number; memory: number };
}

export function StatusBar() {
  const wsStatus = useUIStore((s) => s.wsStatus);
  const connected = wsStatus === 'connected';
  const self = useSystemStore((s) => s.system.self);
  const [health, setHealth] = useState<HealthData>({});

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => {});
  }, []);

  // Use live self metrics from WS, fallback to health endpoint
  const selfMetrics = self?.cpu !== undefined ? self : health.self;

  return (
    <footer
      role="status"
      aria-live="polite"
      aria-label="Connection status"
      className="h-7 border-t border-border flex items-center px-4 text-xs text-muted-foreground gap-3 shrink-0 select-none"
    >
      <ConnectionDot connected={connected} />
      {connected ? (
        <Wifi size={12} className="text-success" />
      ) : (
        <WifiOff size={12} className="text-destructive" />
      )}
      <span className="uppercase tracking-wider">
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
      {selfMetrics && (
        <div className="ml-auto flex items-center gap-3" aria-hidden="true">
          <span className="text-border">·</span>
          <span className="flex items-center gap-1">
            <Cpu
              size={12}
              className={selfMetrics.cpu > 90 ? 'text-destructive' : selfMetrics.cpu > 70 ? 'text-yellow-500' : 'text-muted-foreground'}
            />
            <span className="font-mono">{selfMetrics.cpu.toFixed(1)}%</span>
          </span>
          <span className="flex items-center gap-1">
            <MemoryStick size={12} className="text-muted-foreground" />
            <span className="font-mono">{formatBytes(selfMetrics.memory)}</span>
          </span>
        </div>
      )}
    </footer>
  );
}

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cpu, MemoryStick, Box } from 'lucide-react';
import { ConnectionDot } from '@/components/shared/ConnectionDot';
import { useUIStore } from '@/store/ui';
import { useSystemStore } from '@/store/system';
import { useProcessStore } from '@/store/processes';
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
  const processCount = useProcessStore((s) => s.processes.size);
  const [health, setHealth] = useState<HealthData>({});

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => {});
  }, []);

  const selfMetrics = self?.cpu !== undefined ? self : health.self;

  return (
    <footer
      role="status"
      aria-live="polite"
      aria-label="Connection status"
      className="h-7 border-t border-border/60 flex items-center px-4 text-[11px] text-muted-foreground/60 gap-3 shrink-0 select-none"
    >
      {/* Left: connection */}
      <div className="flex items-center gap-1.5">
        <ConnectionDot connected={connected} />
        {connected ? (
          <Wifi size={11} className="text-success" />
        ) : (
          <WifiOff size={11} className="text-destructive" />
        )}
        <span className="uppercase tracking-wider font-medium">
          {connected ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </span>
      </div>

      {/* Center: versions */}
      <div className="flex items-center gap-2">
        {health.pm2Version && health.pm2Version !== 'unknown' && (
          <span className="flex items-center gap-1">
            <span className="text-border">·</span>
            <span>pm2 v{health.pm2Version}</span>
          </span>
        )}
        {health.nodeVersion && (
          <span className="flex items-center gap-1">
            <span className="text-border">·</span>
            <span>Node {health.nodeVersion}</span>
          </span>
        )}
        {health.version && (
          <span className="flex items-center gap-1">
            <span className="text-border">·</span>
            <span className="font-mono">v{health.version}</span>
          </span>
        )}
      </div>

      {/* Right: process count + self metrics */}
      <div className="ml-auto flex items-center gap-3">
        {processCount > 0 && (
          <span className="flex items-center gap-1">
            <Box size={10} className="text-muted-foreground/40" />
            <span className="font-mono">{processCount}</span>
          </span>
        )}
        {selfMetrics && (
          <>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <Cpu
                size={11}
                className={selfMetrics.cpu > 90 ? 'text-destructive' : selfMetrics.cpu > 70 ? 'text-warning' : 'text-muted-foreground/50'}
              />
              <span className="font-mono">{selfMetrics.cpu.toFixed(1)}%</span>
            </span>
            <span className="flex items-center gap-1">
              <MemoryStick size={11} className="text-muted-foreground/50" />
              <span className="font-mono">{formatBytes(selfMetrics.memory)}</span>
            </span>
          </>
        )}
      </div>
    </footer>
  );
}

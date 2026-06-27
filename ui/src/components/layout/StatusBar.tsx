import { Wifi, WifiOff } from 'lucide-react';
import { ConnectionDot } from '@/components/shared/ConnectionDot';

interface StatusBarProps {
  wsStatus?: 'connecting' | 'connected' | 'disconnected';
}

export function StatusBar({ wsStatus = 'disconnected' }: StatusBarProps) {
  const connected = wsStatus === 'connected';

  return (
    <footer className="h-7 border-t border-border flex items-center px-4 text-xs text-muted-foreground gap-3 shrink-0 select-none">
      <ConnectionDot connected={connected} />
      {connected ? (
        <Wifi size={12} className="text-success" />
      ) : (
        <WifiOff size={12} className="text-destructive" />
      )}
      <span className="uppercase tracking-wider">
        {connected ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
      </span>
      <span className="text-border">·</span>
      <span>pm2 v5.3.0</span>
      <span className="text-border">·</span>
      <span>Node v22</span>
      <span className="text-border">·</span>
      <span className="font-mono">v0.1.0</span>
    </footer>
  );
}

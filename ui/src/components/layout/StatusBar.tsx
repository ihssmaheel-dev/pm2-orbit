import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Shield, Copy, Check } from 'lucide-react';
import { ConnectionDot } from '@/components/shared/ConnectionDot';
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
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => {});
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => { if (data.authToken) setToken(data.authToken); })
      .catch(() => {});
  }, []);

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedToken = token ? `${token.slice(0, 4)}••••${token.slice(-4)}` : '';

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
      {token && (
        <>
          <span className="text-border">·</span>
          <button
            onClick={copyToken}
            className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
            title="Click to copy token"
          >
            <Shield size={10} className="text-success" />
            <span className="font-mono text-muted-foreground/60">{maskedToken}</span>
            {copied ? <Check size={10} className="text-success" /> : <Copy size={10} className="text-muted-foreground/40" />}
          </button>
        </>
      )}
    </footer>
  );
}

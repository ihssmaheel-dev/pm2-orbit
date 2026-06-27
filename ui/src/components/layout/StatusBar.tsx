import { Wifi } from 'lucide-react';
import { ConnectionDot } from '@/components/shared/ConnectionDot';

export function StatusBar() {
  return (
    <footer className="h-7 border-t border-border flex items-center px-4 text-xs text-muted-foreground gap-3 shrink-0 select-none">
      <ConnectionDot connected={true} />
      <Wifi size={12} className="text-success" />
      <span className="uppercase tracking-wider">Connected</span>
      <span className="text-border">·</span>
      <span>pm2 v5.3.0</span>
      <span className="text-border">·</span>
      <span>Node v22</span>
      <span className="text-border">·</span>
      <span className="font-mono">v0.1.0</span>
      <span className="ml-auto text-border">Last event 0.1s ago</span>
    </footer>
  );
}

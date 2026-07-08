import { useAlertsStore } from '@/store/alerts';
import { AlertTriangle } from 'lucide-react';

export function AlertHistory() {
  const history = useAlertsStore((s) => s.history);

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No alerts triggered yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {history.map((event, i) => (
        <div
          key={`${event.ts}-${i}`}
          className="flex items-start gap-3 px-3 py-2 bg-subtle/30 border border-border text-sm"
        >
          <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-foreground">{event.message}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {new Date(event.ts).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

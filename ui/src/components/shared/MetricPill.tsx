import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MetricPillProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function MetricPill({ label, value, icon, className }: MetricPillProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 bg-card border border-border',
        'text-sm',
        className,
      )}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground uppercase tracking-wider text-xs">{label}</span>
      <span className="text-foreground font-mono">{value}</span>
    </div>
  );
}

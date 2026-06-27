import { memo } from 'react';
import type { ProcessSnapshot } from '@/types/pm2';
import { StatusDot } from '@/components/shared/StatusDot';
import { Sparkline } from './Sparkline';
import { formatBytes, formatDuration, formatPercent } from '@/lib/format';
import { useProcessStore } from '@/store/processes';

interface ProcessRowProps {
  process: ProcessSnapshot;
  style?: React.CSSProperties;
}

export const ProcessRow = memo(function ProcessRow({ process, style }: ProcessRowProps) {
  const selectedId = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const isSelected = selectedId === process.id;

  return (
    <div
      style={style}
      onClick={() => select(isSelected ? null : process.id)}
      className={`flex items-center gap-0 px-0 h-11 cursor-pointer transition-all duration-150 group border-l-2
        ${isSelected
          ? 'bg-primary/[0.08] border-l-primary'
          : 'border-l-transparent hover:bg-subtle/60'
        }`}
    >
      {/* Status */}
      <div className="w-10 flex items-center justify-center shrink-0">
        <StatusDot status={process.status} />
      </div>

      {/* Name */}
      <div className="w-[160px] shrink-0 px-2">
        <span className="text-sm text-foreground truncate block group-hover:text-primary transition-colors">
          {process.name}
        </span>
      </div>

      {/* Mode */}
      <div className="w-[70px] shrink-0 px-2">
        <span className="text-[11px] font-mono text-muted-foreground uppercase">
          {process.mode}
        </span>
      </div>

      {/* PID */}
      <div className="w-[60px] shrink-0 px-2">
        <span className="text-[11px] font-mono text-muted-foreground">
          {process.pid}
        </span>
      </div>

      {/* Sparkline */}
      <div className="w-[90px] shrink-0 px-2">
        <Sparkline data={process.history.cpu} color="var(--chart-cpu)" />
      </div>

      {/* CPU */}
      <div className="w-[80px] shrink-0 px-2 text-right">
        <span className={`text-xs font-mono ${
          process.cpu > 80 ? 'text-destructive' : process.cpu > 50 ? 'text-warning' : 'text-foreground'
        }`}>
          {formatPercent(process.cpu)}
        </span>
      </div>

      {/* Memory */}
      <div className="w-[100px] shrink-0 px-2 text-right">
        <span className="text-xs font-mono text-foreground">
          {formatBytes(process.memory)}
        </span>
      </div>

      {/* Restarts */}
      <div className="w-[80px] shrink-0 px-2 text-right">
        <span className={`text-xs font-mono ${
          process.restarts > 0 ? 'text-warning' : 'text-muted-foreground'
        }`}>
          {process.restarts}
        </span>
      </div>

      {/* Uptime */}
      <div className="flex-1 px-2 text-right">
        <span className="text-[11px] font-mono text-muted-foreground">
          {formatDuration(process.uptime)}
        </span>
      </div>
    </div>
  );
});

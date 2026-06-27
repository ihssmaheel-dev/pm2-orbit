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
      className={`flex items-center gap-4 px-4 h-12 border-b border-border cursor-pointer transition-colors
        ${isSelected ? 'bg-primary-subtle border-l-2 border-l-primary' : 'hover:bg-subtle border-l-2 border-l-transparent'}`}
    >
      <StatusDot status={process.status} />

      <div className="w-[140px] truncate text-sm text-foreground font-normal">
        {process.name}
      </div>

      <div className="w-[60px] text-xs text-muted-foreground uppercase">
        {process.mode}
      </div>

      <div className="w-[60px] text-xs font-mono text-muted-foreground">
        {process.pid}
      </div>

      <div className="w-[80px]">
        <Sparkline data={process.history.cpu} color="var(--chart-cpu)" />
      </div>

      <div className="w-[70px] text-right text-sm font-mono text-foreground">
        {formatPercent(process.cpu)}
      </div>

      <div className="w-[80px] text-right text-sm font-mono text-foreground">
        {formatBytes(process.memory)}
      </div>

      <div className="w-[70px] text-right text-xs text-muted-foreground">
        {process.restarts}
      </div>

      <div className="ml-auto text-xs text-muted-foreground">
        {formatDuration(process.uptime)}
      </div>
    </div>
  );
});

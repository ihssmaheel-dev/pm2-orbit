import { memo } from 'react';
import type { ProcessSnapshot } from '@/types/pm2';
import { StatusDot } from '@/components/shared/StatusDot';
import { Sparkline } from './Sparkline';
import { formatBytes, formatDuration, formatPercent } from '@/lib/format';
import { useProcessStore } from '@/store/processes';

interface ColumnDef {
  accessorKey: string;
  header: string;
  width: string;
  align?: 'left' | 'right';
}

interface ProcessRowProps {
  process: ProcessSnapshot;
  columns: ColumnDef[];
  sparklineWidth: string;
  uptimeWidth: string;
  style?: React.CSSProperties;
}

export const ProcessRow = memo(function ProcessRow({
  process,
  columns,
  sparklineWidth,
  uptimeWidth,
  style,
}: ProcessRowProps) {
  const selectedId = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const isSelected = selectedId === process.id;

  function renderCell(key: string) {
    switch (key) {
      case 'name':
        return (
          <span className="text-sm text-foreground truncate block group-hover:text-primary transition-colors">
            {process.name}
          </span>
        );
      case 'mode':
        return (
          <span className="text-[11px] font-mono text-muted-foreground uppercase">
            {process.mode}
          </span>
        );
      case 'pid':
        return (
          <span className="text-[11px] font-mono text-muted-foreground">
            {process.pid}
          </span>
        );
      case 'cpu':
        return (
          <span className={`text-xs font-mono tabular-nums ${
            process.cpu > 80 ? 'text-destructive' : process.cpu > 50 ? 'text-warning' : 'text-foreground'
          }`}>
            {formatPercent(process.cpu)}
          </span>
        );
      case 'memory':
        return (
          <span className="text-xs font-mono tabular-nums text-foreground">
            {formatBytes(process.memory)}
          </span>
        );
      case 'restarts':
        return (
          <span className={`text-xs font-mono tabular-nums ${
            process.restarts > 0 ? 'text-warning' : 'text-muted-foreground'
          }`}>
            {process.restarts}
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div
      style={style}
      onClick={() => select(isSelected ? null : process.id)}
      className={`flex items-center h-11 px-5 cursor-pointer transition-colors duration-75 group border-l-2 ${
        isSelected
          ? 'bg-primary/[0.06] border-l-primary'
          : 'border-l-transparent hover:bg-subtle/40'
      }`}
    >
      {/* Status dot */}
      <div className="w-5 shrink-0 flex items-center justify-center">
        <StatusDot status={process.status} />
      </div>

      {/* Data cells */}
      {columns.map((col) => (
        <div
          key={col.accessorKey}
          className={`${col.width} shrink-0 px-3 ${col.align === 'right' ? 'text-right' : ''}`}
        >
          {renderCell(col.accessorKey)}
        </div>
      ))}

      {/* Sparkline */}
      <div className={`${sparklineWidth} shrink-0 px-3`}>
        <Sparkline data={process.history.cpu} color="var(--chart-cpu)" />
      </div>

      {/* Uptime */}
      <div className={`${uptimeWidth} shrink-0 px-3 text-right`}>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
          {formatDuration(process.uptime)}
        </span>
      </div>
    </div>
  );
});

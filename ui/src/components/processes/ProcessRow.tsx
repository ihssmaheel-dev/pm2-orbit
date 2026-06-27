import { memo } from 'react';
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
  processId: number;
  columns: ColumnDef[];
  sparklineWidth: string;
  uptimeWidth: string;
  style?: React.CSSProperties;
}

export const ProcessRow = memo(function ProcessRow({
  processId,
  columns,
  sparklineWidth,
  uptimeWidth,
  style,
}: ProcessRowProps) {
  const process = useProcessStore((s) => s.processes.get(processId));
  const selectedId = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const isSelected = selectedId === processId;

  if (!process) return null;

  const p = process;

  function renderCell(key: string) {
    switch (key) {
      case 'name':
        return (
          <span className="text-[13px] text-foreground truncate block group-hover:text-primary transition-colors duration-75">
            {p.name}
          </span>
        );
      case 'mode':
        return (
          <span className="text-[11px] font-mono text-muted-foreground/70 uppercase">
            {p.mode}
          </span>
        );
      case 'pid':
        return (
          <span className="text-[11px] font-mono text-muted-foreground/60 tabular-nums">
            {p.pid}
          </span>
        );
      case 'cpu':
        return (
          <span className={`text-[12px] font-mono tabular-nums ${
            p.cpu > 80 ? 'text-destructive' : p.cpu > 50 ? 'text-warning' : 'text-foreground/90'
          }`}>
            {formatPercent(p.cpu)}
          </span>
        );
      case 'memory':
        return (
          <span className="text-[12px] font-mono tabular-nums text-foreground/90">
            {formatBytes(p.memory)}
          </span>
        );
      case 'restarts':
        return (
          <span className={`text-[12px] font-mono tabular-nums ${
            p.restarts > 0 ? 'text-warning' : 'text-muted-foreground/50'
          }`}>
            {p.restarts}
          </span>
        );
      default:
        return null;
    }
  }

  return (
    <div
      style={style}
      onClick={() => select(isSelected ? null : processId)}
      className={`flex items-center px-6 cursor-pointer transition-colors duration-75 group border-b border-border/30 ${
        isSelected
          ? 'bg-primary/[0.06]'
          : 'hover:bg-subtle/40'
      }`}
    >
      <div className="w-7 shrink-0 flex items-center justify-center">
        <StatusDot status={p.status} />
      </div>

      {columns.map((col) => (
        <div
          key={col.accessorKey}
          className={`${col.width} shrink-0 px-4 ${col.align === 'right' ? 'text-right' : ''}`}
        >
          {renderCell(col.accessorKey)}
        </div>
      ))}

      <div className={`${sparklineWidth} shrink-0 px-4`}>
        <Sparkline data={p.history.cpu} color="var(--chart-cpu)" width={76} height={20} />
      </div>

      <div className={`${uptimeWidth} shrink-0 px-4 text-right`}>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground/60">
          {formatDuration(p.uptime)}
        </span>
      </div>
    </div>
  );
});

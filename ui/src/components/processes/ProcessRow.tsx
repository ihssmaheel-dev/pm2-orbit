import { memo, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { StatusDot } from '@/components/shared/StatusDot';
import { Sparkline } from './Sparkline';
import { formatBytes, formatDuration, formatPercent } from '@/lib/format';
import { useProcessStore } from '@/store/processes';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/shared/Dropdown';

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
  actionWidth: string;
  style?: React.CSSProperties;
}

export const ProcessRow = memo(function ProcessRow({
  processId,
  columns,
  sparklineWidth,
  uptimeWidth,
  actionWidth,
  style,
}: ProcessRowProps) {
  const process = useProcessStore((s) => s.processes.get(processId));
  const selectedId = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const isSelected = selectedId === processId;
  const [menuOpen, setMenuOpen] = useState(false);

  if (!process) return null;

  const p = process;

  const handleAction = async (action: string) => {
    try {
      await fetch(`/api/processes/${p.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch {
      // ignore
    }
    setMenuOpen(false);
  };

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
          <span className="text-[11px] font-mono text-muted-foreground/60 uppercase">
            {p.mode}
          </span>
        );
      case 'pid':
        return (
          <span className="text-[11px] font-mono text-muted-foreground/50 tabular-nums">
            {p.pid}
          </span>
        );
      case 'cpu':
        return (
          <span className={`text-[12px] font-mono tabular-nums ${
            p.cpu > 80 ? 'text-destructive' : p.cpu > 50 ? 'text-warning' : 'text-foreground/80'
          }`}>
            {formatPercent(p.cpu)}
          </span>
        );
      case 'memory':
        return (
          <span className="text-[12px] font-mono tabular-nums text-foreground/80">
            {formatBytes(p.memory)}
          </span>
        );
      case 'restarts':
        return (
          <span className={`text-[12px] font-mono tabular-nums ${
            p.restarts > 0 ? 'text-warning' : 'text-muted-foreground/40'
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
      role="row"
      aria-rowindex={processId + 1}
      aria-selected={isSelected}
      tabIndex={0}
      style={style}
      onClick={() => select(isSelected ? null : processId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(isSelected ? null : processId);
        }
      }}
      className={`flex items-center px-5 cursor-pointer transition-colors duration-75 group border-b border-border/20 outline-none focus-visible:ring-1 focus-visible:ring-primary ${
        isSelected
          ? 'bg-primary/[0.06]'
          : 'hover:bg-subtle/30'
      }`}
    >
      <div role="cell" className="w-6 shrink-0 flex items-center justify-center">
        <StatusDot status={p.status} />
      </div>

      {columns.map((col) => (
        <div
          key={col.accessorKey}
          role="cell"
          className={`${col.width} shrink-0 px-3 ${col.align === 'right' ? 'text-right' : ''}`}
        >
          {renderCell(col.accessorKey)}
        </div>
      ))}

      <div role="cell" className={`${sparklineWidth} shrink-0 px-3`}>
        <Sparkline data={p.history.cpu} color="var(--chart-cpu)" width={80} height={18} />
      </div>

      <div role="cell" className={`${uptimeWidth} shrink-0 px-3 text-right`}>
        <span className="text-[11px] font-mono tabular-nums text-muted-foreground/50">
          {formatDuration(p.uptime)}
        </span>
      </div>

      <div role="cell" className={`${actionWidth} shrink-0 flex items-center justify-center`}>
        <Dropdown
          open={menuOpen}
          onOpenChange={setMenuOpen}
          align="right"
          trigger={
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="h-7 w-7 flex items-center justify-center text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Process actions"
            >
              <MoreHorizontal size={14} />
            </button>
          }
        >
          <DropdownItem onClick={() => handleAction('restart')}>Restart</DropdownItem>
          <DropdownItem onClick={() => handleAction('reload')}>Reload</DropdownItem>
          <DropdownItem onClick={() => handleAction('stop')}>Stop</DropdownItem>
          <DropdownItem onClick={() => handleAction('start')}>Start</DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={() => handleAction('delete')} danger>Delete</DropdownItem>
        </Dropdown>
      </div>
    </div>
  );
});

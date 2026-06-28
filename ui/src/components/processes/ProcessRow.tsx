import { memo, useState, useRef, useEffect } from 'react';
import { MoreHorizontal, RotateCw, Square, Play, Trash2 } from 'lucide-react';
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
      onClick={() => { if (!menuOpen) select(isSelected ? null : processId); }}
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

      <div role="cell" className={`${actionWidth} shrink-0 flex items-center justify-center`} ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="h-7 w-7 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-subtle/50 transition-colors"
          aria-label="Process actions"
        >
          <MoreHorizontal size={14} />
        </button>

        {menuOpen && (
          <div className="absolute right-5 top-full z-50 mt-1 min-w-[140px] bg-popover border border-border shadow-glow-md py-1">
            <MenuRow icon={<RotateCw size={13} />} label="Restart" onClick={() => handleAction('restart')} />
            <MenuRow icon={<Play size={13} />} label="Start" onClick={() => handleAction('start')} />
            <MenuRow icon={<Square size={13} />} label="Stop" onClick={() => handleAction('stop')} />
            <div className="border-t border-border/30 my-1" />
            <MenuRow icon={<Trash2 size={13} />} label="Delete" onClick={() => handleAction('delete')} danger />
          </div>
        )}
      </div>
    </div>
  );
});

function MenuRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
        danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground/80 hover:bg-subtle/50'
      }`}
    >
      <span className="text-muted-foreground/60">{icon}</span>
      {label}
    </button>
  );
}

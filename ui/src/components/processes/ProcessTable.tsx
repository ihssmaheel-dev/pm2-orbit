import { useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search } from 'lucide-react';
import { useProcessStore } from '@/store/processes';
import { useUIStore } from '@/store/ui';
import { ProcessRow } from './ProcessRow';
import type { ProcessSnapshot } from '@/types/pm2';

interface ColumnDef {
  accessorKey: string;
  header: string;
  width: string;
  align?: 'left' | 'right';
}

const columns: ColumnDef[] = [
  { accessorKey: 'name', header: 'Name', width: 'w-[180px]' },
  { accessorKey: 'mode', header: 'Mode', width: 'w-[72px]' },
  { accessorKey: 'pid', header: 'PID', width: 'w-[64px]' },
  { accessorKey: 'cpu', header: 'CPU', width: 'w-[90px]', align: 'right' },
  { accessorKey: 'memory', header: 'Memory', width: 'w-[90px]', align: 'right' },
  { accessorKey: 'restarts', header: 'Restarts', width: 'w-[80px]', align: 'right' },
];

const SPARKLINE_WIDTH = 'w-[90px]';
const UPTIME_WIDTH = 'w-[80px]';

export function ProcessTable() {
  const processes = useProcessStore((s) => s.processes);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const [sorting, setSorting] = useState<SortingState>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => Array.from(processes.values()), [processes]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.pid).includes(q) ||
        p.status.toLowerCase().includes(q),
    );
  }, [data, searchQuery]);

  const table = useReactTable({
    data: filteredData,
    columns: columns.map((c) => ({
      accessorKey: c.accessorKey,
      header: c.header,
      cell: (info: { getValue: () => unknown }) => {
        const val = info.getValue();
        if (c.accessorKey === 'cpu') return `${(val as number).toFixed(1)}%`;
        if (c.accessorKey === 'memory') {
          const bytes = val as number;
          if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
          if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
          return `${(bytes / 1024).toFixed(0)} KB`;
        }
        return String(val ?? '');
      },
    })),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: title + search */}
      <div className="flex items-center justify-between h-12 px-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-1 h-3.5 bg-primary" />
          <span className="text-xs font-medium uppercase tracking-widest text-foreground">
            Processes
          </span>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 leading-none">
            {filteredData.length}
          </span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-56 pl-8 pr-3 text-xs bg-transparent border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 rounded-none"
          />
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center h-9 px-5 border-b border-border bg-background shrink-0 select-none">
        {/* Status dot spacer */}
        <div className="w-5 shrink-0" />

        {columns.map((col) => {
          const isSorted = sorting[0]?.id === col.accessorKey;
          const nextDesc = isSorted && sorting[0]?.desc;
          return (
            <div
              key={col.accessorKey}
              className={`${col.width} shrink-0 px-3 cursor-pointer group`}
              onClick={() => {
                if (isSorted) {
                  setSorting(sorting[0]?.desc ? [] : [{ id: col.accessorKey, desc: true }]);
                } else {
                  setSorting([{ id: col.accessorKey, desc: false }]);
                }
              }}
            >
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  col.align === 'right' ? 'justify-end w-full' : ''
                } ${
                  isSorted ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/70'
                }`}
              >
                {col.header}
                {isSorted && (
                  <span className="text-[9px] text-primary leading-none">{nextDesc ? '▼' : '▲'}</span>
                )}
              </span>
            </div>
          );
        })}

        {/* Sparkline */}
        <div className={`${SPARKLINE_WIDTH} shrink-0 px-3`}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            History
          </span>
        </div>

        {/* Uptime */}
        <div className={`${UPTIME_WIDTH} shrink-0 px-3 text-right`}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Uptime
          </span>
        </div>
      </div>

      {/* Virtual rows */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <div className="w-14 h-14 mx-auto mb-3 bg-subtle/40 flex items-center justify-center">
                <svg className="w-7 h-7 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="text-sm text-muted-foreground">No processes running</div>
              <div className="text-xs text-muted-foreground/50 mt-1">Start PM2 to see processes here</div>
            </div>
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const process = row.original as ProcessSnapshot;
              return (
                <ProcessRow
                  key={process.id}
                  process={process}
                  columns={columns}
                  sparklineWidth={SPARKLINE_WIDTH}
                  uptimeWidth={UPTIME_WIDTH}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

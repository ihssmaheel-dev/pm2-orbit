import { useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
  { accessorKey: 'name', header: 'Name', width: 'w-[160px]' },
  { accessorKey: 'mode', header: 'Mode', width: 'w-[70px]' },
  { accessorKey: 'pid', header: 'PID', width: 'w-[60px]' },
  { accessorKey: 'cpu', header: 'CPU', width: 'w-[70px]', align: 'right' },
  { accessorKey: 'memory', header: 'Memory', width: 'w-[90px]', align: 'right' },
  { accessorKey: 'restarts', header: 'Restarts', width: 'w-[70px]', align: 'right' },
];

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

  const getSortIcon = (columnId: string) => {
    const sort = sorting.find((s) => s.id === columnId);
    if (!sort) return <ArrowUpDown size={10} className="opacity-30" />;
    return sort.desc ? (
      <ArrowDown size={10} className="text-primary" />
    ) : (
      <ArrowUp size={10} className="text-primary" />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0 bg-card/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <span className="text-sm text-foreground font-medium tracking-wide">
              PROCESSES
            </span>
          </div>
          <span className="text-[10px] text-primary-foreground font-mono bg-primary/20 text-primary px-2 py-0.5 min-w-[20px] text-center">
            {filteredData.length}
          </span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search processes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-64 pl-9 pr-4 text-xs bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-none transition-colors"
          />
        </div>
      </div>

      {/* Column Headers */}
      <div className="flex items-center h-10 px-0 border-b border-border bg-background shrink-0">
        {/* Status dot column */}
        <div className="w-10 shrink-0" />

        {columns.map((col) => (
          <div
            key={col.accessorKey}
            className={`${col.width} shrink-0 px-3 cursor-pointer hover:bg-subtle/50 transition-colors select-none group`}
            onClick={() => {
              const isSorted = sorting[0]?.id === col.accessorKey;
              if (isSorted) {
                setSorting(sorting[0]?.desc ? [] : [{ id: col.accessorKey, desc: true }]);
              } else {
                setSorting([{ id: col.accessorKey, desc: false }]);
              }
            }}
          >
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground group-hover:text-foreground transition-colors ${
              col.align === 'right' ? 'justify-end' : ''
            }`}>
              {col.header}
              <span className="opacity-40 group-hover:opacity-100 transition-opacity">
                {getSortIcon(col.accessorKey)}
              </span>
            </div>
          </div>
        ))}

        {/* Sparkline column (no header) */}
        <div className="w-[90px] shrink-0" />

        {/* Uptime column */}
        <div className="flex-1 px-3 text-right">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            UPTIME
          </span>
        </div>
      </div>

      {/* Virtual Rows */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-subtle/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="text-sm text-muted-foreground font-medium">No processes running</div>
              <div className="text-xs text-muted-foreground/60 mt-1">Start PM2 to see processes here</div>
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

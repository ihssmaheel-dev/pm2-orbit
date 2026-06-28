import { useMemo, useRef, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, X } from 'lucide-react';
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
  { accessorKey: 'name', header: 'Name', width: 'flex-1 min-w-[140px]' },
  { accessorKey: 'mode', header: 'Mode', width: 'w-[80px]' },
  { accessorKey: 'pid', header: 'PID', width: 'w-[70px]' },
  { accessorKey: 'cpu', header: 'CPU', width: 'w-[80px]', align: 'right' },
  { accessorKey: 'memory', header: 'Memory', width: 'w-[90px]', align: 'right' },
  { accessorKey: 'restarts', header: 'Restarts', width: 'w-[80px]', align: 'right' },
];

const SPARKLINE_WIDTH = 'w-[100px]';
const UPTIME_WIDTH = 'w-[90px]';
const ACTION_WIDTH = 'w-[50px]';

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

  const toggleSort = useCallback((key: string) => {
    setSorting((prev) => {
      const current = prev.find((s) => s.id === key);
      if (current) {
        if (current.desc) return [];
        return [{ id: key, desc: true }];
      }
      return [{ id: key, desc: false }];
    });
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
  }, []);

  const handleHeaderKeyDown = useCallback((e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSort(key);
    }
  }, [toggleSort]);

  return (
    <div className="flex flex-col h-full border border-border/60 bg-card/40">
      {/* Card Header */}
      <div className="flex items-center justify-between h-[52px] px-5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-[3px] h-4 bg-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
            Processes
          </h2>
          <span className="text-[10px] font-mono font-medium text-primary bg-primary/10 px-1.5 py-[1px] leading-[18px]">
            {filteredData.length}
          </span>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search processes"
            className="h-8 w-52 pl-8 pr-8 text-[11px] bg-background border border-border/80 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 rounded-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        role="table"
        aria-label="Process list"
        aria-rowcount={rows.length}
        className="flex flex-col flex-1 min-h-0"
      >
        {/* Column Headers */}
        <div role="rowgroup" className="shrink-0">
          <div
            role="row"
            className="flex items-center h-9 px-5 select-none border-t border-border/30 border-b border-border/60 bg-background/30"
          >
            <div role="columnheader" className="w-6 shrink-0" aria-label="Status" />

            {columns.map((col) => {
              const sortEntry = sorting.find((s) => s.id === col.accessorKey);
              const sortDir = sortEntry ? (sortEntry.desc ? 'desc' : 'asc') : null;

              return (
                <div
                  key={col.accessorKey}
                  role="columnheader"
                  aria-sort={sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none'}
                  tabIndex={0}
                  className={`${col.width} shrink-0 px-3 cursor-pointer group`}
                  onClick={() => toggleSort(col.accessorKey)}
                  onKeyDown={(e) => handleHeaderKeyDown(e, col.accessorKey)}
                >
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors duration-100 ${
                      col.align === 'right' ? 'justify-end w-full' : ''
                    } ${
                      sortDir
                        ? 'text-primary'
                        : 'text-muted-foreground/50 group-hover:text-foreground/60'
                    }`}
                  >
                    {col.header}
                    <span className="inline-flex flex-col -space-y-[2px] ml-0.5" aria-hidden="true">
                      <svg width="7" height="7" viewBox="0 0 8 8" className={`transition-colors ${sortDir === 'asc' ? 'text-primary' : 'text-muted-foreground/20'}`}>
                        <path d="M4 1L7 5H1L4 1Z" fill="currentColor" />
                      </svg>
                      <svg width="7" height="7" viewBox="0 0 8 8" className={`transition-colors ${sortDir === 'desc' ? 'text-primary' : 'text-muted-foreground/20'}`}>
                        <path d="M4 7L1 3H7L4 7Z" fill="currentColor" />
                      </svg>
                    </span>
                  </span>
                </div>
              );
            })}

            <div role="columnheader" className={`${SPARKLINE_WIDTH} shrink-0 px-3`}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">History</span>
            </div>

            <div role="columnheader" className={`${UPTIME_WIDTH} shrink-0 px-3 text-right`}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Uptime</span>
            </div>

            <div role="columnheader" className={`${ACTION_WIDTH} shrink-0 flex items-center justify-center`}>
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Actions</span>
            </div>
          </div>
        </div>

        {/* Rows */}
        <div role="rowgroup" ref={parentRef} className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div role="row" className="flex items-center justify-center h-full">
              <div role="cell" className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-3 bg-subtle/30 flex items-center justify-center border border-border/40">
                  <svg className="w-6 h-6 text-muted-foreground/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="text-sm text-muted-foreground/70">No processes running</div>
                <div className="text-[11px] text-muted-foreground/40 mt-1">Start PM2 to see processes here</div>
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
                    processId={process.id}
                    columns={columns}
                    sparklineWidth={SPARKLINE_WIDTH}
                    uptimeWidth={UPTIME_WIDTH}
                    actionWidth={ACTION_WIDTH}
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
    </div>
  );
}

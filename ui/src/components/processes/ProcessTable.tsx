import { useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useProcessStore } from '@/store/processes';
import { useUIStore } from '@/store/ui';
import { ProcessRow } from './ProcessRow';
import { Input } from '@/components/shared/Input';
import type { ProcessSnapshot } from '@/types/pm2';

const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: (info: { getValue: () => string }) => info.getValue(),
  },
  {
    accessorKey: 'mode',
    header: 'Mode',
    cell: (info: { getValue: () => string }) => info.getValue(),
  },
  {
    accessorKey: 'pid',
    header: 'PID',
    cell: (info: { getValue: () => number }) => info.getValue(),
  },
  {
    accessorKey: 'cpu',
    header: 'CPU',
    cell: (info: { getValue: () => number }) => `${info.getValue().toFixed(1)}%`,
  },
  {
    accessorKey: 'memory',
    header: 'Memory',
    cell: (info: { getValue: () => number }) => {
      const bytes = info.getValue();
      if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
      if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
      return `${(bytes / 1024).toFixed(0)} KB`;
    },
  },
  {
    accessorKey: 'restarts',
    header: 'Restarts',
    cell: (info: { getValue: () => number }) => info.getValue(),
  },
];

export function ProcessTable() {
  const processes = useProcessStore((s) => s.processes);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const [sorting, setSorting] = useState<SortingState>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    return Array.from(processes.values());
  }, [processes]);

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
    columns,
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
    estimateSize: () => 48,
    overscan: 10,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            Processes ({filteredData.length})
          </span>
        </div>
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-60 h-8 text-xs"
        />
      </div>

      <div className="flex items-center gap-1 px-4 py-1 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
        <div className="w-3" />
        {table.getHeaderGroups().map((headerGroup) =>
          headerGroup.headers.map((header) => (
            <div
              key={header.id}
              className={`cursor-pointer hover:text-foreground transition-colors ${
                header.id === 'name'
                  ? 'w-[140px]'
                  : header.id === 'mode'
                    ? 'w-[60px]'
                    : header.id === 'pid'
                      ? 'w-[60px]'
                      : header.id === 'cpu'
                        ? 'w-[80px] text-right'
                        : header.id === 'memory'
                          ? 'w-[80px] text-right'
                          : header.id === 'restarts'
                            ? 'w-[70px] text-right'
                            : ''
              }`}
              onClick={header.column.getToggleSortingHandler()}
            >
              <div className="flex items-center gap-1">
                {flexRender(header.column.columnDef.header, header.getContext())}
                <ArrowUpDown size={10} className="opacity-50" />
              </div>
            </div>
          )),
        )}
        <div className="ml-auto w-[70px] text-right">Uptime</div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
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
      </div>
    </div>
  );
}

import { useMemo, useRef, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, X, Square, Play } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProcessStore } from "@/store/processes";
import { useUIStore } from "@/store/ui";
import { ProcessRow } from "./ProcessRow";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { ProcessSnapshot } from "@/types/pm2";

interface Col {
  id: string;
  label: string;
  w: string;
  right?: boolean;
}

const COLS: Col[] = [
  { id: "name", label: "Name", w: "flex-1 min-w-1" },
  { id: "mode", label: "Mode", w: "w-19" },
  { id: "pid", label: "PID", w: "w-19" },
  { id: "cpu", label: "CPU", w: "w-24" },
  { id: "memory", label: "Memory", w: "w-24" },
  { id: "restarts", label: "Rst", w: "w-15" },
];

const W_SPARKLINE = "w-[104px]";
const W_STATUS = "w-[90px]";
const W_UPTIME = "w-[108px]";
const W_ACTIONS = "w-[72px]";

export function ProcessTable() {
  const processes = useProcessStore((s) => s.processes);
  const sq = useUIStore((s) => s.searchQuery);
  const setSq = useUIStore((s) => s.setSearchQuery);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [busy, setBusy] = useState(false);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [startConfirm, setStartConfirm] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    const arr: ProcessSnapshot[] = new Array(processes.size);
    let i = 0;
    for (const p of processes.values()) arr[i++] = p;
    return arr;
  }, [processes]);
  const onlineCount = useMemo(() => data.filter((p) => p.status === 'online').length, [data]);
  const stoppedCount = useMemo(() => data.filter((p) => p.status === 'stopped').length, [data]);

  const filteredData = useMemo(() => {
    if (!sq) return data;
    const q = sq.toLowerCase();
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.pid).includes(q) ||
        p.status.toLowerCase().includes(q),
    );
  }, [data, sq]);

  const table = useReactTable({
    data: filteredData,
    columns: COLS.map((c) => ({
      accessorKey: c.id,
      header: c.label,
      cell: (info: { getValue: () => unknown }) => {
        const v = info.getValue();
        if (c.id === "cpu") return `${(v as number).toFixed(1)}%`;
        if (c.id === "memory") {
          const b = v as number;
          if (b >= 1073741824) return `${(b / 1073741824).toFixed(1)} GB`;
          if (b >= 1048576) return `${(b / 1048576).toFixed(0)} MB`;
          return `${(b / 1024).toFixed(0)} KB`;
        }
        return String(v ?? "");
      },
    })),
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
    paddingEnd: 12,
  });

  const toggleSort = useCallback((key: string) => {
    setSorting((prev) => {
      const cur = prev.find((s) => s.id === key);
      if (cur) return cur.desc ? [] : [{ id: key, desc: true }];
      return [{ id: key, desc: false }];
    });
    if (parentRef.current) parentRef.current.scrollTop = 0;
  }, []);

  const sd = (id: string) => {
    const s = sorting.find((x) => x.id === id);
    return s ? (s.desc ? "descending" : "ascending") : null;
  };

  return (
    <div className="flex flex-col h-full bg-card/30 border border-border/50">
      {/* Toolbar */}
      <div className="flex items-center justify-between h-12 px-5 shrink-0 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-semibold text-foreground/85">
            Processes
          </span>
          <span className="text-[11px] font-mono text-primary bg-primary/10 px-1.5 leading-4.5 tabular-nums">
            {filteredData.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={busy || onlineCount === 0}
            onClick={() => setStopConfirm(true)}
            className="cursor-pointer flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-muted-foreground/70 hover:text-destructive border border-border/60 hover:border-destructive/40 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <Square size={10} /> Stop All
          </button>
          <button
            disabled={busy || stoppedCount === 0}
            onClick={() => setStartConfirm(true)}
            className="cursor-pointer flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium text-muted-foreground/70 hover:text-success border border-border/60 hover:border-success/40 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <Play size={10} /> Start All
          </button>
          <div className="relative">
            <Search
              size={11}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30"
            />
            <input
              placeholder="Search processes…"
              value={sq}
              onChange={(e) => setSq(e.target.value)}
              aria-label="Search processes"
              className="h-7 w-49 pl-7 pr-7 text-[12px] bg-background border border-border/80 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 rounded-none"
            />
            {sq && (
              <button
                onClick={() => setSq("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        role="table"
        aria-label="Process list"
        aria-rowcount={rows.length}
        className="flex flex-col flex-1 min-h-0"
      >
        {/* Header row */}
        <div role="rowgroup" className="shrink-0">
          <div
            role="row"
            className="flex items-center h-8 px-5 border-b border-border/40 bg-background/40 text-muted-foreground/50 select-none"
          >
            {COLS.map((col) => {
              const dir = sd(col.id);
              return (
                <div
                  key={col.id}
                  role="columnheader"
                  aria-sort={dir || "none"}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSort(col.id);
                    }
                  }}
                  onClick={() => toggleSort(col.id)}
                  className={`${col.w} shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest cursor-pointer transition-colors hover:text-foreground/60 ${col.right ? "text-right" : ""} ${dir ? "text-primary" : ""}`}
                >
                  {col.label}
                  {dir && (
                    <svg
                      width="6"
                      height="6"
                      viewBox="0 0 8 8"
                      className="inline-block ml-1 -mt-px text-primary align-middle"
                    >
                      {dir === "ascending" ? (
                        <path d="M4 1L7 5H1L4 1Z" fill="currentColor" />
                      ) : (
                        <path d="M4 7L1 3H7L4 7Z" fill="currentColor" />
                      )}
                    </svg>
                  )}
                </div>
              );
            })}

            <div
              role="columnheader"
              className={`${W_SPARKLINE} shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40`}
            >
              History
            </div>

            <div
              role="columnheader"
              className={`${W_STATUS} shrink-0 pl-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50`}
            >
              Status
            </div>

            <div
              role="columnheader"
              className={`${W_UPTIME} shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50`}
            >
              Uptime
            </div>

            <div
              role="columnheader"
              className={`${W_ACTIONS} shrink-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40`}
            >
              Actions
            </div>
          </div>
        </div>

        {/* Data rows */}
        <div role="rowgroup" ref={parentRef} className="flex-1 overflow-auto">
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center py-16">
              <div>
                <div className="w-12 h-12 mx-auto mb-4 bg-subtle/40 border border-border/30 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-muted-foreground/25"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground/60">
                  No processes running
                </p>
                <p className="text-xs text-muted-foreground/30 mt-1">
                  Start PM2 to see your processes here
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((vr) => {
                const row = rows[vr.index];
                const p = row.original as ProcessSnapshot;
                return (
                  <ProcessRow
                    key={p.id}
                    pid={p.id}
                    style={{
                      position: "absolute",
                      top: vr.start,
                      left: 0,
                      width: "100%",
                      height: vr.size,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={stopConfirm}
        onClose={() => setStopConfirm(false)}
        onConfirm={async () => {
          const targets = Array.from(processes.values()).filter((p) => p.status === 'online');
          if (targets.length === 0) return;
          setBusy(true);
          const results = await Promise.allSettled(targets.map((p) =>
            api(`/api/processes/${p.id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }), silent: true }),
          ));
          setBusy(false);
          const ok = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
          if (ok === targets.length) toast.success(`Stopped ${ok} process${ok !== 1 ? 'es' : ''}`);
          else if (ok > 0) toast.success(`Stopped ${ok} of ${targets.length}`);
          else toast.error(`Failed to stop any process`);
        }}
        title="Stop All Processes"
        message={`This will stop ${onlineCount} running process${onlineCount !== 1 ? 'es' : ''}. Are you sure?`}
        confirmLabel="Stop All"
        variant="destructive"
      />
      <ConfirmDialog
        open={startConfirm}
        onClose={() => setStartConfirm(false)}
        onConfirm={async () => {
          const targets = Array.from(processes.values()).filter((p) => p.status === 'stopped');
          if (targets.length === 0) return;
          setBusy(true);
          const results = await Promise.allSettled(targets.map((p) =>
            api(`/api/processes/${p.id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }), silent: true }),
          ));
          setBusy(false);
          const ok = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
          if (ok === targets.length) toast.success(`Started ${ok} process${ok !== 1 ? 'es' : ''}`);
          else if (ok > 0) toast.success(`Started ${ok} of ${targets.length}`);
          else toast.error(`Failed to start any process`);
        }}
        title="Start All Processes"
        message={`This will start ${stoppedCount} stopped process${stoppedCount !== 1 ? 'es' : ''}. Are you sure?`}
        confirmLabel="Start All"
        variant="default"
      />
    </div>
  );
}

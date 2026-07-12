import { useMemo, useRef, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, X, Square, Play, RotateCw, Trash2, Download, Tag } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useProcessStore } from "@/store/processes";
import { useUIStore } from "@/store/ui";
import { useTagsStore } from "@/store/tags";
import { ProcessRow } from "./ProcessRow";
import { TagBadge } from "./TagBadge";
import { TagManager } from "./TagManager";
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
  { id: "mode", label: "Mode", w: "hidden lg:block lg:w-19" },
  { id: "pid", label: "PID", w: "hidden xl:block xl:w-19" },
  { id: "cpu", label: "CPU", w: "w-16 sm:w-20" },
  { id: "memory", label: "Memory", w: "hidden sm:block sm:w-20" },
  { id: "restarts", label: "Rst", w: "hidden md:block md:w-15" },
];

const W_SPARKLINE = "hidden lg:block lg:w-[104px]";
const W_STATUS = "w-[70px] sm:w-[90px]";
const W_UPTIME = "hidden xl:block xl:w-[108px]";
const W_ACTIONS = "w-[60px] sm:w-[72px]";

export function ProcessTable() {
  const processes = useProcessStore((s) => s.processes);
  const sq = useUIStore((s) => s.searchQuery);
  const setSq = useUIStore((s) => s.setSearchQuery);
  const tagFilter = useUIStore((s) => s.tagFilter);
  const toggleTagFilter = useUIStore((s) => s.toggleTagFilter);
  const tags = useTagsStore((s) => s.tags);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [startConfirm, setStartConfirm] = useState(false);
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
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
    let result = data;

    // Tag filter
    if (tagFilter.length > 0) {
      result = result.filter((p) =>
        p.tags && p.tags.some((t) => tagFilter.includes(t.id)),
      );
    }

    // Search filter
    if (sq) {
      const q = sq.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          String(p.pid).includes(q) ||
          p.status.toLowerCase().includes(q),
      );
    }

    return result;
  }, [data, sq, tagFilter]);

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

  const exportCSV = useCallback(() => {
    if (filteredData.length === 0) return;
    const headers = ["Name", "Mode", "PID", "CPU", "Memory", "Restarts", "Status", "Uptime"];
    const rows = filteredData.map((p) => [
      p.name,
      p.mode,
      p.pid,
      `${p.cpu.toFixed(1)}%`,
      p.memory,
      p.restarts,
      p.status,
      p.uptime,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pm2-orbit-processes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredData.length} processes`);
  }, [filteredData]);

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
            onClick={() => setRestartConfirm(true)}
            className="hidden sm:flex cursor-pointer items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold text-foreground hover:text-primary border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <RotateCw size={10} className={busy ? "animate-spin" : ""} />
            {progress ? `${progress.done}/${progress.total}` : 'Restart All'}
          </button>
          <button
            disabled={busy || onlineCount === 0}
            onClick={() => setStopConfirm(true)}
            className="hidden sm:flex cursor-pointer items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold text-foreground hover:text-destructive border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <Square size={10} />
            {progress ? `${progress.done}/${progress.total}` : 'Stop All'}
          </button>
          <button
            disabled={busy || stoppedCount === 0}
            onClick={() => setStartConfirm(true)}
            className="hidden sm:flex cursor-pointer items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold text-foreground hover:text-success border border-border hover:border-success/40 hover:bg-success/5 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <Play size={10} />
            {progress ? `${progress.done}/${progress.total}` : 'Start All'}
          </button>
          <button
            disabled={busy || filteredData.length === 0}
            onClick={() => setDeleteConfirm(true)}
            className="hidden md:flex cursor-pointer items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold text-destructive border border-destructive/40 hover:border-destructive/60 hover:bg-destructive/10 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <Trash2 size={10} /> {progress ? `${progress.done}/${progress.total}` : 'Delete All'}
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
          <button
            onClick={exportCSV}
            disabled={filteredData.length === 0}
            className="hidden sm:flex cursor-pointer items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold text-foreground hover:text-primary border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-25 disabled:pointer-events-none"
          >
            <Download size={10} /> Export
          </button>
        </div>
      </div>

      {/* Tag filter bar */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 px-5 py-1.5 shrink-0 border-b border-border/30 overflow-x-auto">
          <Tag size={10} className="text-muted-foreground/50 shrink-0" />
          {tags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              active={tagFilter.includes(tag.id)}
              onClick={() => toggleTagFilter(tag.id)}
            />
          ))}
          <button
            onClick={() => setTagManagerOpen(true)}
            className="cursor-pointer text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors ml-1"
          >
            Manage
          </button>
        </div>
      )}
      {tags.length === 0 && (
        <div className="flex items-center px-5 py-1 shrink-0 border-b border-border/30">
          <button
            onClick={() => setTagManagerOpen(true)}
            className="cursor-pointer flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <Tag size={9} /> Add tags
          </button>
        </div>
      )}

      <TagManager open={tagManagerOpen} onClose={() => setTagManagerOpen(false)} />

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
        <div
          role="rowgroup"
          ref={parentRef}
          className="flex-1 overflow-auto"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "j") {
              e.preventDefault();
              const currentIdx = rows.findIndex((r) => (r.original as ProcessSnapshot).id === (useProcessStore.getState().selectedId));
              const nextIdx = currentIdx < rows.length - 1 ? currentIdx + 1 : 0;
              const nextRow = rows[nextIdx];
              if (nextRow) {
                useProcessStore.getState().select((nextRow.original as ProcessSnapshot).id);
                virtualizer.scrollToIndex(nextIdx);
              }
            }
            if (e.key === "ArrowUp" || e.key === "k") {
              e.preventDefault();
              const currentIdx = rows.findIndex((r) => (r.original as ProcessSnapshot).id === (useProcessStore.getState().selectedId));
              const prevIdx = currentIdx > 0 ? currentIdx - 1 : rows.length - 1;
              const prevRow = rows[prevIdx];
              if (prevRow) {
                useProcessStore.getState().select((prevRow.original as ProcessSnapshot).id);
                virtualizer.scrollToIndex(prevIdx);
              }
            }
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const selectedId = useProcessStore.getState().selectedId;
              if (selectedId !== null) {
                useProcessStore.getState().select(null);
              }
            }
          }}
        >
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
          const targets = tagFilter.length > 0
            ? filteredData.filter((p) => p.status === 'online')
            : Array.from(processes.values()).filter((p) => p.status === 'online');
          if (targets.length === 0) return;
          setBusy(true);
          setProgress({ done: 0, total: targets.length });
          let ok = 0;
          for (let i = 0; i < targets.length; i++) {
            const p = targets[i];
            try {
              const res = await api(`/api/processes/${p.id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stop' }), silent: true });
              if (res.ok) ok++;
            } catch {}
            setProgress({ done: i + 1, total: targets.length });
          }
          setBusy(false);
          setProgress(null);
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
          const targets = tagFilter.length > 0
            ? filteredData.filter((p) => p.status === 'stopped')
            : Array.from(processes.values()).filter((p) => p.status === 'stopped');
          if (targets.length === 0) return;
          setBusy(true);
          setProgress({ done: 0, total: targets.length });
          let ok = 0;
          for (let i = 0; i < targets.length; i++) {
            const p = targets[i];
            try {
              const res = await api(`/api/processes/${p.id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }), silent: true });
              if (res.ok) ok++;
            } catch {}
            setProgress({ done: i + 1, total: targets.length });
          }
          setBusy(false);
          setProgress(null);
          if (ok === targets.length) toast.success(`Started ${ok} process${ok !== 1 ? 'es' : ''}`);
          else if (ok > 0) toast.success(`Started ${ok} of ${targets.length}`);
          else toast.error(`Failed to start any process`);
        }}
        title="Start All Processes"
        message={`This will start ${stoppedCount} stopped process${stoppedCount !== 1 ? 'es' : ''}. Are you sure?`}
        confirmLabel="Start All"
        variant="default"
      />
      <ConfirmDialog
        open={restartConfirm}
        onClose={() => setRestartConfirm(false)}
        onConfirm={async () => {
          const targets = tagFilter.length > 0
            ? filteredData.filter((p) => p.status === 'online')
            : Array.from(processes.values()).filter((p) => p.status === 'online');
          if (targets.length === 0) return;
          setBusy(true);
          setProgress({ done: 0, total: targets.length });
          let ok = 0;
          for (let i = 0; i < targets.length; i++) {
            const p = targets[i];
            try {
              const res = await api(`/api/processes/${p.id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'restart' }), silent: true });
              if (res.ok) ok++;
            } catch {}
            setProgress({ done: i + 1, total: targets.length });
          }
          setBusy(false);
          setProgress(null);
          if (ok === targets.length) toast.success(`Restarted ${ok} process${ok !== 1 ? 'es' : ''}`);
          else if (ok > 0) toast.success(`Restarted ${ok} of ${targets.length}`);
          else toast.error(`Failed to restart any process`);
        }}
        title="Restart All Processes"
        message={`This will restart ${onlineCount} running process${onlineCount !== 1 ? 'es' : ''}. Are you sure?`}
        confirmLabel="Restart All"
        variant="default"
      />
      <ConfirmDialog
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={async () => {
          const targets = tagFilter.length > 0
            ? filteredData
            : Array.from(processes.values());
          if (targets.length === 0) return;
          setBusy(true);
          const results = await Promise.allSettled(targets.map((p) =>
            api(`/api/processes/${p.id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete' }), silent: true }),
          ));
          setBusy(false);
          const ok = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
          if (ok === targets.length) toast.success(`Deleted ${ok} process${ok !== 1 ? 'es' : ''}`);
          else if (ok > 0) toast.success(`Deleted ${ok} of ${targets.length}`);
          else toast.error(`Failed to delete any process`);
        }}
        title="Delete All Processes"
        message={`This will permanently delete all ${processes.size} process${processes.size !== 1 ? 'es' : ''} from PM2. This cannot be undone. Are you sure?`}
        confirmLabel="Delete All"
        variant="destructive"
      />
    </div>
  );
}

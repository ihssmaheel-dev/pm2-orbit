import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Pause,
  Play,
  Download,
  Trash2,
  Search,
  Copy,
  Terminal,
  X,
  ArrowDown,
} from "lucide-react";
import { useLogsStore, type LogEntry } from "@/store/logs";
import { useProcessStore } from "@/store/processes";
import { cn } from "@/lib/utils";
import { useSearchParams, useNavigate } from "react-router-dom";

type StreamFilter = "all" | "stdout" | "stderr";

const APP_COLORS = [
  "text-cyan-400",
  "text-green-400",
  "text-yellow-400",
  "text-purple-400",
  "text-pink-400",
  "text-blue-400",
  "text-orange-400",
  "text-teal-400",
  "text-indigo-400",
  "text-rose-400",
  "text-emerald-400",
  "text-violet-400",
  "text-amber-400",
  "text-lime-400",
  "text-fuchsia-400",
  "text-sky-400",
];

const APP_COLORS_LIGHT = [
  "text-cyan-600",
  "text-green-600",
  "text-yellow-600",
  "text-purple-600",
  "text-pink-600",
  "text-blue-600",
  "text-orange-600",
  "text-teal-600",
  "text-indigo-600",
  "text-rose-600",
  "text-emerald-600",
  "text-violet-600",
  "text-amber-600",
  "text-lime-600",
  "text-fuchsia-600",
  "text-sky-600",
];

function getAppColor(name: string, isDark: boolean): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const colors = isDark ? APP_COLORS : APP_COLORS_LIGHT;
  return colors[Math.abs(hash) % colors.length];
}

const ANSI_RE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORa-z]/g;

function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '');
}

function formatLogTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function highlightText(text: string, query: string): (string | { highlighted: string })[] {
  if (!query) return [text];
  const lowered = text.toLowerCase();
  const q = query.toLowerCase();
  const parts: (string | { highlighted: string })[] = [];
  let lastIndex = 0;
  let idx = lowered.indexOf(q, lastIndex);
  while (idx !== -1) {
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx));
    parts.push({ highlighted: text.slice(idx, idx + q.length) });
    lastIndex = idx + q.length;
    idx = lowered.indexOf(q, lastIndex);
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function LogViewer({ initialProcessId }: { initialProcessId?: number }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const paused = useLogsStore((s) => s.paused);
  const setPaused = useLogsStore((s) => s.setPaused);
  const clearLogs = useLogsStore((s) => s.clearLogs);
  const addLog = useLogsStore((s) => s.addLog);
  const buffers = useLogsStore((s) => s.buffers);

  const processes = useProcessStore((s) => s.processes);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamFilter, setStreamFilter] = useState<StreamFilter>("all");
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const parentRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  autoScrollRef.current = autoScroll;

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (initialProcessId == null) {
      setSelectedProcessId(null);
      return;
    }
    // Keep current selection if it's still valid (prevents clobbering on re-render)
    if (selectedProcessId != null) {
      const cur = processes.get(selectedProcessId);
      if (cur && cur.id === initialProcessId) return;
    }
    // Resolve from ID (deterministic, no first-match ambiguity)
    if (processes.has(initialProcessId)) {
      setSelectedProcessId(initialProcessId);
    }
  }, [initialProcessId, processes, selectedProcessId]);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let disposed = false;

    // Fetch initial history via REST (runs once on mount)
    fetch("/api/logs/history")
      .then((r) => r.json())
      .then((data) => {
        if (disposed || !data || typeof data !== "object") return;
        for (const [pidStr, entries] of Object.entries(data)) {
          const pid = Number(pidStr);
          for (const e of entries as any[]) {
            addLog({
              id: e.id,
              ts: e.ts,
              processId: pid,
              processName: e.processName || `PID ${pid}`,
              stream: e.stream || "stdout",
              message: e.message ?? "",
            });
          }
        }
      })
      .catch(() => {});

    // SSE for new entries only (no buffer dump on connect)
    const es = new EventSource("/api/logs/stream");
    es.onmessage = (event) => {
      try {
        const raw = event.data as string;
        if (!raw) return;
        const lines = raw.split("\n");
        for (const line of lines) {
          if (!line) continue;
          try {
            const data = JSON.parse(line);
            if (data && typeof data.ts === "number" && data.processId != null) {
              addLog({
                id: data.id,
                ts: data.ts,
                processId: data.processId,
                processName: data.processName || `PID ${data.processId}`,
                stream: data.stream || "stdout",
                message: data.message ?? "",
              });
            }
          } catch {}
        }
      } catch {}
    };
    es.onerror = () => {
      console.warn('[LogViewer] SSE connection error, will auto-reconnect');
    };
    return () => {
      disposed = true;
      es.close();
    };
  }, [addLog]);

  const processEntries = useMemo(() => {
    const entries: { id: number; name: string }[] = [];
    for (const proc of processes.values()) {
      entries.push({ id: proc.id, name: proc.name });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    return entries;
  }, [processes]);

  const filteredLogs = useMemo(() => {
    const result: LogEntry[] = [];

    if (selectedProcessId === null) return result;

    const MAX = 1000;
    const sourceBufs: [number, LogEntry[]][] = [];

    for (const [pid, entries] of buffers) {
      if (pid !== selectedProcessId) continue;
      if (entries.length === 0) continue;
      sourceBufs.push([pid, entries]);
    }

    if (sourceBufs.length === 0) return result;

    const nameByPid = new Map(processEntries.map((p) => [p.id, p.name]));

    const entries = sourceBufs[0][1];
    const name = nameByPid.get(selectedProcessId) || `PID ${selectedProcessId}`;
    const limit = Math.min(entries.length, MAX);
    const start = entries.length - limit;
    for (let i = start; i < entries.length; i++) {
      const e = entries[i];
      result.push(e.processName === name ? e : { ...e, processName: name });
    }

    if (result.length > MAX) result.splice(0, result.length - MAX);

    // Strip ANSI and filter by search query
    const q = searchQuery.toLowerCase();
    for (let i = result.length - 1; i >= 0; i--) {
      const e = result[i];
      const clean = ANSI_RE.test(e.message) ? e.message.replace(ANSI_RE, '') : e.message;

      if (streamFilter !== 'all' && e.stream !== streamFilter) {
        result.splice(i, 1);
        continue;
      }

      if (q && !clean.toLowerCase().includes(q)) {
        result.splice(i, 1);
        continue;
      }

      // Store cleaned message
      result[i] = { ...e, message: clean };
    }

    return result;
  }, [buffers, processEntries, selectedProcessId, streamFilter, searchQuery]);

  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    autoScrollRef.current = atBottom;
    setAutoScroll(atBottom);
  }, []);

  // Throttled scroll handler
  const throttledScroll = useCallback(() => {
    requestAnimationFrame(handleScroll);
  }, [handleScroll]);

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
    autoScrollRef.current = true;
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "End" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        scrollToBottom();
      }
      if (e.key === "Home" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (parentRef.current) parentRef.current.scrollTop = 0;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [scrollToBottom]);

  const downloadLogs = useCallback(() => {
    const text = filteredLogs
      .map((log) => `[${new Date(log.ts).toISOString()}] [${log.processName}] [${log.stream}] ${stripAnsi(log.message)}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pm2-orbit-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const copyLogs = useCallback(() => {
    const text = filteredLogs
      .map((log) => `[${new Date(log.ts).toISOString()}] [${log.processName}] [${log.stream}] ${stripAnsi(log.message)}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  }, [filteredLogs]);

  const handleClear = useCallback(() => {
    if (selectedProcessId !== null) {
      clearLogs(selectedProcessId);
    } else {
      clearLogs();
    }
    autoScrollRef.current = true;
    setAutoScroll(true);
  }, [clearLogs, selectedProcessId]);

  const selectProcess = useCallback(
    (id: number | null) => {
      setSelectedProcessId(id);
      setAutoScroll(true);
      autoScrollRef.current = true;
    },
    [],
  );

  // Scroll to bottom when process changes
  useEffect(() => {
    if (selectedProcessId !== null) {
      const timer = setTimeout(() => {
        if (parentRef.current) {
          parentRef.current.scrollTop = parentRef.current.scrollHeight;
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedProcessId]);

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 22,
    overscan: 30,
  });

  useEffect(() => {
    if (autoScrollRef.current && filteredLogs.length > 0 && parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, [filteredLogs.length]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-card/80 shrink-0">
        <Terminal size={14} className="text-primary" />
        <span className="text-sm text-foreground font-semibold tracking-wider uppercase">Logs</span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
            <input
              ref={searchInputRef}
              placeholder="Search logs…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-44 bg-background border border-border/60 text-xs text-foreground placeholder:text-muted-foreground/40 pl-7 pr-7 focus:outline-none focus:border-primary/40 rounded-none font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground cursor-pointer"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Stream filter */}
          <div className="flex border border-border/60 h-7">
            {(["all", "stdout", "stderr"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStreamFilter(s)}
                className={cn(
                  "px-2 text-[10px] uppercase tracking-wider transition-colors font-mono cursor-pointer",
                  streamFilter === s
                    ? s === "stderr"
                      ? "bg-destructive/10 text-destructive font-semibold"
                      : "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-subtle/30",
                )}
              >
                {s === "all" ? "All" : s === "stdout" ? "OUT" : "ERR"}
              </button>
            ))}
          </div>

          {/* Pause/Resume */}
          <button
            onClick={() => setPaused(!paused)}
            className={cn(
              "h-7 px-2 text-[10px] uppercase tracking-wider border transition-colors font-mono flex items-center gap-1 cursor-pointer",
              paused
                ? "border-warning/40 text-warning bg-warning/5 hover:bg-warning/10"
                : "border-border/60 text-muted-foreground/60 hover:text-foreground hover:bg-subtle/30",
            )}
          >
            {paused ? <Play size={11} /> : <Pause size={11} />}
            {paused ? "Resume" : "Pause"}
          </button>

          {/* Actions */}
          <div className="flex border border-border/60 h-7">
            <button
              onClick={copyLogs}
              className="px-2 h-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
              title="Copy visible logs"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={downloadLogs}
              className="px-2 h-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
              title="Download logs"
            >
              <Download size={12} />
            </button>
            <button
              onClick={handleClear}
              className="px-2 h-full flex items-center justify-center text-muted-foreground/60 hover:text-destructive transition-colors cursor-pointer"
              title="Clear logs"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Process tabs */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-card/50 shrink-0 overflow-x-auto scrollbar-thin">
        {processEntries.map((p) => {
          const isSelected = selectedProcessId === p.id;
          const hasLogs = (buffers.get(p.id)?.length ?? 0) > 0;
          const proc = processes.get(p.id);
          const isOnline = proc?.status === 'online';
          const isStopped = proc?.status === 'stopped';
          const tags = proc?.tags;
          return (
            <button
              key={p.id}
              onClick={() => { navigate(`/logs/${p.id}`); selectProcess(p.id); }}
              className={cn(
                "relative flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer shrink-0 rounded border",
                isSelected
                  ? "bg-primary/10 border-primary/40 text-primary shadow-sm shadow-primary/5"
                  : "border-border/50 text-muted-foreground/70 hover:text-foreground hover:border-border/80 hover:bg-subtle/20",
              )}
            >
              {tags && tags.length > 0 && (
                <span
                  className="absolute top-0 right-0 w-0 h-0 border-t-[10px] border-l-[10px] border-t-transparent border-l-transparent"
                  style={{ borderTopColor: tags[0].color, borderLeftColor: 'transparent' }}
                />
              )}
              <span className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                isSelected ? "bg-primary" : isOnline ? "bg-success" : isStopped ? "bg-warning/70" : "bg-muted-foreground/30",
              )} />
              <span title={p.name} className={cn(
                "shrink-0 transition-all",
                isSelected ? "max-w-none font-medium" : "max-w-[100px] truncate",
              )}>
                {p.name}
                {processEntries.filter((e) => e.name === p.name).length > 1 && (
                  <span className="text-muted-foreground/50 ml-0.5">#{p.id}</span>
                )}
              </span>
              {hasLogs && (
                <span className={cn(
                  "text-[9px] font-mono tabular-nums px-1 leading-3",
                  isSelected ? "bg-primary/15 text-primary" : "bg-subtle/60 text-muted-foreground/50",
                )}>
                  {buffers.get(p.id)?.length ?? 0}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Log content wrapper */}
      <div className="flex-1 relative overflow-hidden">
        {/* Log content */}
        <div
          ref={parentRef}
          onScroll={throttledScroll}
          className="absolute inset-0 overflow-auto font-mono text-[13px] leading-[1.55] bg-background scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ fontFamily: "'IBM Plex Mono', 'Cascadia Code', 'Fira Code', monospace" }}
        >
        {processEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 select-none">
            <Terminal size="36" className="opacity-20" />
            <p className="text-sm font-semibold uppercase tracking-wider">No processes running</p>
            <p className="text-xs opacity-40">Start a PM2 process to see logs here</p>
          </div>
        ) : selectedProcessId === null ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 select-none">
            <div className="w-16 h-16 rounded-lg bg-subtle/30 border border-border/30 flex items-center justify-center">
              <Terminal size="28" className="text-primary/30" />
            </div>
            <div className="text-center">
              <p className="text-sm text-foreground/60 font-medium">Select a process to view logs</p>
              <p className="text-xs text-muted-foreground/40 mt-1">Click any process tab above to start tailing</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 select-none">
            <Search size="28" className="opacity-20" />
            <p className="text-xs">
              {paused
                ? "Stream paused"
                : buffers.size > 0
                  ? "No logs match the current filters"
                  : "Waiting for log output..."}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[11px] text-primary hover:text-primary-hover underline cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div
            className="relative"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((vr) => {
              const log = filteredLogs[vr.index];
              const isErr = log.stream === "stderr";
              const appColor = getAppColor(log.processName, isDark);
              const cleanMsg = stripAnsi(log.message);

              return (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-center gap-0 px-4 hover:bg-white/[0.02] dark:hover:bg-white/[0.02] transition-colors group absolute left-0 w-full overflow-hidden cursor-pointer",
                    isErr && "bg-destructive/[0.03] dark:bg-destructive/[0.04]",
                  )}
                  style={{ top: vr.start, height: vr.size }}
                  onClick={() => setSelectedLog({ ...log, message: cleanMsg })}
                >
                  {/* PM2-style app name prefix */}
                  <span
                    className={cn(
                      "shrink-0 w-[120px] text-right pr-2.5 text-[12px] font-medium select-none truncate border-r border-border/20 mr-2.5 leading-[22px]",
                      appColor,
                    )}
                    title={log.processName}
                  >
                    {log.processName}
                  </span>

                  {/* Timestamp */}
                  <span className="shrink-0 text-[11px] text-muted-foreground/50 dark:text-muted-foreground/40 select-none tabular-nums mr-2.5 min-w-[90px] leading-[22px]">
                    {formatLogTime(log.ts)}
                  </span>

                  {/* Stream indicator */}
                  <span
                    className={cn(
                      "shrink-0 w-[32px] text-[10px] font-bold uppercase tracking-wider mr-2 select-none leading-[22px]",
                      isErr ? "text-destructive/70" : "text-primary/60",
                    )}
                  >
                    {isErr ? "ERR" : "OUT"}
                  </span>

                  {/* Message */}
                  <span
                    title={cleanMsg}
                    className={cn(
                      "flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis leading-[22px] cursor-default",
                      isErr ? "text-red-400/90 dark:text-red-400/90" : "text-foreground",
                    )}
                  >
                    {searchQuery
                      ? highlightText(cleanMsg, searchQuery).map((part, i) =>
                          typeof part === "string" ? (
                            <span key={i}>{part}</span>
                          ) : (
                            <mark key={i} className="bg-yellow-500/30 dark:bg-yellow-500/30 text-inherit rounded-none px-0">
                              {part.highlighted}
                            </mark>
                          ),
                        )
                      : cleanMsg}
                  </span>

                  {/* Copy line button (on hover) */}
                  <button
                    onClick={() => navigator.clipboard.writeText(cleanMsg)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 text-muted-foreground/30 hover:text-foreground leading-[22px]"
                    title="Copy line"
                  >
                    <Copy size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Floating scroll-to-bottom button */}
        {!autoScroll && selectedProcessId !== null && (
          <button
            onClick={scrollToBottom}
            className={cn(
              "absolute bottom-4 right-4 z-40",
              "w-10 h-10 flex items-center justify-center",
              "bg-primary/90 hover:bg-primary text-primary-foreground",
              "shadow-lg shadow-primary/20 transition-all duration-200",
              "hover:scale-110 active:scale-95 cursor-pointer",
            )}
            title="Scroll to bottom (End)"
          >
            <ArrowDown size={16} />
          </button>
        )}

        {/* Paused indicator */}
        {paused && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 bg-warning/90 text-black shadow-lg text-[11px] font-semibold uppercase tracking-wider">
            <Pause size={11} />
            Paused
          </div>
        )}
      </div>

      {/* Log Detail Dialog */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl bg-card border border-border/50 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dialog Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-xs font-mono font-medium",
                  selectedLog.stream === 'stderr' ? 'text-destructive' : 'text-primary',
                )}>
                  {selectedLog.stream === 'stderr' ? 'STDERR' : 'STDOUT'}
                </span>
                <span className="text-xs text-muted-foreground">{selectedLog.processName}</span>
                <span className="text-[10px] text-muted-foreground/50 font-mono">{formatLogTime(selectedLog.ts)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(selectedLog.message)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted border border-border/60 rounded transition-colors cursor-pointer"
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Dialog Body */}
            <div className="p-4 max-h-[60vh] overflow-auto">
              <pre className="text-[13px] font-mono leading-relaxed whitespace-pre-wrap break-all text-foreground/80">
                {selectedLog.message}
              </pre>
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 text-[10px] text-muted-foreground">
              <span>{selectedLog.processName} • {selectedLog.stream}</span>
              <span>{new Date(selectedLog.ts).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

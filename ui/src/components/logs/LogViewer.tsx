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

export function LogViewer({ initialProcessName = "" }: { initialProcessName?: string }) {
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
  const [selectedProcessId, setSelectedProcessId] = useState<number | "all">("all");
  const [isDark, setIsDark] = useState(true);

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
    if (!initialProcessName) {
      setSelectedProcessId("all");
      return;
    }
    for (const proc of processes.values()) {
      if (proc.name === initialProcessName) {
        setSelectedProcessId(proc.id);
        return;
      }
    }
    setSelectedProcessId("all");
  }, [initialProcessName, processes]);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
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
    es.onerror = () => {};
    return () => es.close();
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
    const MAX = selectedProcessId === "all" ? 5000 : 50000;
    const sourceBufs: [number, LogEntry[]][] = [];

    for (const [pid, entries] of buffers) {
      if (selectedProcessId !== "all" && pid !== selectedProcessId) continue;
      if (entries.length === 0) continue;
      sourceBufs.push([pid, entries]);
    }

    if (sourceBufs.length === 0) return result;

    const nameByPid = new Map(processEntries.map((p) => [p.id, p.name]));

    if (selectedProcessId === "all") {
      for (const [pid, entries] of sourceBufs) {
        const name = nameByPid.get(pid) || `PID ${pid}`;
        const limit = Math.min(entries.length, Math.ceil(MAX / sourceBufs.length));
        const start = Math.max(0, entries.length - limit);
        for (let i = start; i < entries.length; i++) {
          const e = entries[i];
          result.push(e.processName === name ? e : { ...e, processName: name });
        }
      }
      result.sort((a, b) => a.ts - b.ts);
    } else {
      const entries = sourceBufs[0][1];
      const name = nameByPid.get(selectedProcessId!) || `PID ${selectedProcessId!}`;
      const limit = Math.min(entries.length, MAX);
      const start = entries.length - limit;
      for (let i = start; i < entries.length; i++) {
        const e = entries[i];
        result.push(e.processName === name ? e : { ...e, processName: name });
      }
    }

    if (result.length > MAX) result.splice(0, result.length - MAX);

    if (streamFilter !== "all") {
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].stream !== streamFilter) result.splice(i, 1);
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      for (let i = result.length - 1; i >= 0; i--) {
        if (!result[i].message.toLowerCase().includes(q)) result.splice(i, 1);
      }
    }

    return result;
  }, [buffers, processEntries, selectedProcessId, streamFilter, searchQuery]);

  useEffect(() => {
    if (autoScrollRef.current && parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    autoScrollRef.current = atBottom;
    setAutoScroll(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    setAutoScroll(true);
    autoScrollRef.current = true;
    if (parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, []);

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
    clearLogs();
    autoScrollRef.current = true;
    setAutoScroll(true);
  }, [clearLogs]);

  const selectProcess = useCallback(
    (id: number | "all") => {
      setSelectedProcessId(id);
      setAutoScroll(true);
      autoScrollRef.current = true;
    },
    [],
  );

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
    <div className="flex flex-col h-full bg-[#0a0e14] dark:bg-[#0a0e14] bg-background">
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
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground"
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
                  "px-2 text-[10px] uppercase tracking-wider transition-colors font-mono",
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
              "h-7 px-2 text-[10px] uppercase tracking-wider border transition-colors font-mono flex items-center gap-1",
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
              className="px-2 h-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
              title="Copy visible logs"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={downloadLogs}
              className="px-2 h-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
              title="Download logs"
            >
              <Download size={12} />
            </button>
            <button
              onClick={handleClear}
              className="px-2 h-full flex items-center justify-center text-muted-foreground/60 hover:text-destructive transition-colors"
              title="Clear logs"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Process tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/30 bg-[#0c1219] dark:bg-[#0c1219] bg-muted/20 shrink-0 overflow-x-auto">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1 font-semibold shrink-0 font-mono">
          Process:
        </span>
        <button
          onClick={() => { navigate('/logs'); selectProcess('all'); }}
          className={cn(
            "px-2 py-0.5 text-[11px] font-mono transition-colors cursor-pointer shrink-0 border",
            selectedProcessId === "all"
              ? "bg-primary/10 border-primary/40 text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-subtle/30",
          )}
        >
          All
        </button>
        {processEntries.map((p) => (
          <button
            key={p.id}
            onClick={() => { navigate(`/logs/${encodeURIComponent(p.name)}`); selectProcess(p.id); }}
            className={cn(
              "px-2 py-0.5 text-[11px] font-mono transition-colors max-w-[120px] truncate cursor-pointer shrink-0 border",
              selectedProcessId === p.id
                ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-subtle/30",
            )}
          >
            <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle", getAppColor(p.name, isDark).replace("text-", "bg-"))} />
            {p.name}
          </button>
        ))}
      </div>

      {/* Log content */}
      <div
        ref={parentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto font-mono text-[13px] leading-[1.55] bg-[#0a0e14] dark:bg-[#0a0e14]"
        style={{ fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" }}
      >
        {processEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 select-none">
            <Terminal size="36" className="opacity-20" />
            <p className="text-sm font-semibold uppercase tracking-wider">No processes running</p>
            <p className="text-xs opacity-40">Start a PM2 process to see logs here</p>
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
                  key={`${log.ts}-${log.processId}-${vr.index}`}
                  className={cn(
                    "flex items-center gap-0 px-4 hover:bg-white/[0.02] dark:hover:bg-white/[0.02] transition-colors group absolute left-0 w-full overflow-hidden",
                    isErr && "bg-destructive/[0.03] dark:bg-destructive/[0.04]",
                  )}
                  style={{ top: vr.start, height: vr.size }}
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
                    className={cn(
                      "flex-1 min-w-0 whitespace-nowrap overflow-hidden text-ellipsis leading-[22px]",
                      isErr ? "text-red-400/90 dark:text-red-400/90" : "text-[#c9d1d9] dark:text-[#c9d1d9] text-foreground",
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

      {/* Bottom bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-t border-border/30 bg-[#0c1219] dark:bg-[#0c1219] bg-muted/20 shrink-0">
        {!autoScroll && !paused && (
          <button
            onClick={scrollToBottom}
            className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary hover:text-primary-hover font-semibold transition-colors"
          >
            <span>↓</span>
            <span>Scroll to bottom</span>
          </button>
        )}
        {paused && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-warning font-semibold">
            <span>⏸</span>
            <span>Paused</span>
          </span>
        )}
       
      </div>
    </div>
  );
}

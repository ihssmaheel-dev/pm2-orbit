import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Pause,
  Play,
  Download,
  Trash2,
  Search,
  Copy,
  Terminal,
} from "lucide-react";
import { useLogsStore, type LogEntry } from "@/store/logs";
import { useProcessStore } from "@/store/processes";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";

type StreamFilter = "all" | "stdout" | "stderr";

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function highlightMatch(text: string, query: string) {
  if (!query) return [{ text, highlight: false as const }];

  try {
    const regex = new RegExp(`(${query})`, "gi");
    const parts: Array<{ text: string; highlight: boolean }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, match.index),
          highlight: false,
        });
      }
      parts.push({ text: match[0], highlight: true });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlight: false });
    }

    return parts;
  } catch {
    return [{ text, highlight: false as const }];
  }
}

function LogLine({
  log,
  searchQuery,
  showProcess,
  isLast,
}: {
  log: LogEntry;
  searchQuery: string;
  showProcess: boolean;
  isLast: boolean;
}) {
  const parts = highlightMatch(log.message, searchQuery);
  const isStdErr = log.stream === "stderr";

  return (
    <div
      className={cn(
        "flex gap-2 px-4 py-0.5 hover:bg-subtle transition-colors leading-5",
        isStdErr && "bg-destructive/5",
        isLast && "mb-0",
      )}
    >
      <span className="text-muted-foreground shrink-0 w-[90px] text-right tabular-nums select-none">
        {formatTime(log.ts)}
      </span>
      <span
        className={cn(
          "shrink-0 w-[44px] text-[10px] uppercase tracking-wider font-semibold select-none",
          isStdErr ? "text-destructive" : "text-primary",
        )}
      >
        {log.stream === "stderr" ? "ERR" : "OUT"}
      </span>
      {showProcess && (
        <span className="shrink-0 w-[100px] truncate text-accent select-none">
          {log.processName}
        </span>
      )}
      <span
        className={cn(
          "flex-1 min-w-0 whitespace-pre-wrap break-all",
          isStdErr ? "text-destructive" : "text-foreground",
        )}
      >
        {parts.map((part, j) =>
          part.highlight ? (
            <span
              key={j}
              className="bg-primary/30 text-primary rounded-[1px] px-0.5"
            >
              {part.text}
            </span>
          ) : (
            <span key={j}>{part.text}</span>
          ),
        )}
      </span>
    </div>
  );
}

const VIEW_VERSION = "__log_viewer_version_1";

export function LogViewer() {
  const paused = useLogsStore((s) => s.paused);
  const setPaused = useLogsStore((s) => s.setPaused);
  const clearLogs = useLogsStore((s) => s.clearLogs);
  const addLog = useLogsStore((s) => s.addLog);
  const buffers = useLogsStore((s) => s.buffers);
  const processes = useProcessStore((s) => s.processes);

  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamFilter, setStreamFilter] = useState<StreamFilter>("all");
  const [selectedProcessId, setSelectedProcessId] = useState<number | "all">(
    "all",
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourcesRef = useRef<Map<number, EventSource>>(new Map());
  const prevProcessCountRef = useRef(0);

  const processEntries = useMemo(() => {
    const entries: { id: number; name: string }[] = [];
    for (const proc of processes.values()) {
      entries.push({ id: proc.id, name: proc.name });
    }
    return entries;
  }, [processes]);

  const processIds = useMemo(
    () => processEntries.map((p) => p.id).sort((a, b) => a - b).join(","),
    [processEntries],
  );

  useEffect(() => {
    for (const entry of processEntries) {
      if (!eventSourcesRef.current.has(entry.id)) {
        const es = new EventSource(`/api/logs/${entry.id}`);
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            addLog({
              ts: data.ts,
              processId: entry.id,
              processName: entry.name,
              stream: data.stream,
              message: data.message,
            });
          } catch {
            // ignore
          }
        };
        eventSourcesRef.current.set(entry.id, es);
      }
    }

    const prevCount = prevProcessCountRef.current;
    prevProcessCountRef.current = processEntries.length;

    return () => {
      if (processEntries.length === 0) {
        for (const es of eventSourcesRef.current.values()) {
          es.close();
        }
        eventSourcesRef.current.clear();
      } else if (prevCount !== processEntries.length) {
        const currentIds = new Set(processEntries.map((p) => p.id));
        for (const [id, es] of eventSourcesRef.current.entries()) {
          if (!currentIds.has(id)) {
            es.close();
            eventSourcesRef.current.delete(id);
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processIds]);

  const allLogs = useMemo(() => {
    const result: LogEntry[] = [];
    for (const [processId, entries] of buffers) {
      const name =
        processEntries.find((p) => p.id === processId)?.name ||
        `PID ${processId}`;
      for (const e of entries) {
        result.push({ ...e, processName: name });
      }
    }
    result.sort((a, b) => a.ts - b.ts);
    return result;
  }, [buffers, processEntries]);

  const filteredLogs = useMemo(() => {
    let filtered = allLogs;

    if (selectedProcessId !== "all") {
      filtered = filtered.filter((l) => l.processId === selectedProcessId);
    }
    if (streamFilter !== "all") {
      filtered = filtered.filter((l) => l.stream === streamFilter);
    }
    if (searchQuery) {
      try {
        const regex = new RegExp(searchQuery, "i");
        filtered = filtered.filter((l) => regex.test(l.message));
      } catch {
        // bad regex
      }
    }
    return filtered;
  }, [allLogs, selectedProcessId, streamFilter, searchQuery]);

  const showProcessColumn =
    selectedProcessId === "all" && processEntries.length > 1;

  const totalLogCount = allLogs.length;
  const filteredLogCount = filteredLogs.length;

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const downloadLogs = useCallback(() => {
    const text = filteredLogs
      .map(
        (log) =>
          `[${new Date(log.ts).toISOString()}] [${log.processName}] [${log.stream}] ${log.message}`,
      )
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
      .map(
        (log) =>
          `[${formatDate(log.ts)} ${formatTime(log.ts)}] [${log.processName}] [${log.stream}] ${log.message}`,
      )
      .join("\n");

    navigator.clipboard.writeText(text);
  }, [filteredLogs]);

  const handleClear = useCallback(() => {
    clearLogs();
    setAutoScroll(true);
  }, [clearLogs]);

  const isLogEmpty = filteredLogs.length === 0;

  return (
    <div className="flex flex-col h-full" data-version={VIEW_VERSION}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0 bg-card">
        <Terminal size={14} className="text-primary" />
        <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
          Logs
        </span>
        {totalLogCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ({filteredLogCount.toLocaleString()})
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search
              size={13}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              placeholder="Regex filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-52 bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground pl-7 pr-2 focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground px-1"
              >
                &times;
              </button>
            )}
          </div>

          <div className="flex border border-border h-7">
            {(["all", "stdout", "stderr"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStreamFilter(s)}
                className={cn(
                  "px-2 text-[10px] uppercase tracking-wider",
                  "hover:bg-subtle transition-colors",
                  streamFilter === s
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground",
                )}
              >
                {s === "all" ? "All" : s === "stdout" ? "OUT" : "ERR"}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaused(!paused)}
            className="h-7 px-2 text-[10px]"
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? "Resume" : "Pause"}
          </Button>

          <div className="flex border border-border h-7">
            <button
              onClick={copyLogs}
              className="px-2 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Copy all visible logs"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={downloadLogs}
              className="px-2 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Download as .txt"
            >
              <Download size={13} />
            </button>
            <button
              onClick={handleClear}
              className="px-2 h-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              title="Clear all logs"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border/50 bg-muted/30 shrink-0">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-2 font-semibold">
          Process:
        </span>
        <button
          onClick={() => setSelectedProcessId("all")}
          className={cn(
            "px-2 py-0.5 text-[11px] rounded-sm transition-colors cursor-pointer",
            selectedProcessId === "all"
              ? "bg-primary/15 text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground hover:bg-subtle",
          )}
        >
          All ({totalLogCount.toLocaleString()})
        </button>
        {processEntries.map((p) => {
          const count = buffers.get(p.id)?.length || 0;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProcessId(p.id)}
              className={cn(
                "px-2 py-0.5 text-[11px] rounded-sm transition-colors max-w-[120px] truncate cursor-pointer",
                selectedProcessId === p.id
                  ? "bg-primary/15 text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-subtle",
              )}
            >
              {p.name}
              {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto font-mono text-xs bg-card"
      >
        {processEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Terminal size={32} className="opacity-30" />
            <p className="text-sm">No processes running</p>
            <p className="text-xs opacity-60">
              Start a PM2 process to see logs here
            </p>
          </div>
        ) : isLogEmpty ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <span>
              {totalLogCount > 0
                ? searchQuery ||
                  streamFilter !== "all" ||
                  selectedProcessId !== "all"
                  ? "No logs match the current filters"
                  : "No logs yet. Waiting for log output..."
                : "No logs yet. Waiting for log output..."}
            </span>
          </div>
        ) : (
          <div className="py-1">
            {filteredLogs.map((log, i) => (
              <LogLine
                key={`${log.ts}-${log.processId}-${log.stream}-${i}`}
                log={log}
                searchQuery={searchQuery}
                showProcess={showProcessColumn}
                isLast={i === filteredLogs.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 px-4 py-1 border-t border-border bg-muted/30 shrink-0">
        {!autoScroll && !paused && (
          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="text-[10px] uppercase tracking-wider text-primary hover:text-primary-hover font-semibold"
          >
            &#8595; Scroll to bottom
          </button>
        )}
        {paused && (
          <span className="text-[10px] uppercase tracking-wider text-warning font-semibold">
            &#9208; Paused
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {filteredLogCount.toLocaleString()} / {totalLogCount.toLocaleString()}{" "}
          entries
        </span>
      </div>
    </div>
  );
}

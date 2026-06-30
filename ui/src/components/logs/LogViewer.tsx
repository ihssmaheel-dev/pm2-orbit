import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import {
  Pause,
  Play,
  Download,
  Trash2,
  Search,
  Copy,
  Terminal,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLogsStore, type LogEntry } from "@/store/logs";
import { useProcessStore } from "@/store/processes";
import { Button } from "@/components/shared/Button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type StreamFilter = "all" | "stdout" | "stderr";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

const LogLine = memo(function LogLine({
  log,
  showProcess,
  style,
}: {
  log: LogEntry;
  showProcess: boolean;
  style?: React.CSSProperties;
}) {
  const isStdErr = log.stream === "stderr";
  return (
    <div
      style={style}
      className={cn(
        "flex gap-2 px-4 py-0.5 hover:bg-subtle leading-5 truncate",
        isStdErr && "bg-destructive/5",
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
        {isStdErr ? "ERR" : "OUT"}
      </span>
      {showProcess && (
        <span className="shrink-0 w-[100px] truncate text-accent select-none">
          {log.processName}
        </span>
      )}
      <span
        className={cn(
          "flex-1 min-w-0 truncate",
          isStdErr ? "text-destructive" : "text-foreground",
        )}
      >
        {log.message}
      </span>
    </div>
  );
});

export function LogViewer({ initialProcessName = "" }: { initialProcessName?: string }) {
  const paused = useLogsStore((s) => s.paused);
  const setPaused = useLogsStore((s) => s.setPaused);
  const clearLogs = useLogsStore((s) => s.clearLogs);
  const processes = useProcessStore((s) => s.processes);

  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [streamFilter, setStreamFilter] = useState<StreamFilter>("all");
  const [selectedProcessId, setSelectedProcessId] = useState<number | "all">("all");

  const maxVisible = selectedProcessId === "all" ? 5000 : 50000;
  const MAX_VISIBLE_LOGS = maxVisible;

  const parentRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const navigate = useNavigate();

  autoScrollRef.current = autoScroll;

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
    const es = new EventSource('/api/logs/stream');
    es.onmessage = (event) => {
      try {
        const raw = event.data as string;
        if (!raw || raw.startsWith(':')) return;
        const addLog = useLogsStore.getState().addLog;
        if (raw.startsWith('{')) {
          const data = JSON.parse(raw);
          addLog({ ts: data.ts, processId: data.processId, processName: data.processName, stream: data.stream, message: data.message });
        } else {
          const lines = raw.split('\n');
          for (const line of lines) {
            if (!line) continue;
            try {
              const data = JSON.parse(line);
              addLog({ ts: data.ts, processId: data.processId, processName: data.processName, stream: data.stream, message: data.message });
            } catch {}
          }
        }
      } catch {}
    };
    return () => { es.close(); };
  }, []);

  const selectedBuffer = useLogsStore(
    (s) => selectedProcessId === "all" ? s.buffers : (s.buffers.get(selectedProcessId) ?? null),
  );

  const processEntries = useMemo(() => {
    const entries: { id: number; name: string }[] = [];
    for (const proc of processes.values()) {
      entries.push({ id: proc.id, name: proc.name });
    }
    return entries;
  }, [processes]);

  const totalBufferSizes = useMemo(() => {
    if (selectedBuffer === null) return 0;
    if (Array.isArray(selectedBuffer)) return selectedBuffer.length;
    let total = 0;
    for (const entries of selectedBuffer.values()) total += entries.length;
    return total;
  }, [selectedBuffer]);

  const filteredLogs = useMemo(() => {
    const maxBeforeFilter = MAX_VISIBLE_LOGS + 10000;
    const result: LogEntry[] = [];
    const source: [number, LogEntry[]][] = [];

    if (selectedBuffer === null) return result;

    if (Array.isArray(selectedBuffer)) {
      source.push([selectedProcessId as number, selectedBuffer]);
    } else {
      for (const [pid, entries] of selectedBuffer) {
        if (selectedProcessId !== "all" && pid !== selectedProcessId) continue;
        if (entries.length === 0) continue;
        source.push([pid, entries]);
      }
    }

    if (source.length === 0) return result;

    const nameByPid = new Map(processEntries.map((p) => [p.id, p.name]));

    let collected = 0;

    for (const [pid, entries] of source) {
      const name = nameByPid.get(pid) || `PID ${pid}`;
      const limit = Math.min(entries.length, maxBeforeFilter - collected);
      const start = entries.length - limit;
      for (let i = start; i < entries.length; i++) {
        const e = entries[i];
        result.push(e.processName === name ? e : { ...e, processName: name });
      }
      collected += limit;
      if (collected >= maxBeforeFilter) break;
    }

    if (selectedProcessId === "all" && result.length > 10000) {
      result.sort((a, b) => a.ts - b.ts);
    }

    let filtered = result;
    if (streamFilter !== "all") {
      filtered = filtered.filter((l) => l.stream === streamFilter);
    }
    if (searchQuery) {
      try {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter((l) => l.message.toLowerCase().includes(q));
      } catch {}
    }

    if (filtered.length > MAX_VISIBLE_LOGS) {
      filtered = filtered.slice(filtered.length - MAX_VISIBLE_LOGS);
    }

    return filtered;
  }, [selectedBuffer, processEntries, selectedProcessId, streamFilter, searchQuery]);

  const showProcessColumn = selectedProcessId === "all" && processEntries.length > 1;

  const virtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 24,
    overscan: 20,
  });

  useEffect(() => {
    if (autoScrollRef.current && parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  const handleScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  }, []);

  const downloadLogs = useCallback(() => {
    const text = filteredLogs.map((log) => `[${new Date(log.ts).toISOString()}] [${log.processName}] [${log.stream}] ${log.message}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pm2-orbit-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const copyLogs = useCallback(() => {
    const text = filteredLogs.map((log) => `[${new Date(log.ts).toISOString()}] [${log.processName}] [${log.stream}] ${log.message}`).join("\n");
    navigator.clipboard.writeText(text);
  }, [filteredLogs]);

  const handleClear = useCallback(() => {
    clearLogs();
    autoScrollRef.current = true;
    setAutoScroll(true);
  }, [clearLogs]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0 bg-card">
        <Terminal size={14} className="text-primary" />
        <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Logs</span>
        {filteredLogs.length > 0 && (
          <span className="text-xs text-muted-foreground">({filteredLogs.length.toLocaleString()})</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 w-40 bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground pl-7 pr-2 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex border border-border h-7">
            {(["all", "stdout", "stderr"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStreamFilter(s)}
                className={cn("px-2 text-[10px] uppercase tracking-wider hover:bg-subtle transition-colors", streamFilter === s ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground")}
              >
                {s === "all" ? "All" : s === "stdout" ? "OUT" : "ERR"}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={() => setPaused(!paused)} className="h-7 px-2 text-[10px]">
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? "Resume" : "Pause"}
          </Button>

          <div className="flex border border-border h-7">
            <button onClick={copyLogs} className="px-2 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Copy visible logs"><Copy size={13} /></button>
            <button onClick={downloadLogs} className="px-2 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" title="Download"><Download size={13} /></button>
            <button onClick={handleClear} className="px-2 h-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors" title="Clear"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border/50 bg-muted/30 shrink-0 overflow-x-auto">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-2 font-semibold shrink-0">Process:</span>
        <button
          onClick={() => navigate('/logs')}
          className={cn("px-2 py-0.5 text-[11px] rounded-sm transition-colors cursor-pointer shrink-0", selectedProcessId === "all" ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-subtle")}
        >
          All ({totalBufferSizes.toLocaleString()})
        </button>
        {processEntries.map((p) => {
          const count = useLogsStore.getState().buffers.get(p.id)?.length || 0;
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/logs/${encodeURIComponent(p.name)}`)}
              className={cn("px-2 py-0.5 text-[11px] rounded-sm transition-colors max-w-[120px] truncate cursor-pointer shrink-0", selectedProcessId === p.id ? "bg-primary/15 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-subtle")}
            >
              {p.name}
              {count > 0 && <span className="ml-1 opacity-60">({count.toLocaleString()})</span>}
            </button>
          );
        })}
      </div>

      <div ref={parentRef} onScroll={handleScroll} className="flex-1 overflow-auto font-mono text-xs bg-card">
        {processEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <Terminal size={32} className="opacity-30" />
            <p className="text-sm">No processes running</p>
            <p className="text-xs opacity-60">Start a PM2 process to see logs here</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            {paused ? "Stream paused" : totalBufferSizes > 0 ? "No logs match the current filters" : "Waiting for log output..."}
          </div>
        ) : (
          <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
            {virtualizer.getVirtualItems().map((vr) => (
              <LogLine
                key={vr.index}
                log={filteredLogs[vr.index]}
                showProcess={showProcessColumn}
                style={{
                  position: "absolute",
                  top: vr.start,
                  left: 0,
                  width: "100%",
                  height: vr.size,
                }}
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
              if (parentRef.current) parentRef.current.scrollTop = parentRef.current.scrollHeight;
            }}
            className="text-[10px] uppercase tracking-wider text-primary hover:text-primary-hover font-semibold"
          >
            ↓ Scroll to bottom
          </button>
        )}
        {paused && <span className="text-[10px] uppercase tracking-wider text-warning font-semibold">⏸ Paused</span>}
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {filteredLogs.length.toLocaleString()} / {totalBufferSizes.toLocaleString()} entries
        </span>
      </div>
    </div>
  );
}

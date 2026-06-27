import { useState, useRef, useEffect, useMemo } from 'react';
import { Pause, Play, Download, Trash2, Search } from 'lucide-react';
import { useLogsStore } from '@/store/logs';
import { useProcessStore } from '@/store/processes';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';

function getColorForProcess(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const colors = ['text-primary', 'text-accent', 'text-success', 'text-warning', 'text-destructive'];
  return colors[Math.abs(hash) % colors.length];
}

function getLevelColor(line: string): string {
  const upper = line.toUpperCase();
  if (upper.includes('ERROR') || upper.includes('ERR') || upper.includes('FATAL')) return 'text-destructive';
  if (upper.includes('WARN') || upper.includes('WARNING')) return 'text-warning';
  return 'text-muted-foreground';
}

function highlightMatch(text: string, query: string): { parts: Array<{ text: string; highlight: boolean }> } {
  if (!query) return { parts: [{ text, highlight: false }] };

  try {
    const regex = new RegExp(`(${query})`, 'gi');
    const parts: Array<{ text: string; highlight: boolean }> = [];
    let lastIndex = 0;

    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
      }
      parts.push({ text: match[0], highlight: true });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), highlight: false });
    }

    return { parts };
  } catch {
    return { parts: [{ text, highlight: false }] };
  }
}

export function LogViewer() {
  const logs = useLogsStore((s) => s.getAllLogs());
  const paused = useLogsStore((s) => s.paused);
  const setPaused = useLogsStore((s) => s.setPaused);
  const clearLogs = useLogsStore((s) => s.clearLogs);
  const processes = useProcessStore((s) => s.processes);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const processNames = useMemo(() => {
    const names = new Map<number, string>();
    for (const proc of processes.values()) {
      names.set(proc.id, proc.name);
    }
    return names;
  }, [processes]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    try {
      const regex = new RegExp(searchQuery, 'i');
      return logs.filter((log) => regex.test(log.message));
    } catch {
      return logs;
    }
  }, [logs, searchQuery]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const downloadLogs = () => {
    const text = filteredLogs
      .map((log) => {
        const name = processNames.get(0) || 'unknown';
        return `[${new Date(log.ts).toISOString()}] [${name}] ${log.message}`;
      })
      .join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pm2-orbit-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
        <span className="text-sm text-muted-foreground uppercase tracking-wider">
          Logs ({filteredLogs.length})
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Regex search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-60 h-8 text-xs pl-8"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
            {paused ? 'Resume' : 'Pause'}
          </Button>

          <Button variant="ghost" size="sm" onClick={downloadLogs}>
            <Download size={14} />
          </Button>

          <Button variant="ghost" size="sm" onClick={() => clearLogs()}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto font-mono text-xs bg-card"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No logs yet. Waiting for log output...
          </div>
        ) : (
          filteredLogs.map((log, i) => {
            const processName = processNames.get(log.processId) || `PID ${log.processId}`;
            const colorClass = getColorForProcess(processName);
            const levelColor = getLevelColor(log.message);
            const { parts } = highlightMatch(log.message, searchQuery);

            return (
              <div key={i} className="flex gap-2 px-4 py-0.5 hover:bg-subtle">
                <span className="text-muted-foreground shrink-0 w-[140px]">
                  {new Date(log.ts).toLocaleTimeString()}
                </span>
                <span className={`shrink-0 w-[100px] truncate ${colorClass}`}>
                  {processName}
                </span>
                <span className={`${levelColor} flex-1`}>
                  {parts.map((part, j) =>
                    part.highlight ? (
                      <span key={j} className="bg-primary/30 text-primary">{part.text}</span>
                    ) : (
                      <span key={j}>{part.text}</span>
                    ),
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {paused && (
        <div className="px-4 py-1 bg-warning-subtle text-warning text-xs text-center border-t border-border">
          Paused — logs are still being collected
        </div>
      )}
    </div>
  );
}

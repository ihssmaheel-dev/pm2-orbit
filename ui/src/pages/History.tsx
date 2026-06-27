import { useState, useEffect, useMemo } from 'react';
import { useProcessStore } from '@/store/processes';
import { CpuChart, MemoryChart } from '@/components/charts/Charts';

interface ProcessHistory {
  ts: number;
  cpu: number;
  memory: number;
}

interface SystemHistory {
  ts: number;
  cpu: number;
  memoryUsed: number;
  memoryTotal: number;
  load1: number;
  load5: number;
  load15: number;
}

type TimeRange = '1h' | '6h' | '24h';

export function History() {
  const processes = useProcessStore((s) => s.processes);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [systemHistory, setSystemHistory] = useState<SystemHistory[]>([]);
  const [systemLoading, setSystemLoading] = useState(true);
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [processHistory, setProcessHistory] = useState<ProcessHistory[]>([]);
  const [processLoading, setProcessLoading] = useState(false);

  const processList = useMemo(() => Array.from(processes.values()), [processes]);

  useEffect(() => {
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
    setSystemLoading(true);
    fetch(`/api/history/system?hours=${hours}`)
      .then((res) => res.json())
      .then((data) => { setSystemHistory(data); setSystemLoading(false); })
      .catch(() => { setSystemHistory([]); setSystemLoading(false); });
  }, [timeRange]);

  useEffect(() => {
    if (selectedProcessId === null) {
      setProcessHistory([]);
      return;
    }
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
    setProcessLoading(true);
    fetch(`/api/history/${selectedProcessId}?hours=${hours}`)
      .then((res) => res.json())
      .then((data) => { setProcessHistory(data); setProcessLoading(false); })
      .catch(() => { setProcessHistory([]); setProcessLoading(false); });
  }, [selectedProcessId, timeRange]);

  const cpuData = useMemo(() => ({
    ts: systemHistory.map((r) => r.ts),
    values: systemHistory.map((r) => r.cpu),
  }), [systemHistory]);

  const memData = useMemo(() => ({
    ts: systemHistory.map((r) => r.ts),
    values: systemHistory.map((r) => r.memoryUsed),
  }), [systemHistory]);

  const processCpuData = useMemo(() => ({
    ts: processHistory.map((r) => r.ts),
    values: processHistory.map((r) => r.cpu),
  }), [processHistory]);

  const processMemData = useMemo(() => ({
    ts: processHistory.map((r) => r.ts),
    values: processHistory.map((r) => r.memory),
  }), [processHistory]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-accent rounded-full" />
          <span className="text-sm text-foreground font-medium tracking-wide">HISTORY</span>
        </div>
        <div className="flex items-center gap-2">
          {(['1h', '6h', '24h'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
                timeRange === range
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">System Metrics</h3>
          {systemLoading ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border p-4 h-[160px] flex items-center justify-center">
                <span className="text-xs text-muted-foreground/50">Loading...</span>
              </div>
              <div className="bg-card border border-border p-4 h-[160px] flex items-center justify-center">
                <span className="text-xs text-muted-foreground/50">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border p-4">
                <CpuChart data={cpuData} label="CPU %" />
              </div>
              <div className="bg-card border border-border p-4">
                <MemoryChart data={memData} label="Memory" />
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Process Metrics</h3>
            <select
              value={selectedProcessId ?? ''}
              onChange={(e) => setSelectedProcessId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="h-8 px-2 bg-input border border-border text-foreground text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select process...</option>
              {processList.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (PID {p.pid})</option>
              ))}
            </select>
          </div>

          {selectedProcessId !== null ? (
            processLoading ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border p-4 h-[160px] flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/50">Loading...</span>
                </div>
                <div className="bg-card border border-border p-4 h-[160px] flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/50">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border p-4">
                  <CpuChart data={processCpuData} label="CPU %" />
                </div>
                <div className="bg-card border border-border p-4">
                  <MemoryChart data={processMemData} label="Memory" />
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Select a process to view its history
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

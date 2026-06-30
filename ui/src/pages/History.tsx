import { useState, useEffect, useMemo } from 'react';
import { Activity, BarChart3, AlertCircle, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useProcessStore } from '@/store/processes';
import { CpuChart, MemoryChart, LoadChart } from '@/components/charts/Charts';
import { formatBytes } from '@/lib/format';

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

function fmtPercent(v: number) { return v.toFixed(1) + '%'; }

export function History() {
  const processes = useProcessStore((s) => s.processes);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [systemHistory, setSystemHistory] = useState<SystemHistory[]>([]);
  const [systemLoading, setSystemLoading] = useState(true);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
  const [processHistory, setProcessHistory] = useState<ProcessHistory[]>([]);
  const [processLoading, setProcessLoading] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  const processList = useMemo(() => Array.from(processes.values()), [processes]);

  useEffect(() => {
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
    setSystemLoading(true);
    setSystemError(null);
    api(`/api/history/system?hours=${hours}`, { label: 'History', silent: true })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then((data) => { setSystemHistory(Array.isArray(data) ? data : []); setSystemLoading(false); })
      .catch((err) => { setSystemError(err.message || 'Failed to load history'); setSystemHistory([]); setSystemLoading(false); });
  }, [timeRange]);

  useEffect(() => {
    if (selectedProcessId === null) {
      setProcessHistory([]);
      return;
    }
    const hours = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
    setProcessLoading(true);
    setProcessError(null);
    api(`/api/history/${selectedProcessId}?hours=${hours}`, { label: 'Process history', silent: true })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then((data) => { setProcessHistory(Array.isArray(data) ? data : []); setProcessLoading(false); })
      .catch((err) => { setProcessError(err.message || 'Failed to load process history'); setProcessHistory([]); setProcessLoading(false); });
  }, [selectedProcessId, timeRange]);

  const cpuData = useMemo(() => ({
    ts: systemHistory.map((r) => r.ts),
    values: systemHistory.map((r) => r.cpu),
  }), [systemHistory]);

  const memData = useMemo(() => ({
    ts: systemHistory.map((r) => r.ts),
    values: systemHistory.map((r) => r.memoryTotal > 0 ? Math.round((r.memoryUsed / r.memoryTotal) * 1000) / 10 : 0),
  }), [systemHistory]);

  const loadData = useMemo(() => ({
    ts: systemHistory.map((r) => r.ts),
    load1: systemHistory.map((r) => r.load1),
    load5: systemHistory.map((r) => r.load5),
    load15: systemHistory.map((r) => r.load15),
  }), [systemHistory]);

  const processCpuData = useMemo(() => ({
    ts: processHistory.map((r) => r.ts),
    values: processHistory.map((r) => r.cpu),
  }), [processHistory]);

  const processMemData = useMemo(() => ({
    ts: processHistory.map((r) => r.ts),
    values: processHistory.map((r) => r.memory ? Math.round(r.memory / (1024 * 1024) * 10) / 10 : 0),
  }), [processHistory]);

  const lastSys = systemHistory.length > 0 ? systemHistory[systemHistory.length - 1] : null;
  const maxMem = systemHistory.length > 0 ? Math.max(...systemHistory.map((r) => r.memoryTotal > 0 ? Math.round((r.memoryUsed / r.memoryTotal) * 1000) / 10 : 0)) : 0;
  const maxCpu = systemHistory.length > 0 ? Math.max(...systemHistory.map((r) => r.cpu)) : 0;

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

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* System Metrics */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Activity size={12} /> System Metrics
          </h3>
          {systemLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border border-border p-4 h-[180px] flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/50">Loading...</span>
                </div>
              ))}
            </div>
          ) : systemError ? (
            <div className="flex items-center justify-center h-[160px] bg-card border border-destructive/20 text-muted-foreground gap-2">
              <AlertCircle size={14} className="text-destructive" />
              <span className="text-xs text-destructive">{systemError}</span>
            </div>
          ) : systemHistory.length === 0 ? (
            <div className="flex items-center justify-center h-[160px] bg-card border border-border text-muted-foreground gap-2">
              <BarChart3 size={14} className="opacity-30" />
              <span className="text-xs opacity-60">No history data available</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-card border border-border p-2">
                  <CpuChart data={cpuData} label="CPU %" />
                  {lastSys && (
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1 px-1">
                      <span>Now: {fmtPercent(lastSys.cpu)}</span>
                      <span>Peak: {fmtPercent(maxCpu)}</span>
                    </div>
                  )}
                </div>
                <div className="bg-card border border-border p-3">
                  <MemoryChart data={memData} label="Memory %" />
                  {lastSys && (
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1 px-1">
                      <span>Now: {fmtPercent(lastSys.memoryTotal > 0 ? Math.round((lastSys.memoryUsed / lastSys.memoryTotal) * 1000) / 10 : 0)}</span>
                      <span>Peak: {fmtPercent(maxMem)}</span>
                    </div>
                  )}
                </div>
                <div className="bg-card border border-border p-3">
                  <LoadChart data={loadData} />
                </div>
              </div>
              {lastSys && (
                <div className="flex gap-4 mt-2 text-[11px] text-muted-foreground/70 px-1">
                  <span>Memory: {formatBytes(lastSys.memoryUsed)} / {formatBytes(lastSys.memoryTotal)}</span>
                  <span>Cores: {lastSys.load1 !== undefined ? '—' : ''}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Process Metrics */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 size={12} /> Process Metrics
            </h3>
            <div className="relative">
              <select
                value={selectedProcessId ?? ''}
                onChange={(e) => setSelectedProcessId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="h-8 appearance-none bg-input border border-border text-foreground text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-ring pl-2 pr-8"
              >
                <option value="">Select process...</option>
                {processList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (PID {p.pid})</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/50" />
            </div>
          </div>

          {selectedProcessId !== null ? (
            processLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border p-4 h-[180px] flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/50">Loading...</span>
                  </div>
                ))}
              </div>
            ) : processError ? (
              <div className="flex items-center justify-center h-[160px] bg-card border border-destructive/20 text-muted-foreground gap-2">
                <AlertCircle size={14} className="text-destructive" />
                <span className="text-xs text-destructive">{processError}</span>
              </div>
            ) : processHistory.length === 0 ? (
              <div className="flex items-center justify-center h-[160px] bg-card border border-border text-muted-foreground gap-2">
                <BarChart3 size={14} className="opacity-30" />
                <span className="text-xs opacity-60">No history for this process</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-card border border-border p-2">
                  <CpuChart data={processCpuData} label="CPU %" />
                  {processHistory.length > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1 px-1">
                      <span>Now: {fmtPercent(processHistory[processHistory.length - 1].cpu)}</span>
                      <span>Peak: {fmtPercent(Math.max(...processHistory.map((r) => r.cpu)))}</span>
                    </div>
                  )}
                </div>
                <div className="bg-card border border-border p-3">
                  <MemoryChart data={processMemData} label="Memory (MB)" />
                  {processHistory.length > 0 && (
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1 px-1">
                      <span>Now: {processHistory[processHistory.length - 1].memory} bytes</span>
                      <span>Peak: {formatBytes(Math.max(...processHistory.map((r) => r.memory)))}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <Activity size={24} className="opacity-30" />
              <span className="text-sm opacity-70">Select a process to view its history</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

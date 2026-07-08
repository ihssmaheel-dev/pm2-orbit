import { memo, useState } from 'react';
import type { ProcessStatus } from '@/types/pm2';

const STATUS_COLORS: Record<ProcessStatus, string> = {
  online: '#22c55e',
  stopped: '#64748b',
  errored: '#ef4444',
  launching: '#eab308',
  stopping: '#eab308',
};

interface StatusSegment {
  status: ProcessStatus;
  start: number;
  end: number;
}

function buildSegments(history: { ts: number; status: ProcessStatus }[]): StatusSegment[] {
  if (history.length === 0) return [];

  const now = Date.now();
  const segs: StatusSegment[] = [];

  for (let i = 0; i < history.length; i++) {
    const start = history[i].ts;
    const end = i < history.length - 1 ? history[i + 1].ts : now;
    segs.push({ status: history[i].status, start, end });
  }

  return segs;
}

function calcUptimePercent(history: { ts: number; status: ProcessStatus }[]): number {
  if (history.length === 0) return 0;
  const now = Date.now();
  const totalSpan = now - history[0].ts;
  if (totalSpan <= 0) return 100;

  let uptimeMs = 0;
  for (let i = 0; i < history.length; i++) {
    const end = i < history.length - 1 ? history[i + 1].ts : now;
    if (history[i].status === 'online') {
      uptimeMs += end - history[i].ts;
    }
  }
  return Math.round((uptimeMs / totalSpan) * 1000) / 10;
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

interface UptimeBarProps {
  history: { ts: number; status: ProcessStatus }[];
  height?: number;
}

export const UptimeBar = memo(function UptimeBar({ history, height = 20 }: UptimeBarProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (history.length === 0) {
    return (
      <div className="bg-subtle/30 border border-border/30 flex items-center justify-center" style={{ height }}>
        <span className="text-[10px] text-muted-foreground/30">No status history</span>
      </div>
    );
  }

  const now = Date.now();
  const start = history[0].ts;
  const totalSpan = now - start;
  const segments = buildSegments(history);
  const uptimePct = calcUptimePercent(history);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Uptime</span>
        <span className={`text-[11px] font-mono font-medium ${uptimePct >= 99 ? 'text-green-500' : uptimePct >= 95 ? 'text-yellow-500' : 'text-destructive'}`}>
          {uptimePct}%
        </span>
      </div>
      <div
        className="relative bg-subtle/30 border border-border/30 overflow-hidden cursor-crosshair"
        style={{ height }}
        onMouseLeave={() => setHovered(null)}
      >
        {segments.map((seg, i) => {
          const left = ((seg.start - start) / totalSpan) * 100;
          const width = Math.max(((seg.end - seg.start) / totalSpan) * 100, 0.3);
          const isHovered = hovered === i;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 transition-opacity"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: STATUS_COLORS[seg.status],
                opacity: isHovered ? 1 : 0.7,
              }}
              onMouseEnter={() => setHovered(i)}
            />
          );
        })}
      </div>
      {hovered !== null && segments[hovered] && (
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: STATUS_COLORS[segments[hovered].status] }} />
            {segments[hovered].status}
          </span>
          <span>{new Date(segments[hovered].start).toLocaleTimeString()}</span>
          <span>{formatMs(segments[hovered].end - segments[hovered].start)}</span>
        </div>
      )}
      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground/50">
        <span>{new Date(start).toLocaleDateString()}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 opacity-70" /> Online</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-500 opacity-70" /> Stopped</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 opacity-70" /> Errored</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-500 opacity-70" /> Launching</span>
        </span>
      </div>
    </div>
  );
});

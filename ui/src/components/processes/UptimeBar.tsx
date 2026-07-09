import { memo, useState, useMemo, useCallback, useRef } from 'react';
import type { ProcessStatus } from '@/types/pm2';

const STATUS_COLORS: Record<ProcessStatus, string> = {
  online: '#22c55e',
  stopped: '#64748b',
  errored: '#ef4444',
  launching: '#eab308',
  stopping: '#eab308',
};

const STATUS_LABELS: Record<ProcessStatus, string> = {
  online: 'Online',
  stopped: 'Stopped',
  errored: 'Errored',
  launching: 'Launching',
  stopping: 'Stopping',
};

interface StatusSegment {
  status: ProcessStatus;
  start: number;
  end: number;
}

function buildSegments(history: { ts: number; status: ProcessStatus }[], now: number): StatusSegment[] {
  if (history.length === 0) return [];
  const segs: StatusSegment[] = [];
  for (let i = 0; i < history.length; i++) {
    const start = history[i].ts;
    const end = i < history.length - 1 ? history[i + 1].ts : now;
    segs.push({ status: history[i].status, start, end });
  }
  return segs;
}

function calcUptimePercent(history: { ts: number; status: ProcessStatus }[], now: number): number {
  if (history.length === 0) return 0;
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

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface UptimeBarProps {
  history: { ts: number; status: ProcessStatus }[];
  height?: number;
}

export const UptimeBar = memo(function UptimeBar({ history, height = 20 }: UptimeBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [cursorX, setCursorX] = useState<number | null>(null);
  const [hoveredSeg, setHoveredSeg] = useState<number | null>(null);

  const { segments, uptimePct, start, totalSpan } = useMemo(() => {
    if (history.length === 0) {
      return { segments: [], uptimePct: 0, start: 0, totalSpan: 1 };
    }
    const now = Date.now();
    const s = history[0].ts;
    const span = Math.max(now - s, 1);
    return {
      segments: buildSegments(history, now),
      uptimePct: calcUptimePercent(history, now),
      start: s,
      totalSpan: span,
    };
  }, [history]);

  // Find which segment the cursor is over and the timestamp at cursor position
  const cursorInfo = useMemo(() => {
    if (cursorX === null || !barRef.current || totalSpan <= 0) return null;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (cursorX - rect.left) / rect.width));
    const ts = start + pct * totalSpan;
    // Find the segment at this timestamp
    let segIdx = 0;
    for (let i = 0; i < segments.length; i++) {
      if (ts >= segments[i].start && ts < segments[i].end) {
        segIdx = i;
        break;
      }
      if (i === segments.length - 1) segIdx = i;
    }
    const seg = segments[segIdx];
    const segPct = seg ? ((ts - seg.start) / (seg.end - seg.start)) * 100 : 0;
    return { ts, segIdx, seg, pct, segPct };
  }, [cursorX, segments, start, totalSpan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCursorX(e.clientX);
    setHoveredSeg(cursorInfo?.segIdx ?? null);
  }, [cursorInfo?.segIdx]);

  const handleMouseLeave = useCallback(() => {
    setCursorX(null);
    setHoveredSeg(null);
  }, []);

  if (history.length === 0) {
    return (
      <div className="bg-subtle/30 border border-border/30 flex items-center justify-center" style={{ height }}>
        <span className="text-[10px] text-muted-foreground/30">No status history</span>
      </div>
    );
  }

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">Uptime</span>
        <span className={`text-[11px] font-mono font-medium ${uptimePct >= 99 ? 'text-success' : uptimePct >= 95 ? 'text-warning' : 'text-destructive'}`}>
          {uptimePct}%
        </span>
      </div>

      {/* Bar container */}
      <div
        ref={barRef}
        className="relative bg-subtle/30 border border-border/30 overflow-hidden"
        style={{ height, cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Status segments */}
        {segments.map((seg, i) => {
          const left = ((seg.start - start) / totalSpan) * 100;
          const width = Math.max(((seg.end - seg.start) / totalSpan) * 100, 0.3);
          const isActive = hoveredSeg === i;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 transition-all duration-75"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: STATUS_COLORS[seg.status],
                opacity: hoveredSeg !== null ? (isActive ? 1 : 0.4) : 0.7,
                boxShadow: isActive ? `inset 0 0 0 1px rgba(255,255,255,0.3)` : 'none',
              }}
            />
          );
        })}

        {/* Crosshair line */}
        {cursorInfo && (
          <div
            className="absolute top-0 bottom-0 w-px pointer-events-none z-10"
            style={{
              left: `${cursorInfo.pct * 100}%`,
              backgroundColor: 'var(--foreground)',
              opacity: 0.6,
            }}
          />
        )}
      </div>

      {/* Tooltip — positioned near cursor */}
      {cursorInfo && (
        <div
          className="pointer-events-none absolute z-20 mt-1 border border-border/50 bg-card/95 px-2 py-1.5 text-[10px] shadow-lg backdrop-blur-sm"
          style={{
            left: `${Math.max(80, Math.min(cursorInfo.pct * 100, 92))}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: STATUS_COLORS[cursorInfo.seg.status] }}
            />
            <span className="font-medium text-foreground">{STATUS_LABELS[cursorInfo.seg.status]}</span>
          </div>
          <div className="font-mono text-muted-foreground/70 space-y-0.5">
            <div>{formatDate(cursorInfo.ts)} {formatTime(cursorInfo.ts)}</div>
            <div>Duration: {formatMs(cursorInfo.seg.end - cursorInfo.seg.start)}</div>
          </div>
        </div>
      )}

      {/* Hover info row (shown when not using absolute tooltip) */}
      {cursorInfo === null && (
        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/50">
          <span>{formatDate(start)}</span>
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm opacity-70" style={{ backgroundColor: STATUS_COLORS.online }} /> Online</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm opacity-70" style={{ backgroundColor: STATUS_COLORS.stopped }} /> Stopped</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm opacity-70" style={{ backgroundColor: STATUS_COLORS.errored }} /> Errored</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm opacity-70" style={{ backgroundColor: STATUS_COLORS.launching }} /> Launching</span>
          </span>
        </div>
      )}
    </div>
  );
});

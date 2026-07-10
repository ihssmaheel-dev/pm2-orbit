import { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

interface UptimeBarProps {
  history: { ts: number; status: ProcessStatus }[];
  height?: number;
}

interface CursorInfo {
  segIdx: number;
  seg: StatusSegment;
  pct: number;
}

export const UptimeBar = memo(function UptimeBar({ history, height = 20 }: UptimeBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const cursorInfoRef = useRef<CursorInfo | null>(null);
  const [cursorInfo, setCursorInfo] = useState<CursorInfo | null>(null);

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

  // Crosshair line position (updates on mouse move without re-render)
  const [crosshairPct, setCrosshairPct] = useState<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!barRef.current || totalSpan <= 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Update crosshair position directly (no re-render needed)
    setCrosshairPct(pct * 100);

    // Find segment at cursor
    const ts = start + pct * totalSpan;
    let segIdx = 0;
    for (let i = 0; i < segments.length; i++) {
      if (ts >= segments[i].start && ts < segments[i].end) {
        segIdx = i;
        break;
      }
      if (i === segments.length - 1) segIdx = i;
    }

    const seg = segments[segIdx];
    if (!seg) return;

    const newInfo: CursorInfo = { segIdx, seg, pct: pct * 100 };
    // Only update state if segment changed (prevents re-render on every pixel)
    const prev = cursorInfoRef.current;
    if (!prev || prev.segIdx !== newInfo.segIdx) {
      cursorInfoRef.current = newInfo;
      setCursorInfo(newInfo);
    } else {
      cursorInfoRef.current = newInfo;
    }
  }, [segments, start, totalSpan]);

  const handleMouseLeave = useCallback(() => {
    setCrosshairPct(null);
    setCursorInfo(null);
    cursorInfoRef.current = null;
  }, []);

  if (history.length === 0) {
    return (
      <div className="bg-subtle/30 border border-border/30 flex items-center justify-center" style={{ height }}>
        <span className="text-[10px] text-muted-foreground/30">No status history</span>
      </div>
    );
  }

  return (
    <div className="relative select-none">
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
          const isActive = cursorInfo?.segIdx === i;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 transition-opacity duration-150"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: STATUS_COLORS[seg.status],
                opacity: cursorInfo !== null ? (isActive ? 1 : 0.4) : 0.7,
                boxShadow: isActive ? `inset 0 0 0 1px rgba(255,255,255,0.3)` : 'none',
              }}
            />
          );
        })}

        {/* Crosshair line */}
        {crosshairPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-px pointer-events-none z-10"
            style={{
              left: `${crosshairPct}%`,
              backgroundColor: 'var(--foreground)',
              opacity: 0.5,
            }}
          />
        )}
      </div>

      {/* Tooltip — positioned near cursor */}
      {cursorInfo && (
        <div
          className="pointer-events-none absolute z-20 mt-1 border border-border/50 bg-card/95 px-2.5 py-1.5 text-[10px] shadow-lg backdrop-blur-sm rounded-sm"
          style={{
            left: `${Math.max(10, Math.min(cursorInfo.pct, 90))}%`,
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
            <div>{formatDate(cursorInfo.seg.start)} {formatTime(cursorInfo.seg.start)}</div>
            <div>Duration: {formatMs(cursorInfo.seg.end - cursorInfo.seg.start)}</div>
          </div>
        </div>
      )}

      {/* Legend (shown when not hovering) */}
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

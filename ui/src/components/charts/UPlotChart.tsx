import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import { useTheme } from '@/hooks/useTheme';
import 'uplot/dist/uPlot.min.css';

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#666';
}

interface UPlotChartProps {
  data: uPlot.AlignedData;
  series: uPlot.Series[];
  height?: number;
  className?: string;
  formatY?: (v: number) => string;
}

export function UPlotChart({ data, series, height = 160, className, formatY }: UPlotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const seriesRef = useRef<uPlot.Series[]>(series);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const formatYRef = useRef(formatY);
  const [width, setWidth] = useState(0);
  const { theme } = useTheme();

  // Keep refs in sync without triggering re-render
  seriesRef.current = series;
  formatYRef.current = formatY;

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setWidth(w);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current || width === 0) return;

    const axisColor = cssVar('--chart-axis');
    const gridColor = cssVar('--chart-grid');

    // Hide 'ts' series from legend
    const filteredSeries = seriesRef.current.map((s, i) => ({
      ...s,
      show: i === 0 ? false : (s.show !== false),
    }));

    // Tooltip update function
    const updateTooltip = (u: uPlot) => {
      const tip = tooltipRef.current;
      if (!tip) return;
      const idx = u.cursor.idx;
      if (idx == null) {
        tip.classList.add('hidden');
        return;
      }
      const ts = (u.data[0] as number[])[idx];
      const rows = u.series
        .slice(1)
        .map((s, i) => {
          const val = (u.data[i + 1] as number[])[idx];
          if (val == null) return '';
          const color = typeof s.stroke === 'string' ? s.stroke : '#888';
          const text = formatYRef.current ? formatYRef.current(val) : String(Math.round(val));
          return `<div style="display:flex;align-items:center;gap:6px"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color}"></span>${s.label}: <span style="font-family:monospace;font-weight:500">${text}</span></div>`;
        })
        .filter(Boolean)
        .join('');
      tip.innerHTML = `<div style="margin-bottom:2px;font-family:monospace;color:var(--muted-foreground)">${new Date(ts).toLocaleTimeString()}</div>${rows}`;
      tip.classList.remove('hidden');
      // Position clamped inside container
      const cw = u.over.clientWidth;
      const ch = u.over.clientHeight;
      let left = u.cursor.left ?? 0;
      let top = u.cursor.top ?? 0;
      left = Math.max(8, Math.min(left, cw - 8));
      top = Math.max(8, Math.min(top, ch - 8));
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };

    const opts: uPlot.Options = {
      width,
      height,
      series: filteredSeries,
      cursor: {
        drag: { x: false, y: false },
        show: true,
        focus: { prox: 1e6 },
        points: {
          show: true,
        },
        bind: {
          mousemove: (u: uPlot, _target: EventTarget, handler: (e: MouseEvent) => void) => {
            const el = u.over;
            el.addEventListener('mousemove', (e) => { handler(e); updateTooltip(u); });
            return null;
          },
          mouseleave: (_u: uPlot, _target: EventTarget, handler: (e: MouseEvent) => void) => {
            const el = containerRef.current;
            if (el) {
              el.addEventListener('mouseleave', () => { handler(new MouseEvent('mouseleave')); tooltipRef.current?.classList.add('hidden'); });
            }
            return null;
          },
        },
      },
      legend: { show: false },
      scales: {
        x: {
          time: false,
          range: (_u, min, max) => [min, max],
        },
      },
      axes: [
        {
          show: false,
        },
        {
          stroke: axisColor,
          grid: { stroke: gridColor, width: 0.5 },
          size: 45,
          font: '10px monospace',
          values: (_u: uPlot, ticks: number[]) => ticks.map((v) => formatYRef.current ? formatYRef.current(v) : String(Math.round(v))),
        },
      ],
    };

    if (plotRef.current) {
      plotRef.current.destroy();
    }

    const plot = new uPlot(opts, data, containerRef.current);
    plotRef.current = plot;

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, theme]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`} style={{ background: 'var(--chart-bg)' }}>
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 hidden rounded border border-border px-2 py-1.5 text-[11px] shadow-lg"
        style={{
          transform: 'translate(-50%, -120%)',
          background: 'var(--card)',
          color: 'var(--foreground)',
        }}
      />
    </div>
  );
}

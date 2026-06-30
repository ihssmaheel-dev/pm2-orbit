import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
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
  const [width, setWidth] = useState(0);

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

    const opts: uPlot.Options = {
      width,
      height,
      series,
      cursor: {
        drag: { x: false, y: false },
        show: true,
      },
      scales: { x: { time: false } },
      axes: [
        {
          stroke: axisColor,
          grid: { stroke: gridColor, width: 1 / devicePixelRatio },
          size: 45,
          font: '10px monospace',
        },
        {
          stroke: axisColor,
          grid: { stroke: gridColor, width: 1 / devicePixelRatio },
          size: 24,
          font: '9px monospace',
          values: (_self: uPlot, ticks: number[]) => ticks.map((v) => formatY ? formatY(v) : String(v)),
        },
      ],
    };

    if (plotRef.current) {
      plotRef.current.destroy();
    }

    plotRef.current = new uPlot(opts, data, containerRef.current);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, series]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return <div ref={containerRef} className={className} style={{ background: 'var(--chart-bg)' }} />;
}

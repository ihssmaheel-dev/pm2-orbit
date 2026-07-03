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

    // Hide 'ts' series from legend
    const filteredSeries = series.map((s, i) => ({
      ...s,
      show: i === 0 ? false : (s.show !== false),
    }));

    const opts: uPlot.Options = {
      width,
      height,
      series: filteredSeries,
      cursor: {
        drag: { x: false, y: false },
        show: false,
      },
      legend: {
        show: false,
      },
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
          values: (_u: uPlot, ticks: number[]) => ticks.map((v) => formatY ? formatY(v) : String(Math.round(v))),
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

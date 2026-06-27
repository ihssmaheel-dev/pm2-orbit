import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface UPlotChartProps {
  data: uPlot.AlignedData;
  series: uPlot.Series[];
  height?: number;
  className?: string;
}

export function UPlotChart({ data, series, height = 150, className }: UPlotChartProps) {
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

    const opts: uPlot.Options = {
      width,
      height,
      series,
      cursor: { drag: { x: false, y: false } },
      scales: { x: { time: false } },
      axes: [
        {
          stroke: 'var(--chart-axis)',
          grid: { stroke: 'var(--chart-grid)' },
        },
        {
          stroke: 'var(--chart-axis)',
          grid: { stroke: 'var(--chart-grid)' },
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

  return <div ref={containerRef} className={className} />;
}

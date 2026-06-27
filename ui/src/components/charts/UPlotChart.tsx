import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface UPlotChartProps {
  data: uPlot.AlignedData;
  series: uPlot.Series[];
  width?: number;
  height?: number;
  className?: string;
}

export function UPlotChart({ data, series, width = 400, height = 150, className }: UPlotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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

    plotRef.current = new uPlot(opts, data, containerRef.current);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return <div ref={containerRef} className={className} />;
}

import { useMemo } from 'react';
import uPlot from 'uplot';
import { UPlotChart } from './UPlotChart';

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#666';
}

interface ChartProps {
  data: { ts: number[]; values: number[] };
  label?: string;
  color?: string;
  formatY?: (v: number) => string;
}

function makeSeries(colorVar: string, label: string): uPlot.Series[] {
  const color = cssVar(colorVar);
  return [
    { label: 'ts', value: () => '' },
    {
      label,
      stroke: color,
      width: 2,
      fill: color + '20',
      points: { show: true, size: 4, width: 1.5 },
    },
  ];
}

export function CpuChart({ data, label = 'CPU %', color = '--chart-cpu' }: ChartProps) {
  const uData: uPlot.AlignedData = useMemo(() => [data.ts, data.values], [data.ts, data.values]);
  const series = useMemo(() => makeSeries(color, label), [color, label]);

  return (
    <UPlotChart
      data={uData}
      series={series}
      height={140}
      formatY={(v) => v.toFixed(1) + '%'}
    />
  );
}

export function MemoryChart({ data, label = 'Memory', color = '--chart-memory' }: ChartProps) {
  const uData: uPlot.AlignedData = useMemo(() => [data.ts, data.values], [data.ts, data.values]);
  const series = useMemo(() => makeSeries(color, label), [color, label]);

  return (
    <UPlotChart
      data={uData}
      series={series}
      height={140}
      formatY={(v) => v.toFixed(1) + '%'}
    />
  );
}

function makeLoadSeries(colorVars: [string, string, string]): uPlot.Series[] {
  return [
    { label: 'ts', value: () => '' },
    {
      label: '1m',
      stroke: cssVar(colorVars[0]),
      width: 2,
      fill: cssVar(colorVars[0]) + '15',
      points: { show: true, size: 4, width: 1.5 },
    },
    {
      label: '5m',
      stroke: cssVar(colorVars[1]),
      width: 2,
      points: { show: true, size: 4, width: 1.5 },
    },
    {
      label: '15m',
      stroke: cssVar(colorVars[2]),
      width: 2,
      points: { show: true, size: 4, width: 1.5 },
    },
  ];
}

export function LoadChart({ data }: { data: { ts: number[]; load1: number[]; load5: number[]; load15: number[] } }) {
  const uData: uPlot.AlignedData = useMemo(() => [data.ts, data.load1, data.load5, data.load15], [data.ts, data.load1, data.load5, data.load15]);
  const series = useMemo(() => makeLoadSeries(['--chart-cpu', '--chart-memory', '--chart-axis']), []);

  return (
    <UPlotChart
      data={uData}
      series={series}
      height={140}
      formatY={(v) => v.toFixed(2)}
    />
  );
}

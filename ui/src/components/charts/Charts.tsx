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
      points: { show: false } as any,
    },
  ];
}

export function CpuChart({ data, label = 'CPU %', color = '--chart-cpu' }: ChartProps) {
  const uData: uPlot.AlignedData = [data.ts, data.values];

  return (
    <UPlotChart
      data={uData}
      series={makeSeries(color, label)}
      height={140}
      formatY={(v) => v.toFixed(1) + '%'}
    />
  );
}

export function MemoryChart({ data, label = 'Memory', color = '--chart-memory' }: ChartProps) {
  const uData: uPlot.AlignedData = [data.ts, data.values];

  return (
    <UPlotChart
      data={uData}
      series={makeSeries(color, label)}
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
      points: { show: false } as any,
    },
    {
      label: '5m',
      stroke: cssVar(colorVars[1]),
      width: 2,
      points: { show: false } as any,
    },
    {
      label: '15m',
      stroke: cssVar(colorVars[2]),
      width: 2,
      points: { show: false } as any,
    },
  ];
}

export function LoadChart({ data }: { data: { ts: number[]; load1: number[]; load5: number[]; load15: number[] } }) {
  const uData: uPlot.AlignedData = [data.ts, data.load1, data.load5, data.load15];

  return (
    <UPlotChart
      data={uData}
      series={makeLoadSeries(['--chart-cpu', '--chart-memory', '--chart-axis'])}
      height={140}
      formatY={(v) => v.toFixed(2)}
    />
  );
}

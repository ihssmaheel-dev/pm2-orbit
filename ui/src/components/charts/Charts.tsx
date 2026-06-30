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
      width: 3,
      fill: color + '4D',
      points: { show: true, size: 3, stroke: color, fill: '#fff' } as any,
    },
  ];
}

export function CpuChart({ data, label = 'CPU %', color = '--chart-cpu' }: ChartProps) {
  const uData: uPlot.AlignedData = [data.ts, data.values];

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <UPlotChart
        data={uData}
        series={makeSeries(color, label)}
        height={130}
        formatY={(v) => v.toFixed(1) + '%'}
      />
    </div>
  );
}

export function MemoryChart({ data, label = 'Memory', color = '--chart-memory' }: ChartProps) {
  const uData: uPlot.AlignedData = [data.ts, data.values];

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <UPlotChart
        data={uData}
        series={makeSeries(color, label)}
        height={130}
        formatY={(v) => v.toFixed(1) + '%'}
      />
    </div>
  );
}

function makeLoadSeries(colorVars: [string, string, string]): uPlot.Series[] {
  return [
    { label: 'ts', value: () => '' },
    {
      label: '1m',
      stroke: cssVar(colorVars[0]),
      width: 2,
      points: { show: true, size: 2.5, stroke: cssVar(colorVars[0]) } as any,
    },
    {
      label: '5m',
      stroke: cssVar(colorVars[1]),
      width: 2,
      points: { show: true, size: 2.5, stroke: cssVar(colorVars[1]) } as any,
    },
    {
      label: '15m',
      stroke: cssVar(colorVars[2]),
      width: 2,
      points: { show: true, size: 2.5, stroke: cssVar(colorVars[2]) } as any,
    },
  ];
}

export function LoadChart({ data }: { data: { ts: number[]; load1: number[]; load5: number[]; load15: number[] } }) {
  const uData: uPlot.AlignedData = [data.ts, data.load1, data.load5, data.load15];

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Load Average</div>
      <UPlotChart
        data={uData}
        series={makeLoadSeries(['--chart-cpu', '--chart-memory', '--chart-axis'])}
        height={130}
        formatY={(v) => v.toFixed(2)}
      />
    </div>
  );
}

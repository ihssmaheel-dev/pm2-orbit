import uPlot from 'uplot';
import { UPlotChart } from './UPlotChart';

interface ChartProps {
  data: { ts: number[]; values: number[] };
  label?: string;
  color?: string;
}

const chartSeries = (color: string, label: string): uPlot.Series[] => [
  { label: 'ts', value: () => '' },
  {
    label,
    stroke: color,
    width: 2,
    fill: color + '20',
  },
];

export function CpuChart({ data, label = 'CPU %', color = 'var(--chart-cpu)' }: ChartProps) {
  const uData: uPlot.AlignedData = [data.ts, data.values];

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <UPlotChart
        data={uData}
        series={chartSeries(color, label)}
        height={120}
      />
    </div>
  );
}

export function MemoryChart({ data, label = 'Memory', color = 'var(--chart-memory)' }: ChartProps) {
  const uData: uPlot.AlignedData = [data.ts, data.values];

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <UPlotChart
        data={uData}
        series={chartSeries(color, label)}
        height={120}
      />
    </div>
  );
}

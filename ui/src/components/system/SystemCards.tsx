import { Cpu, MemoryStick, Activity, Network, HardDrive } from 'lucide-react';
import { useSystemStore } from '@/store/system';
import { formatBytes } from '@/lib/format';

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}

function Card({ icon, label, value, subtext, color = 'text-primary' }: CardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border min-w-[160px]">
      <div className={`${color}`}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-lg font-mono text-foreground">{value}</span>
        {subtext && <span className="text-xs text-muted-foreground">{subtext}</span>}
      </div>
    </div>
  );
}

export function SystemCards() {
  const system = useSystemStore((s) => s.system);

  return (
    <div className="flex gap-3 p-4 overflow-x-auto">
      <Card
        icon={<Cpu size={16} />}
        label="CPU"
        value={`${system.cpu.toFixed(1)}%`}
        color={system.cpu > 80 ? 'text-destructive' : 'text-primary'}
      />
      <Card
        icon={<MemoryStick size={16} />}
        label="Memory"
        value={formatBytes(system.memory.used)}
        subtext={`/ ${formatBytes(system.memory.total)}`}
        color="text-accent"
      />
      <Card
        icon={<Activity size={16} />}
        label="Load"
        value={system.loadAvg[0].toFixed(2)}
        subtext={`${system.loadAvg[1].toFixed(2)} / ${system.loadAvg[2].toFixed(2)}`}
        color="text-success"
      />
      <Card
        icon={<Network size={16} />}
        label="Network"
        value={`${formatBytes(system.network.rx)}/s`}
        subtext={`↑ ${formatBytes(system.network.tx)}/s`}
        color="text-primary"
      />
      <Card
        icon={<HardDrive size={16} />}
        label="Disk"
        value={`${formatBytes(system.disk.read)}/s`}
        subtext={`↓ ${formatBytes(system.disk.write)}/s`}
        color="text-chart-disk"
      />
    </div>
  );
}

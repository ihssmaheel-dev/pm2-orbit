import { Cpu, MemoryStick, Activity, Network, HardDrive } from 'lucide-react';
import { useSystemStore } from '@/store/system';
import { formatBytes } from '@/lib/format';

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: string;
  bgColor: string;
  progress?: number;
}

function Card({ icon, label, value, subtext, color, bgColor, progress }: CardProps) {
  return (
    <div className="relative flex flex-col gap-2 px-4 py-3 bg-card border border-border overflow-hidden group hover:border-border/80 transition-colors">
      <div className="absolute inset-0 opacity-[0.03]" style={{ background: `linear-gradient(135deg, ${bgColor}, transparent)` }} />

      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-none ${color}`} style={{ background: `${bgColor}15` }}>
            {icon}
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        {progress !== undefined && (
          <span className="text-xs font-mono text-muted-foreground">{progress.toFixed(0)}%</span>
        )}
      </div>

      <div className="relative">
        <span className="text-xl font-mono font-medium text-foreground">{value}</span>
        {subtext && (
          <span className="ml-2 text-xs text-muted-foreground">{subtext}</span>
        )}
      </div>

      {progress !== undefined && (
        <div className="h-1 bg-subtle rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${color}`}
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: `linear-gradient(90deg, ${bgColor}, ${bgColor}cc)`,
            }}
          />
        </div>
      )}
    </div>
  );
}

export function SystemCards() {
  const system = useSystemStore((s) => s.system);

  const memPercent = system.memory.total > 0
    ? (system.memory.used / system.memory.total) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4">
      <Card
        icon={<Cpu size={14} />}
        label="CPU"
        value={`${system.cpu.toFixed(1)}%`}
        color="text-primary"
        bgColor="#019cf6"
        progress={system.cpu}
      />
      <Card
        icon={<MemoryStick size={14} />}
        label="Memory"
        value={formatBytes(system.memory.used)}
        subtext={`/ ${formatBytes(system.memory.total)}`}
        color="text-accent"
        bgColor="#7f45e7"
        progress={memPercent}
      />
      <Card
        icon={<Activity size={14} />}
        label="Load"
        value={system.loadAvg[0].toFixed(2)}
        subtext={`${system.loadAvg[1].toFixed(2)} / ${system.loadAvg[2].toFixed(2)}`}
        color="text-success"
        bgColor="#10b981"
      />
      <Card
        icon={<Network size={14} />}
        label="Network"
        value={`${formatBytes(system.network.rx)}/s`}
        subtext={`↑ ${formatBytes(system.network.tx)}/s`}
        color="text-primary"
        bgColor="#019cf6"
      />
      <Card
        icon={<HardDrive size={14} />}
        label="Disk"
        value={`${formatBytes(system.disk.read)}/s`}
        subtext={`↓ ${formatBytes(system.disk.write)}/s`}
        color="text-chart-disk"
        bgColor="#c084fc"
      />
    </div>
  );
}

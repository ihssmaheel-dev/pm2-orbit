import { Cpu, MemoryStick, Activity, Network, HardDrive, Server } from 'lucide-react';
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
    <div className="relative flex flex-col gap-1.5 px-4 py-3 bg-card/60 border border-border/60 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02]" style={{ background: `linear-gradient(135deg, ${bgColor}, transparent)` }} />

      <div className="flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <div className={`${color} opacity-70`}>{icon}</div>
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
            {label}
          </span>
        </div>
        {progress !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground/50">{progress.toFixed(0)}%</span>
        )}
      </div>

      <div className="relative">
        <span className="text-lg font-mono font-medium text-foreground/90">{value}</span>
        {subtext && (
          <span className="ml-1.5 text-[11px] text-muted-foreground/50">{subtext}</span>
        )}
      </div>

      {progress !== undefined && (
        <div className="h-[3px] bg-subtle/50 overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: `linear-gradient(90deg, ${bgColor}, ${bgColor}bb)`,
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
      <Card
        icon={<Cpu size={13} />}
        label="CPU"
        value={`${system.cpu.toFixed(1)}%`}
        color="text-primary"
        bgColor="#019cf6"
        progress={system.cpu}
      />
      <Card
        icon={<Server size={13} />}
        label="Cores"
        value={String(system.cpuCores)}
        subtext={system.cpuCores === 1 ? 'logical' : 'logical'}
        color="text-primary/80"
        bgColor="#019cf6"
      />
      <Card
        icon={<MemoryStick size={13} />}
        label="Memory"
        value={formatBytes(system.memory.used)}
        subtext={`/ ${formatBytes(system.memory.total)}`}
        color="text-accent"
        bgColor="#7f45e7"
        progress={memPercent}
      />
      <Card
        icon={<Activity size={13} />}
        label="Load"
        value={system.loadAvg[0].toFixed(2)}
        subtext={`${system.loadAvg[1].toFixed(2)} / ${system.loadAvg[2].toFixed(2)}`}
        color="text-success"
        bgColor="#10b981"
      />
      <Card
        icon={<Network size={13} />}
        label="Network"
        value={`${formatBytes(system.network.rx)}/s`}
        subtext={`↑ ${formatBytes(system.network.tx)}/s`}
        color="text-primary"
        bgColor="#019cf6"
      />
      <Card
        icon={<HardDrive size={13} />}
        label="Disk"
        value={`${formatBytes(system.disk.read)}/s`}
        subtext={`↓ ${formatBytes(system.disk.write)}/s`}
        color="text-chart-disk"
        bgColor="#c084fc"
      />
    </div>
  );
}

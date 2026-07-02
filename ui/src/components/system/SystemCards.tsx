import { Cpu, MemoryStick, Activity, Network, HardDrive, Server } from 'lucide-react';
import { useSystemStore } from '@/store/system';
import { formatBytes } from '@/lib/format';

function CircularProgress({ percent, color }: { percent: number; color: string }) {
  const size = 18;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const o = c - (Math.min(percent, 100) / 100) * c;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-border" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: string;
  progress?: number;
  circular?: boolean;
}

function Card({ icon, label, value, subtext, color, progress, circular }: CardProps) {
  return (
    <div className="relative flex flex-col px-4 py-3 bg-card border border-border rounded-lg overflow-hidden">
      {/* Row 1: Label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${color} shrink-0`}>{icon}</span>
          <span className="text-xs font-medium text-muted-foreground truncate">
            {label}
          </span>
        </div>
        {!circular && progress !== undefined && (
          <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
            {progress.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Row 2: Value + circular progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold font-mono tracking-tight tabular-nums leading-none text-foreground">
            {value}
          </span>
          {subtext && (
            <span className="text-xs font-mono tabular-nums leading-none text-muted-foreground">
              {subtext}
            </span>
          )}
        </div>
        {circular && progress !== undefined && (
          <CircularProgress percent={progress} color={color === 'text-primary' ? 'hsl(var(--primary))' : color === 'text-success' ? 'hsl(var(--success))' : 'hsl(var(--accent))'} />
        )}
      </div>

      {/* Row 3: Linear progress bar */}
      <div className="mt-2">
        {progress !== undefined && !circular ? (
          <div className="h-1 bg-muted overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: color === 'text-primary' ? 'hsl(var(--primary))' : color === 'text-success' ? 'hsl(var(--success))' : 'hsl(var(--accent))',
              }}
            />
          </div>
        ) : (
          <div className="h-1" />
        )}
      </div>
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
        icon={<Cpu size={14} />}
        label="CPU"
        value={`${system.cpu.toFixed(1)}%`}
        color="text-primary"
        progress={system.cpu}
        circular
      />
      <Card
        icon={<Server size={14} />}
        label="Cores"
        value={String(system.cpuCores)}
        color="text-muted-foreground"
      />
      <Card
        icon={<MemoryStick size={14} />}
        label="Memory"
        value={formatBytes(system.memory.used)}
        subtext={`/ ${formatBytes(system.memory.total)}`}
        color="text-accent"
        progress={memPercent}
        circular
      />
      <Card
        icon={<Activity size={14} />}
        label="Load"
        value={system.loadAvg[0].toFixed(2)}
        subtext={`${system.loadAvg[1].toFixed(2)} / ${system.loadAvg[2].toFixed(2)}`}
        color="text-success"
      />
      <Card
        icon={<Network size={14} />}
        label="Network"
        value={`${formatBytes(system.network.rx)}/s`}
        subtext={`↑ ${formatBytes(system.network.tx)}/s`}
        color="text-primary"
      />
      <Card
        icon={<HardDrive size={14} />}
        label="Disk"
        value={system.disk.read > 0 ? `${formatBytes(system.disk.read)}/s` : '—'}
        subtext={system.disk.write > 0 ? `↓ ${formatBytes(system.disk.write)}/s` : ''}
        color="text-accent"
      />
    </div>
  );
}

import {
  Cpu,
  MemoryStick,
  Activity,
  Network,
  HardDrive,
  Server,
} from "lucide-react";
import { useSystemStore } from "@/store/system";
import { formatBytes } from "@/lib/format";

function CircularProgress({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) {
  const size = 18;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const o = c - (Math.min(percent, 100) / 100) * c;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-subtle/50"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={o}
        strokeLinecap="round"
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
  bgColor: string;
  progress?: number;
  circular?: boolean;
}

function Card({
  icon,
  label,
  value,
  subtext,
  color,
  bgColor,
  progress,
  circular,
}: CardProps) {
  return (
    <div className="relative flex flex-col px-4 py-2.5 bg-card border border-border/50 overflow-hidden group hover:border-border/80 transition-colors duration-200">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${bgColor}, transparent)`,
        }}
      />

      {/* Row 1: Label + indicator */}
      <div className="flex items-center justify-between relative z-0 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${color} shrink-0`}>{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50 truncate">
            {label}
          </span>
        </div>
        {!circular && progress !== undefined && (
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground/50 shrink-0">
            {progress.toFixed(0)}%
          </span>
        )}
        {progress === undefined && (
          <span
            className="h-1.5 w-1.5 rounded-full opacity-30 group-hover:opacity-60 transition-opacity shrink-0"
            style={{ background: bgColor }}
          />
        )}
      </div>

      {/* Row 2: Value + circular progress */}
      <div className="relative z-0 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-medium font-mono tracking-tight tabular-nums leading-none text-foreground/90">
            {value}
          </span>
          {subtext && (
            <span className="text-[10px] font-mono tabular-nums leading-none text-muted-foreground/40">
              {subtext}
            </span>
          )}
        </div>
        {circular && progress !== undefined && (
          <CircularProgress percent={progress} color={bgColor} />
        )}
      </div>

      {/* Row 3: Linear progress bar (always present for consistent height) */}
      <div className="relative z-0">
        {progress !== undefined && !circular ? (
          <div className="h-0.5 bg-subtle/60 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.min(progress, 100)}%`,
                background: `linear-gradient(90deg, ${bgColor}, ${bgColor}bb)`,
              }}
            />
          </div>
        ) : (
          <div className="h-0.5" />
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

  const diskPercent = system.disk.total > 0
    ? (system.disk.used / system.disk.total) * 100
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 shrink-0">
      <Card
        icon={<Cpu size={13} />}
        label="CPU"
        value={`${system.cpu.toFixed(1)}%`}
        color="text-primary"
        bgColor="#14b8a6"
        progress={system.cpu}
        circular
      />
      <Card
        icon={<Server size={13} />}
        label="Cores"
        value={String(system.cpuCores)}
        color="text-muted-foreground"
        bgColor="#14b8a6"
      />
      <Card
        icon={<MemoryStick size={13} />}
        label="Memory"
        value={formatBytes(system.memory.used)}
        subtext={`/ ${formatBytes(system.memory.total)}`}
        color="text-accent"
        progress={memPercent}
        circular
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
        bgColor="#14b8a6"
      />
      <Card
        icon={<HardDrive size={13} />}
        label="Disk"
        value={system.disk.total > 0 ? `${diskPercent.toFixed(0)}%` : '—'}
        subtext={system.disk.total > 0 ? `${formatBytes(system.disk.used)} / ${formatBytes(system.disk.total)}` : ''}
        color="text-accent"
        progress={diskPercent}
        circular
      />
    </div>
  );
}
        subtext={
          system.disk.write > 0 ? `↓ ${formatBytes(system.disk.write)}/s` : ""
        }
        color="text-chart-disk"
        bgColor="#c084fc"
      />
    </div>
  );
}

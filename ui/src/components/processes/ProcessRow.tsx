import { memo, useState } from "react";
import { RotateCw, Square, Play, Trash2, Clock } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { formatBytes, formatDuration, formatPercent } from "@/lib/format";
import { useProcessStore } from "@/store/processes";
import { useLiveUptime } from "@/hooks/useLiveUptime";
import type { ProcessSnapshot, ProcessStatus } from "@/types/pm2";

interface Props {
  pid: number;
  style?: React.CSSProperties;
}

const CFG: Record<ProcessStatus, { label: string; dot: string; txt: string }> = {
  online: { label: "Running", dot: "bg-success", txt: "text-success" },
  stopped: { label: "Stopped", dot: "bg-muted-foreground", txt: "text-muted-foreground" },
  errored: { label: "Errored", dot: "bg-destructive", txt: "text-destructive" },
  launching: { label: "Starting", dot: "bg-warning", txt: "text-warning" },
  stopping: { label: "Stopping", dot: "bg-warning", txt: "text-warning" },
};

export const ProcessRow = memo(function ProcessRow({ pid, style }: Props) {
  const proc = useProcessStore((s) => s.processes.get(pid));
  const sel = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const isSel = sel === pid;
  const [ld, setLd] = useState<string | null>(null);

  if (!proc) return null;

  const p = proc;
  const st = CFG[p.status];

  const act = async (action: string) => {
    setLd(action);
    try {
      await fetch(`/api/processes/${p.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {
      /* ignore */
    }
    setLd(null);
  };

  return (
    <div
      role="row"
      aria-rowindex={pid + 1}
      aria-selected={isSel}
      tabIndex={0}
      style={style}
      onClick={() => select(isSel ? null : pid)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(isSel ? null : pid);
        }
      }}
      className={`flex items-center px-4 cursor-pointer transition-colors group border-b border-border outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSel ? "bg-muted" : "hover:bg-muted/50"
      }`}
    >
      {/* Name */}
      <div role="cell" className="flex-1 min-w-0 px-3 overflow-hidden">
        <span className="text-sm font-medium text-foreground truncate block">
          {p.name}
        </span>
      </div>

      {/* Mode */}
      <div role="cell" className="w-19 shrink-0 px-3 overflow-hidden">
        <span className="text-xs font-mono text-muted-foreground uppercase">
          {p.mode}
        </span>
      </div>

      {/* PID */}
      <div role="cell" className="w-19 shrink-0 px-3 overflow-hidden">
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {p.pid}
        </span>
      </div>

      {/* CPU */}
      <div role="cell" className="w-24 shrink-0 px-3 overflow-hidden">
        <span
          className={`text-sm font-mono tabular-nums ${
            p.cpu > 80 ? "text-destructive" : p.cpu > 50 ? "text-warning" : "text-foreground"
          }`}
        >
          {formatPercent(p.cpu)}
        </span>
      </div>

      {/* Memory */}
      <div role="cell" className="w-24 shrink-0 px-3 overflow-hidden">
        <span className="text-sm font-mono tabular-nums text-foreground">
          {formatBytes(p.memory)}
        </span>
      </div>

      {/* Restarts */}
      <div role="cell" className="w-15 shrink-0 px-3 overflow-hidden">
        <span
          className={`text-sm font-mono tabular-nums ${
            p.restarts > 0 ? "text-warning" : "text-muted-foreground"
          }`}
        >
          {p.restarts}
        </span>
      </div>

      {/* CPU History sparkline */}
      <div
        role="cell"
        className="w-26 shrink-0 px-3 flex items-center overflow-hidden"
      >
        {p.history.cpu.length >= 2 ? (
          <Sparkline
            data={p.history.cpu}
            color="hsl(var(--primary))"
            width={80}
            height={20}
            fill={false}
          />
        ) : (
          <span className="text-xs text-muted-foreground font-mono">—</span>
        )}
      </div>

      {/* Status */}
      <div
        role="cell"
        className="w-22.5 shrink-0 flex items-center gap-2 pl-3 overflow-hidden"
      >
        <span className={`relative inline-flex h-2 w-2 shrink-0`}>
          {p.status === "online" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75 motion-safe:animate-[ping_1.5s_ease-in-out_infinite]" />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${st.dot}`} />
        </span>
        <span className={`text-sm font-medium leading-none truncate ${st.txt}`}>
          {st.label}
        </span>
      </div>

      <UptimeCell process={p} />

      {/* Actions */}
      <div
        role="cell"
        className="w-18 shrink-0 flex items-center justify-center gap-1"
      >
        {(p.status === "online" || p.status === "errored") && (
          <ActBtn
            icon={<RotateCw size={12} className={ld === "restart" ? "animate-spin" : ""} />}
            label="Restart"
            onClick={() => act("restart")}
            disabled={ld !== null}
          />
        )}
        {p.status === "online" && (
          <ActBtn
            icon={<Square size={12} />}
            label="Stop"
            onClick={() => act("stop")}
            disabled={ld !== null}
          />
        )}
        {p.status === "stopped" && (
          <ActBtn
            icon={<Play size={12} />}
            label="Start"
            onClick={() => act("start")}
            disabled={ld !== null}
          />
        )}
        <ActBtn
          icon={<Trash2 size={12} />}
          label="Delete"
          onClick={() => act("delete")}
          disabled={ld !== null}
          danger
        />
      </div>
    </div>
  );
});

function UptimeCell({ process }: { process: ProcessSnapshot }) {
  const uptime = useLiveUptime(process);
  return (
    <div role="cell" className="w-27 shrink-0 px-3 overflow-hidden">
      {process.status === "online" ? (
        <span className="inline-flex items-center justify-end gap-1.5 text-sm font-mono tabular-nums text-success">
          <Clock size={12} className="text-success/60 shrink-0" />
          {formatDuration(uptime)}
        </span>
      ) : (
        <span className="text-sm font-mono tabular-nums text-muted-foreground">—</span>
      )}
    </div>
  );
}

function ActBtn({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`cursor-pointer h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
        danger
          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      } disabled:opacity-25 disabled:pointer-events-none`}
    >
      {icon}
    </button>
  );
}

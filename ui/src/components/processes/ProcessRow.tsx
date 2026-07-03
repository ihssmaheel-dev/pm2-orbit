import { memo, useState } from "react";
import { RotateCw, Square, Play, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Sparkline } from "./Sparkline";
import { formatBytes, formatDuration, formatPercent } from "@/lib/format";
import { useProcessStore } from "@/store/processes";
import { useLiveUptime } from "@/hooks/useLiveUptime";
import type { ProcessSnapshot, ProcessStatus } from "@/types/pm2";

interface Props {
  pid: number;
  style?: React.CSSProperties;
}

const CFG: Record<ProcessStatus, { label: string; dot: string; txt: string }> =
  {
    online: { label: "Running", dot: "bg-success", txt: "text-success" },
    stopped: {
      label: "Stopped",
      dot: "bg-muted-foreground",
      txt: "text-muted-foreground/60",
    },
    errored: {
      label: "Errored",
      dot: "bg-destructive",
      txt: "text-destructive",
    },
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
      const res = await fetch(`/api/processes/${p.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} sent`, {
          description: p.name,
        });
      } else {
        toast.error(`Failed to ${action}`);
      }
    } catch {
      toast.error(`Failed to ${action}`);
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
      className={`flex items-center px-5 cursor-pointer transition-colors duration-75 group border-b border-border/10 outline-none focus-visible:ring-1 focus-visible:ring-primary ${
        isSel ? "bg-primary/4" : "hover:bg-subtle/20"
      } ${pid % 2 === 0 ? "bg-background/20" : ""}`}
    >
      {/* Name */}
      <div role="cell" className="flex-1 min-w-0 px-3 overflow-hidden">
        <span className="text-[13px] font-medium text-foreground truncate block group-hover:text-primary transition-colors duration-75">
          {p.name}
        </span>
      </div>

      {/* Mode */}
      <div role="cell" className="w-19 shrink-0 px-3 overflow-hidden">
        <span className="text-[11px] font-mono text-muted-foreground/55 uppercase tracking-wider">
          {p.mode}
        </span>
      </div>

      {/* PID */}
      <div role="cell" className="w-19 shrink-0 px-3 overflow-hidden">
        <span className="text-[11px] font-mono text-muted-foreground/45 tabular-nums">
          {p.pid}
        </span>
      </div>

      {/* CPU */}
      <div role="cell" className="w-24 shrink-0 px-3 overflow-hidden">
        <span
          className={`text-[12px] font-mono tabular-nums ${
            p.cpu > 80
              ? "text-destructive"
              : p.cpu > 50
                ? "text-warning"
                : "text-foreground/80"
          }`}
        >
          {formatPercent(p.cpu)}
        </span>
      </div>

      {/* Memory */}
      <div role="cell" className="w-24 shrink-0 px-3 overflow-hidden">
        <span className="text-[12px] font-mono tabular-nums text-foreground/80">
          {formatBytes(p.memory)}
        </span>
      </div>

      {/* Restarts */}
      <div role="cell" className="w-15 shrink-0 px-3 overflow-hidden">
        <span
          className={`text-[12px] font-mono tabular-nums ${
            p.restarts > 0 ? "text-warning" : "text-muted-foreground/30"
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
        {p.status === 'online' && p.history.cpu.length >= 2 ? (
          <Sparkline
            data={p.history.cpu}
            color="var(--chart-cpu)"
            width={80}
            height={20}
            fill={false}
          />
        ) : (
          <span className="text-[10px] text-muted-foreground/20 font-mono">
            —
          </span>
        )}
      </div>

      {/* Status */}
      <div
        role="cell"
        className="w-22.5 shrink-0 flex items-center gap-2 pl-3 overflow-hidden"
      >
        <span className="relative inline-flex h-2 w-2 shrink-0">
          {p.status === "online" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70 motion-safe:animate-[ping_1.5s_ease-in-out_infinite]" />
          )}
          <span
            className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-300 ${st.dot}`}
          />
        </span>
        <span
          className={`text-[12px] font-medium leading-none truncate transition-colors duration-300 ${st.txt}`}
        >
          {st.label}
        </span>
      </div>

      <UptimeCell process={p} />

      {/* Actions — hover only */}
      <div
        role="cell"
        className="w-18 shrink-0 flex items-center justify-center gap-px transition-opacity duration-75"
      >
        {(p.status === "online" || p.status === "errored") && (
          <ActBtn
            icon={
              <RotateCw
                size={10}
                className={ld === "restart" ? "animate-spin" : ""}
              />
            }
            label="Restart"
            onClick={() => act("restart")}
            disabled={ld !== null}
          />
        )}
        {p.status === "online" && (
          <ActBtn
            icon={<Square size={10} />}
            label="Stop"
            onClick={() => act("stop")}
            disabled={ld !== null}
          />
        )}
        {p.status === "stopped" && (
          <ActBtn
            icon={<Play size={10} />}
            label="Start"
            onClick={() => act("start")}
            disabled={ld !== null}
          />
        )}
        <ActBtn
          icon={<Trash2 size={10} />}
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
        <span className="inline-flex items-center justify-end gap-1.5 text-[12px] font-mono tabular-nums text-success">
          <Clock size={10} className="text-success/60 shrink-0" />
          {formatDuration(uptime)}
        </span>
      ) : (
        <span className="text-[12px] font-mono tabular-nums text-muted-foreground/20">
          &mdash;
        </span>
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
      className={`cursor-pointer h-6 w-6 flex items-center justify-center rounded transition-colors ${
        danger
          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
      } disabled:opacity-25 disabled:pointer-events-none`}
    >
      {icon}
    </button>
  );
}

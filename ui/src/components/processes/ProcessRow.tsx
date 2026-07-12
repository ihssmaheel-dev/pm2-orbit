import { memo, useState, useRef, useEffect } from "react";
import { RotateCw, Square, Play, Trash2, Clock, Tag, FileText } from "lucide-react";
import { toast } from "sonner";
import { Sparkline } from "./Sparkline";
import { formatBytes, formatDuration, formatPercent } from "@/lib/format";
import { useProcessStore } from "@/store/processes";
import { useTagsStore } from "@/store/tags";
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
  const isSel = useProcessStore((s) => s.selectedId === pid);
  const select = useProcessStore((s) => s.select);
  const [ld, setLd] = useState<string | null>(null);
  const [tagMenuPid, setTagMenuPid] = useState<number | null>(null);

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
        const labels: Record<string, string> = {
          restart: 'Restarted', stop: 'Stopped', start: 'Started',
          reload: 'Reloaded', delete: 'Deleted', scale: 'Scaled',
        };
        toast.success(`${labels[action] || action} "${p.name}"`);
      } else {
        toast.error(`Could not ${action} "${p.name}"`);
      }
    } catch {
      toast.error(`Could not ${action} "${p.name}"`);
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
      className={`flex items-center px-5 cursor-pointer transition-all duration-100 group border-b border-border/20 outline-none focus-visible:ring-1 focus-visible:ring-primary ${
        isSel ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-subtle/15"
      }`}
    >
      {/* Name */}
      <div role="cell" className="flex-1 min-w-0 px-3 relative">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors duration-75">
            {p.name}
          </span>
          {p.tags && p.tags.length > 0 && (
            <div className="flex gap-0.5 shrink-0">
              {p.tags.slice(0, 3).map((t) => (
                <span key={t.id} className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              ))}
              {p.tags.length > 3 && (
                <span className="text-[9px] text-muted-foreground/50">+{p.tags.length - 3}</span>
              )}
            </div>
          )}
          {p.note && (
            <span title={p.note} className="shrink-0 text-muted-foreground/40">
              <FileText size={10} />
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setTagMenuPid(tagMenuPid === pid ? null : pid);
            }}
            className="opacity-40 sm:opacity-0 group-hover:opacity-60 hover:!opacity-100 cursor-pointer shrink-0 transition-opacity"
            aria-label="Assign tags"
          >
            <Tag size={10} />
          </button>
        </div>
        {tagMenuPid === pid && (
          <TagAssignMenu
            processName={p.name}
            currentTags={p.tags || []}
            onClose={() => setTagMenuPid(null)}
          />
        )}
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
      <div role="cell" className="w-20 shrink-0 px-3 overflow-hidden">
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
      <div role="cell" className="w-20 shrink-0 px-3 overflow-hidden">
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

function TagAssignMenu({
  processName,
  currentTags,
  onClose,
}: {
  processName: string;
  currentTags: { id: string }[];
  onClose: () => void;
}) {
  const tags = useTagsStore((s) => s.tags);
  const assignTags = useTagsStore((s) => s.assignTags);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const currentIds = currentTags.map((t) => t.id);

  const toggle = async (tagId: string) => {
    let next: string[];
    if (currentIds.includes(tagId)) {
      next = currentIds.filter((id) => id !== tagId);
    } else if (currentIds.length >= 2) {
      // Max 2 tags per process — replace the last one
      next = [...currentIds.slice(0, 1), tagId];
    } else {
      next = [...currentIds, tagId];
    }
    await assignTags(processName, next);
  };

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border/60 shadow-xl py-1 w-48"
      onClick={(e) => e.stopPropagation()}
    >
      {tags.length === 0 && (
        <span className="px-3 py-1.5 text-[11px] text-muted-foreground block">
          No tags available
        </span>
      )}
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => toggle(tag.id)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-foreground hover:bg-subtle/40 cursor-pointer transition-colors"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: tag.color }}
          />
          <span className="flex-1 text-left">{tag.name}</span>
          {currentIds.includes(tag.id) && (
            <span className="text-primary text-[10px]">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}

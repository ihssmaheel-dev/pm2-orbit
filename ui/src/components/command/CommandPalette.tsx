import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search, RotateCw, Square, Play, Terminal, Bell, Settings, LayoutGrid,
  RefreshCw, Moon, Sun, ArrowRight, Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProcessStore } from '@/store/processes';
import { useTheme } from '@/hooks/useTheme';
import type { ProcessStatus } from '@/types/pm2';

const STATUS_CONFIG: Record<ProcessStatus, { label: string; dot: string }> = {
  online: { label: 'Running', dot: 'bg-success' },
  stopped: { label: 'Stopped', dot: 'bg-muted-foreground/30' },
  errored: { label: 'Errored', dot: 'bg-destructive' },
  launching: { label: 'Starting', dot: 'bg-warning' },
  stopping: { label: 'Stopping', dot: 'bg-warning' },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  restart: <RotateCw size={12} />,
  stop: <Square size={12} />,
  start: <Play size={12} />,
  reload: <RefreshCw size={12} />,
};

const ACTION_LABELS: Record<string, string> = {
  restart: 'Restart',
  stop: 'Stop',
  start: 'Start',
  reload: 'Reload',
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const processes = useProcessStore((s) => s.processes);
  const select = useProcessStore((s) => s.select);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const processList = useMemo(() => Array.from(processes.values()), [processes]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const runAction = useCallback(async (processId: number, action: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/processes/${processId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const getActionsForStatus = useCallback((status: ProcessStatus): string[] => {
    switch (status) {
      case 'online': return ['restart', 'stop'];
      case 'stopped': return ['start'];
      case 'errored': return ['restart'];
      default: return [];
    }
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={close}
      />

      {/* Palette */}
      <Command
        className="relative w-full max-w-[560px] bg-card border border-border/50 shadow-2xl overflow-hidden"
        loop
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') close();
        }}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-5 h-13 border-b border-border/30">
          <Search size={16} className="text-primary shrink-0" />
          <Command.Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={query}
            onValueChange={setQuery}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
          />
          <div className="flex items-center gap-1">
            <kbd className="text-[10px] font-mono text-muted-foreground/40 bg-subtle/40 border border-border/20 px-1.5 py-0.5 leading-none shrink-0 rounded-sm">
              esc
            </kbd>
          </div>
        </div>

        {/* Results */}
        <Command.List className="max-h-[440px] overflow-auto py-2">
          <Command.Empty className="py-16 text-center">
            <div className="text-sm text-muted-foreground/40">No results found</div>
          </Command.Empty>

          {/* ─── Navigation ─── */}
          <CommandGroup heading="Navigation">
            <CommandItem
              icon={<LayoutGrid size={14} />}
              label="Processes"
              value="nav processes"
              shortcut="1"
              onSelect={() => { navigate('/processes'); close(); }}
            />
            <CommandItem
              icon={<Terminal size={14} />}
              label="Logs"
              value="nav logs"
              shortcut="2"
              onSelect={() => { navigate('/logs'); close(); }}
            />
            <CommandItem
              icon={<Bell size={14} />}
              label="Alerts"
              value="nav alerts"
              shortcut="3"
              onSelect={() => { navigate('/alerts'); close(); }}
            />
            <CommandItem
              icon={<LayoutGrid size={14} />}
              label="History"
              value="nav history"
              shortcut="4"
              onSelect={() => { navigate('/history'); close(); }}
            />
            <CommandItem
              icon={<Settings size={14} />}
              label="Settings"
              value="nav settings"
              shortcut="5"
              onSelect={() => { navigate('/settings'); close(); }}
            />
          </CommandGroup>

          {/* ─── Appearance ─── */}
          <CommandGroup heading="Appearance">
            <CommandItem
              icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              value="theme toggle"
              onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); close(); }}
            />
          </CommandGroup>

          {/* ─── Processes ─── */}
          {processList.map((proc) => {
            const st = STATUS_CONFIG[proc.status];
            const actions = getActionsForStatus(proc.status);
            const sameNameCount = processList.filter((p) => p.name === proc.name).length;
            const headingLabel = sameNameCount > 1
              ? `${proc.name} #${proc.id} — ${st.label}`
              : `${proc.name} — ${st.label}`;
            return (
              <CommandGroup key={`proc-${proc.id}`} heading={headingLabel}>
                <CommandItem
                  icon={<Terminal size={13} />}
                  label="Open Logs"
                  value={`proc-${proc.id} ${proc.name} logs open`}
                  onSelect={() => { navigate(`/logs/${proc.id}`); close(); }}
                />
                <CommandItem
                  icon={<ArrowRight size={13} />}
                  label="View in Processes"
                  value={`proc-${proc.id} ${proc.name} view process`}
                  onSelect={() => { select(proc.id); navigate('/processes'); close(); }}
                />
                {actions.map((action) => (
                  <CommandItem
                    key={action}
                    icon={ACTION_ICONS[action]}
                    label={ACTION_LABELS[action]}
                    value={`proc-${proc.id} ${proc.name} ${action} action`}
                    destructive={action === 'stop'}
                    onSelect={() => {
                      runAction(proc.id, action);
                      toast.success(`${ACTION_LABELS[action]} "${proc.name}"`);
                      close();
                    }}
                  />
                ))}
              </CommandGroup>
            );
          })}
        </Command.List>

        {/* Footer */}
        <div className="flex items-center gap-5 px-5 h-9 border-t border-border/30 bg-subtle/5">
          <FooterHint keys={['↑', '↓']} label="Navigate" />
          <FooterHint keys={['↵']} label="Select" />
          <FooterHint keys={['esc']} label="Close" />
        </div>
      </Command>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────── */

function CommandGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 mt-1 first:mt-0 last:mb-0 [&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground/40 [&_[cmdk-group-heading]]:border-t [&_[cmdk-group-heading]]:border-border/20 first:[&_[cmdk-group-heading]]:border-t-0"
    >
      {children}
    </Command.Group>
  );
}

function CommandItem({
  value,
  icon,
  label,
  hint,
  shortcut,
  destructive,
  onSelect,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  shortcut?: string;
  destructive?: boolean;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-3 mx-2 px-3 py-2 text-[13px] cursor-pointer rounded-lg group data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground transition-all duration-100"
    >
      <span className={`w-6 h-6 flex items-center justify-center shrink-0 rounded-md transition-colors ${
        destructive
          ? 'bg-destructive/10 text-destructive/60 group-data-[selected=true]:bg-destructive/15 group-data-[selected=true]:text-destructive'
          : 'bg-subtle/40 text-muted-foreground/40 group-data-[selected=true]:bg-primary/15 group-data-[selected=true]:text-primary'
      }`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={destructive
          ? 'text-destructive/80 group-data-[selected=true]:text-destructive'
          : 'text-foreground/80 group-data-[selected=true]:text-foreground'
        }>
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-muted-foreground/35">{hint}</span>
        )}
      </div>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-muted-foreground/30 bg-subtle/50 border border-border/30 px-1.5 py-0.5 leading-none shrink-0 rounded-sm group-data-[selected=true]:border-border/50 group-data-[selected=true]:text-muted-foreground/60">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}

function FooterHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key, i) => (
        <kbd key={i} className="font-mono text-[10px] text-muted-foreground/30 bg-subtle/40 border border-border/20 px-1.5 py-0.5 leading-none rounded-sm">
          {key}
        </kbd>
      ))}
      <span className="text-[11px] text-muted-foreground/35 ml-1">{label}</span>
    </span>
  );
}

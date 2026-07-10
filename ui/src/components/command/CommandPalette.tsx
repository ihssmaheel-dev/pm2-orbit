import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search, RotateCw, Square, Play, Terminal, Bell, Settings, LayoutGrid,
  RefreshCw, Moon, Sun, ArrowRight,
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
  restart: <RotateCw size={13} />,
  stop: <Square size={13} />,
  start: <Play size={13} />,
  reload: <RefreshCw size={13} />,
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <Command
        className="relative w-full max-w-[540px] bg-card border border-border/60 shadow-2xl overflow-hidden rounded-lg"
        loop
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') close();
        }}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border/30">
          <Search size={15} className="text-primary/70 shrink-0" />
          <Command.Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={query}
            onValueChange={setQuery}
            placeholder="Search pages, processes, actions..."
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
          />
          <kbd className="text-[9px] font-mono text-muted-foreground/30 bg-subtle/40 border border-border/20 px-1.5 py-[2px] leading-none shrink-0 rounded">
            esc
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[420px] overflow-auto py-1.5">
          <Command.Empty className="py-12 text-center">
            <div className="text-[13px] text-muted-foreground/40">No results found</div>
          </Command.Empty>

          {/* ─── Pages ─── */}
          <CommandGroup heading="Pages">
            <CommandItem
              icon={<LayoutGrid size={14} />}
              label="Processes"
              value="processes navigate"
              shortcut="1"
              onSelect={() => { navigate('/processes'); close(); }}
            />
            <CommandItem
              icon={<Terminal size={14} />}
              label="Logs"
              value="logs navigate"
              shortcut="2"
              onSelect={() => { navigate('/logs'); close(); }}
            />
            <CommandItem
              icon={<Bell size={14} />}
              label="Alerts"
              value="alerts navigate"
              shortcut="3"
              onSelect={() => { navigate('/alerts'); close(); }}
            />
            <CommandItem
              icon={<LayoutGrid size={14} />}
              label="History"
              value="history navigate"
              shortcut="4"
              onSelect={() => { navigate('/history'); close(); }}
            />
            <CommandItem
              icon={<Settings size={14} />}
              label="Settings"
              value="settings navigate"
              shortcut="5"
              onSelect={() => { navigate('/settings'); close(); }}
            />
          </CommandGroup>

          {/* ─── Theme ─── */}
          <CommandGroup heading="Theme">
            <CommandItem
              icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              value="theme toggle"
              onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); close(); }}
            />
          </CommandGroup>

          {/* ─── Per-Process Groups ─── */}
          {processList.map((proc) => {
            const st = STATUS_CONFIG[proc.status];
            const actions = getActionsForStatus(proc.status);
            return (
              <CommandGroup key={proc.id} heading={`${proc.name} — ${st.label}`}>
                {/* Open Logs */}
                <CommandItem
                  icon={<Terminal size={13} />}
                  label="Open Logs"
                  value={`${proc.name} logs open`}
                  onSelect={() => { navigate(`/logs/${proc.id}`); close(); }}
                />
                {/* Open in Processes */}
                <CommandItem
                  icon={<ArrowRight size={13} />}
                  label="View in Processes"
                  value={`${proc.name} view process`}
                  onSelect={() => { select(proc.id); navigate('/processes'); close(); }}
                />
                {/* Process actions */}
                {actions.map((action) => (
                  <CommandItem
                    key={action}
                    icon={ACTION_ICONS[action]}
                    label={ACTION_LABELS[action]}
                    value={`${proc.name} ${action} action`}
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
        <div className="flex items-center gap-4 px-4 h-8 border-t border-border/30 bg-subtle/10">
          <FooterHint keys={['↑', '↓']} label="navigate" />
          <FooterHint keys={['↵']} label="select" />
          <FooterHint keys={['esc']} label="close" />
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
      className="mb-1 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.1em] [&_[cmdk-group-heading]]:text-muted-foreground/40"
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
      className="flex items-center gap-3 mx-2 px-3 py-1.5 text-[13px] cursor-pointer rounded-md group data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground transition-colors duration-75"
    >
      <span className={`w-5 flex items-center justify-center shrink-0 transition-colors ${
        destructive
          ? 'text-destructive/50 group-data-[selected=true]:text-destructive'
          : 'text-muted-foreground/30 group-data-[selected=true]:text-primary'
      }`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={destructive
          ? 'text-destructive/80 group-data-[selected=true]:text-destructive'
          : 'text-foreground/70 group-data-[selected=true]:text-foreground'
        }>
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-muted-foreground/30">{hint}</span>
        )}
      </div>
      {shortcut && (
        <kbd className="text-[9px] font-mono text-muted-foreground/25 bg-subtle/40 border border-border/20 px-1.5 py-[2px] leading-none shrink-0 rounded group-data-[selected=true]:border-border/40 group-data-[selected=true]:text-muted-foreground/50">
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
        <kbd key={i} className="font-mono text-[9px] text-muted-foreground/30 bg-subtle/40 border border-border/20 px-1 py-[1px] leading-none rounded">
          {key}
        </kbd>
      ))}
      <span className="text-[10px] text-muted-foreground/30 ml-0.5">{label}</span>
    </span>
  );
}

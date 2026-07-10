import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search, RotateCw, Square, Play, Terminal, Bell, Settings, LayoutGrid,
  RefreshCw, Moon, Sun, FileText, Trash2, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProcessStore } from '@/store/processes';
import { useTheme } from '@/hooks/useTheme';
import type { ProcessStatus } from '@/types/pm2';

const STATUS_CONFIG: Record<ProcessStatus, { label: string; color: string; actions: string[] }> = {
  online: { label: 'Running', color: 'text-success', actions: ['restart', 'reload', 'stop'] },
  stopped: { label: 'Stopped', color: 'text-muted-foreground', actions: ['start'] },
  errored: { label: 'Errored', color: 'text-destructive', actions: ['restart'] },
  launching: { label: 'Starting', color: 'text-warning', actions: [] },
  stopping: { label: 'Stopping', color: 'text-warning', actions: [] },
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
  const onlineCount = useMemo(() => processList.filter((p) => p.status === 'online').length, [processList]);
  const stoppedCount = useMemo(() => processList.filter((p) => p.status === 'stopped').length, [processList]);

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
        <Command.List className="max-h-[400px] overflow-auto py-1.5">
          <Command.Empty className="py-12 text-center">
            <div className="text-[13px] text-muted-foreground/40">No results found</div>
          </Command.Empty>

          {/* ─── Navigate ─── */}
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
              label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              value="theme toggle"
              onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); close(); }}
            />
          </CommandGroup>

          {/* ─── Processes (with status + open logs) ─── */}
          {processList.length > 0 && (
            <CommandGroup heading={`Processes (${processList.length})`}>
              {processList.map((proc) => {
                const st = STATUS_CONFIG[proc.status];
                return (
                  <CommandItem
                    key={proc.id}
                    value={`${proc.name} process PID ${proc.pid} ${proc.status}`}
                    icon={
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        proc.status === 'online' ? 'bg-success' :
                        proc.status === 'errored' ? 'bg-destructive' :
                        proc.status === 'stopped' ? 'bg-muted-foreground/30' :
                        'bg-warning'
                      }`} />
                    }
                    label={proc.name}
                    hint={st.label}
                    onSelect={() => { select(proc.id); navigate('/processes'); close(); }}
                    trailing={
                      <span
                        onClick={(e) => { e.stopPropagation(); navigate(`/logs/${proc.id}`); close(); }}
                        className="text-primary/50 hover:text-primary transition-colors cursor-pointer"
                        title="Open logs"
                      >
                        <Terminal size={12} />
                      </span>
                    }
                  />
                );
              })}
            </CommandGroup>
          )}

          {/* ─── Bulk Actions ─── */}
          {processList.length > 0 && (
            <CommandGroup heading="Bulk Actions">
              {onlineCount > 0 && (
                <>
                  <CommandItem
                    icon={<RotateCw size={14} />}
                    label="Restart All"
                    value="restart all bulk"
                    hint={`${onlineCount} running`}
                    onSelect={async () => {
                      close();
                      const targets = processList.filter((p) => p.status === 'online');
                      const results = await Promise.allSettled(targets.map((p) => runAction(p.id, 'restart')));
                      const ok = results.filter((r) => r.status === 'fulfilled' && r.value).length;
                      if (ok > 0) toast.success(`Restarted ${ok} process${ok !== 1 ? 'es' : ''}`);
                      else toast.error('Failed to restart');
                    }}
                  />
                  <CommandItem
                    icon={<Square size={14} />}
                    label="Stop All"
                    value="stop all bulk"
                    hint={`${onlineCount} running`}
                    destructive
                    onSelect={async () => {
                      close();
                      const targets = processList.filter((p) => p.status === 'online');
                      const results = await Promise.allSettled(targets.map((p) => runAction(p.id, 'stop')));
                      const ok = results.filter((r) => r.status === 'fulfilled' && r.value).length;
                      if (ok > 0) toast.success(`Stopped ${ok} process${ok !== 1 ? 'es' : ''}`);
                      else toast.error('Failed to stop');
                    }}
                  />
                  <CommandItem
                    icon={<RefreshCw size={14} />}
                    label="Reload All"
                    value="reload all bulk"
                    hint={`${onlineCount} running`}
                    onSelect={async () => {
                      close();
                      const targets = processList.filter((p) => p.status === 'online');
                      const results = await Promise.allSettled(targets.map((p) => runAction(p.id, 'reload')));
                      const ok = results.filter((r) => r.status === 'fulfilled' && r.value).length;
                      if (ok > 0) toast.success(`Reloaded ${ok} process${ok !== 1 ? 'es' : ''}`);
                      else toast.error('Failed to reload');
                    }}
                  />
                </>
              )}
              {stoppedCount > 0 && (
                <CommandItem
                  icon={<Play size={14} />}
                  label="Start All"
                  value="start all bulk"
                  hint={`${stoppedCount} stopped`}
                  onSelect={async () => {
                    close();
                    const targets = processList.filter((p) => p.status === 'stopped');
                    const results = await Promise.allSettled(targets.map((p) => runAction(p.id, 'start')));
                    const ok = results.filter((r) => r.status === 'fulfilled' && r.value).length;
                    if (ok > 0) toast.success(`Started ${ok} process${ok !== 1 ? 'es' : ''}`);
                    else toast.error('Failed to start');
                  }}
                />
              )}
            </CommandGroup>
          )}
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
  trailing,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  shortcut?: string;
  destructive?: boolean;
  onSelect: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex items-center gap-3 mx-2 px-3 py-2 text-[13px] cursor-pointer rounded-md group data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground transition-colors duration-75"
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
      {trailing && (
        <span className="shrink-0 mr-1">{trailing}</span>
      )}
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

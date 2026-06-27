import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Command } from 'cmdk';
import { Search, RotateCw, Square, Play, Terminal, Bell, Settings, LayoutGrid, RefreshCw, Moon, Sun } from 'lucide-react';
import { useProcessStore } from '@/store/processes';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/hooks/useTheme';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const processes = useProcessStore((s) => s.processes);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const select = useProcessStore((s) => s.select);
  const { theme, setTheme } = useTheme();

  const processList = useMemo(() => Array.from(processes.values()), [processes]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const runAction = useCallback(async (processId: number, action: string) => {
    try {
      await fetch(`/api/processes/${processId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch {
      // Action failed
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[16vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <Command
        className="relative w-full max-w-[520px] bg-card border border-border shadow-[0_16px_70px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
        loop
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') close();
        }}
      >
        {/* Search */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40">
          <Search size={16} className="text-primary/60 shrink-0" />
          <Command.Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={query}
            onValueChange={setQuery}
            placeholder="Search commands, processes, actions..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground/30 bg-subtle/50 border border-border/30 px-1.5 py-[3px] leading-none shrink-0 rounded-sm">
            esc
          </kbd>
        </div>

        {/* Results */}
        <Command.List className="max-h-[360px] overflow-auto py-2">
          <Command.Empty className="py-14 text-center">
            <div className="text-sm text-muted-foreground/50">No results found</div>
            <div className="text-[11px] text-muted-foreground/30 mt-1.5">Try a different search term</div>
          </Command.Empty>

          {/* Navigate */}
          <CommandGroup heading="Navigate">
            <CommandItem
              value="Processes navigate"
              icon={<LayoutGrid size={14} />}
              label="Processes"
              shortcut="1"
              onSelect={() => { setActiveTab('processes'); close(); }}
            />
            <CommandItem
              value="Logs navigate"
              icon={<Terminal size={14} />}
              label="Logs"
              shortcut="2"
              onSelect={() => { setActiveTab('logs'); close(); }}
            />
            <CommandItem
              value="Alerts navigate"
              icon={<Bell size={14} />}
              label="Alerts"
              shortcut="3"
              onSelect={() => { setActiveTab('alerts'); close(); }}
            />
            <CommandItem
              value="History navigate"
              icon={<LayoutGrid size={14} />}
              label="History"
              shortcut="4"
              onSelect={() => { setActiveTab('history'); close(); }}
            />
            <CommandItem
              value="Settings navigate"
              icon={<Settings size={14} />}
              label="Settings"
              shortcut="5"
              onSelect={() => { setActiveTab('settings'); close(); }}
            />
          </CommandGroup>

          {/* Preferences */}
          <CommandGroup heading="Preferences">
            <CommandItem
              value="Toggle theme preferences"
              icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); close(); }}
            />
          </CommandGroup>

          {/* Processes */}
          {processList.length > 0 && (
            <CommandGroup heading="Processes">
              {processList.map((proc) => (
                <CommandItem
                  key={proc.id}
                  value={`${proc.name} process PID ${proc.pid}`}
                  icon={
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                      proc.status === 'online' ? 'bg-success' :
                      proc.status === 'errored' ? 'bg-destructive' :
                      proc.status === 'stopped' ? 'bg-muted-foreground/40' :
                      'bg-warning'
                    }`} />
                  }
                  label={proc.name}
                  hint={`PID ${proc.pid}`}
                  onSelect={() => { select(proc.id); setActiveTab('processes'); close(); }}
                />
              ))}
            </CommandGroup>
          )}

          {/* Process Actions */}
          {processList.length > 0 && (
            <CommandGroup heading="Process Actions">
              {processList.map((proc) => (
                <CommandItem
                  key={`restart-${proc.id}`}
                  value={`Restart ${proc.name} process action`}
                  icon={<RotateCw size={14} />}
                  label={`Restart ${proc.name}`}
                  onSelect={() => { runAction(proc.id, 'restart'); close(); }}
                />
              ))}
              {processList.map((proc) => (
                <CommandItem
                  key={`stop-${proc.id}`}
                  value={`Stop ${proc.name} process action`}
                  icon={<Square size={14} />}
                  label={`Stop ${proc.name}`}
                  destructive
                  onSelect={() => { runAction(proc.id, 'stop'); close(); }}
                />
              ))}
              {processList.map((proc) => (
                <CommandItem
                  key={`start-${proc.id}`}
                  value={`Start ${proc.name} process action`}
                  icon={<Play size={14} />}
                  label={`Start ${proc.name}`}
                  onSelect={() => { runAction(proc.id, 'start'); close(); }}
                />
              ))}
            </CommandGroup>
          )}

          {/* Bulk Actions */}
          {processList.length > 0 && (
            <CommandGroup heading="Bulk Actions">
              <CommandItem
                value="Restart all processes bulk"
                icon={<RotateCw size={14} />}
                label="Restart All"
                hint={`${processList.length} processes`}
                onSelect={() => { processList.forEach((p) => runAction(p.id, 'restart')); close(); }}
              />
              <CommandItem
                value="Stop all processes bulk"
                icon={<Square size={14} />}
                label="Stop All"
                hint={`${processList.length} processes`}
                destructive
                onSelect={() => { processList.forEach((p) => runAction(p.id, 'stop')); close(); }}
              />
              <CommandItem
                value="Reload all processes bulk"
                icon={<RefreshCw size={14} />}
                label="Reload All"
                hint={`${processList.length} processes`}
                onSelect={() => { processList.forEach((p) => runAction(p.id, 'reload')); close(); }}
              />
            </CommandGroup>
          )}
        </Command.List>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 h-9 border-t border-border/30 bg-subtle/20">
          <FooterHint keys={['↑', '↓']} label="navigate" />
          <FooterHint keys={['↵']} label="select" />
          <FooterHint keys={['esc']} label="close" />
        </div>
      </Command>
    </div>
  );
}

function CommandGroup({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="mb-1 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground/40"
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
      className="flex items-center gap-3 mx-2 px-3 py-2 text-[13px] cursor-pointer rounded-sm group data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground transition-colors duration-75"
    >
      <span className={`w-5 flex items-center justify-center shrink-0 transition-colors ${
        destructive
          ? 'text-destructive/60 group-data-[selected=true]:text-destructive'
          : 'text-muted-foreground/35 group-data-[selected=true]:text-primary'
      }`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={destructive
          ? 'text-destructive/80 group-data-[selected=true]:text-destructive'
          : 'text-foreground/75 group-data-[selected=true]:text-foreground'
        }>
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-muted-foreground/30">
            {hint}
          </span>
        )}
      </div>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-muted-foreground/25 bg-subtle/40 border border-border/20 px-1.5 py-[2px] leading-none shrink-0 rounded-sm group-data-[selected=true]:border-border/40 group-data-[selected=true]:text-muted-foreground/50">
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
        <kbd key={i} className="font-mono text-[10px] text-muted-foreground/30 bg-subtle/40 border border-border/20 px-1 py-[1px] leading-none rounded-sm">
          {key}
        </kbd>
      ))}
      <span className="text-[10px] text-muted-foreground/30 ml-0.5">{label}</span>
    </span>
  );
}

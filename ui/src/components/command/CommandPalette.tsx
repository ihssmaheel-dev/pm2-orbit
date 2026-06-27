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
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} />

      <div className="absolute inset-0 flex items-start justify-center pt-[18vh]">
        <Command
          className="relative w-full max-w-[520px] bg-card border border-border/80 overflow-hidden"
          loop
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Escape') close();
          }}
        >
          {/* Search */}
          <div className="flex items-center gap-3 px-5 h-[52px] border-b border-border/50">
            <Search size={15} className="text-muted-foreground/40 shrink-0" />
            <Command.Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={query}
              onValueChange={setQuery}
              placeholder="Search commands, processes, actions..."
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/35 focus:outline-none font-light"
            />
            <kbd className="text-[10px] font-mono text-muted-foreground/30 border border-border/40 px-1.5 py-[3px] leading-none shrink-0">
              esc
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[340px] overflow-auto p-1.5">
            <Command.Empty className="py-12 text-center">
              <div className="text-sm text-muted-foreground/40">No results found</div>
              <div className="text-[11px] text-muted-foreground/25 mt-1">Try a different search term</div>
            </Command.Empty>

            <Command.Group heading="Navigate" className="mb-1.5">
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
            </Command.Group>

            <Command.Group heading="Preferences" className="mb-1.5">
              <CommandItem
                value="Toggle theme preferences"
                icon={theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                label={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); close(); }}
              />
            </Command.Group>

            <Command.Group heading="Processes" className="mb-1.5">
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
                  hint={`PID ${proc.pid} · ${proc.mode}`}
                  onSelect={() => { select(proc.id); setActiveTab('processes'); close(); }}
                />
              ))}
            </Command.Group>

            <Command.Group heading="Process Actions" className="mb-1.5">
              {processList.map((proc) => (
                <CommandItem
                  key={`actions-${proc.id}`}
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
            </Command.Group>

            <Command.Group heading="Bulk Actions" className="mb-1.5">
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
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-5 px-5 h-[34px] border-t border-border/40 text-[10px] text-muted-foreground/30">
            <span className="flex items-center gap-1.5">
              <kbd className="font-mono border border-border/30 px-1 py-[1px] leading-none">↑</kbd>
              <kbd className="font-mono border border-border/30 px-1 py-[1px] leading-none">↓</kbd>
              <span className="ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="font-mono border border-border/30 px-1 py-[1px] leading-none">↵</kbd>
              <span className="ml-0.5">select</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="font-mono border border-border/30 px-1.5 py-[1px] leading-none">esc</kbd>
              <span className="ml-0.5">close</span>
            </span>
          </div>
        </Command>
      </div>
    </div>
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
      className="flex items-center gap-3 px-3 py-[7px] text-[13px] cursor-pointer rounded-none group data-[selected=true]:bg-primary/[0.08] transition-colors duration-75"
    >
      <span className={`w-5 flex items-center justify-center shrink-0 ${
        destructive ? 'text-destructive/70' : 'text-muted-foreground/40 group-data-[selected=true]:text-primary/80'
      }`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={destructive ? 'text-destructive/90' : 'text-foreground/80 group-data-[selected=true]:text-foreground'}>
          {label}
        </span>
        {hint && (
          <span className="text-[11px] text-muted-foreground/35">
            {hint}
          </span>
        )}
      </div>
      {shortcut && (
        <kbd className="text-[10px] font-mono text-muted-foreground/25 border border-border/30 px-1.5 py-[2px] leading-none shrink-0 group-data-[selected=true]:border-border/50">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}

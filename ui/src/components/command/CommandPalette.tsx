import { useState, useEffect, useCallback, useMemo } from 'react';
import { Command } from 'cmdk';
import { Search, RotateCw, Square, Play, Terminal, Bell, Settings, LayoutGrid, RefreshCw, Moon, Sun } from 'lucide-react';
import { useProcessStore } from '@/store/processes';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/hooks/useTheme';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
  shortcut?: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const processes = useProcessStore((s) => s.processes);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const select = useProcessStore((s) => s.select);
  const { theme, setTheme } = useTheme();

  const processList = useMemo(() => Array.from(processes.values()), [processes]);

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

  const items: CommandItem[] = useMemo(() => {
    const cmds: CommandItem[] = [
      { id: 'nav-processes', label: 'Go to Processes', icon: <LayoutGrid size={14} />, action: () => { setActiveTab('processes'); setOpen(false); }, category: 'Navigation', shortcut: '1' },
      { id: 'nav-logs', label: 'Go to Logs', icon: <Terminal size={14} />, action: () => { setActiveTab('logs'); setOpen(false); }, category: 'Navigation', shortcut: '2' },
      { id: 'nav-alerts', label: 'Go to Alerts', icon: <Bell size={14} />, action: () => { setActiveTab('alerts'); setOpen(false); }, category: 'Navigation', shortcut: '3' },
      { id: 'nav-history', label: 'Go to History', icon: <LayoutGrid size={14} />, action: () => { setActiveTab('history'); setOpen(false); }, category: 'Navigation', shortcut: '4' },
      { id: 'nav-settings', label: 'Go to Settings', icon: <Settings size={14} />, action: () => { setActiveTab('settings'); setOpen(false); }, category: 'Navigation', shortcut: '5' },
      { id: 'action-restart-all', label: 'Restart All Processes', icon: <RotateCw size={14} />, action: () => { processList.forEach((p) => runAction(p.id, 'restart')); setOpen(false); }, category: 'Actions' },
      { id: 'action-stop-all', label: 'Stop All Processes', icon: <Square size={14} />, action: () => { processList.forEach((p) => runAction(p.id, 'stop')); setOpen(false); }, category: 'Actions' },
      { id: 'theme-toggle', label: 'Toggle Theme', icon: theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />, action: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); setOpen(false); }, category: 'Appearance' },
      { id: 'action-restart-all-2', label: 'Reload All Processes', icon: <RefreshCw size={14} />, action: () => { processList.forEach((p) => runAction(p.id, 'reload')); setOpen(false); }, category: 'Actions' },
    ];

    for (const proc of processList) {
      cmds.push({
        id: `proc-${proc.id}`,
        label: `${proc.name} (PID ${proc.pid})`,
        icon: <div className={`w-2 h-2 rounded-full ${proc.status === 'online' ? 'bg-success' : proc.status === 'errored' ? 'bg-destructive' : 'bg-muted-foreground'}`} />,
        action: () => { select(proc.id); setActiveTab('processes'); setOpen(false); },
        category: 'Processes',
      });
      cmds.push({
        id: `restart-${proc.id}`,
        label: `Restart ${proc.name}`,
        icon: <RotateCw size={14} />,
        action: () => { runAction(proc.id, 'restart'); setOpen(false); },
        category: 'Process Actions',
      });
      cmds.push({
        id: `stop-${proc.id}`,
        label: `Stop ${proc.name}`,
        icon: <Square size={14} />,
        action: () => { runAction(proc.id, 'stop'); setOpen(false); },
        category: 'Process Actions',
      });
      cmds.push({
        id: `start-${proc.id}`,
        label: `Start ${proc.name}`,
        icon: <Play size={14} />,
        action: () => { runAction(proc.id, 'start'); setOpen(false); },
        category: 'Process Actions',
      });
    }

    return cmds;
  }, [processList, setActiveTab, select, runAction, theme, setTheme]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [items, query]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <Command
        className="relative w-full max-w-lg bg-card border border-border shadow-glow-lg overflow-hidden"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') setOpen(false);
        }}
      >
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <Search size={14} className="text-muted-foreground/60 shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-muted-foreground/40 border border-border/60 px-1.5 py-0.5 leading-none">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[300px] overflow-auto p-1">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground/50">
            No results found
          </Command.Empty>

          {(['Navigation', 'Actions', 'Appearance', 'Processes', 'Process Actions'] as const).map((cat) => {
            const catItems = filtered.filter((i) => i.category === cat);
            if (catItems.length === 0) return null;
            return (
              <Command.Group key={cat} heading={cat} className="mb-1">
                {catItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.label}
                    onSelect={() => item.action()}
                    className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer text-foreground/80 rounded-none data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary transition-colors"
                  >
                    <span className="text-muted-foreground/60">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <kbd className="text-[10px] font-mono text-muted-foreground/40 border border-border/60 px-1.5 py-0.5 leading-none">
                        {item.shortcut}
                      </kbd>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            );
          })}
        </Command.List>

        <div className="flex items-center gap-4 px-4 h-9 border-t border-border text-[10px] text-muted-foreground/40">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </Command>
    </div>
  );
}

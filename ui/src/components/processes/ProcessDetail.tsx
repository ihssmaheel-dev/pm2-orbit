import { useState, useEffect, useRef, useCallback } from 'react';
import { X, RotateCw, Hash, Server, Eye, EyeOff, MousePointerClick, Search, FileText, Cpu, MemoryStick } from 'lucide-react';
import { useProcessStore } from '@/store/processes';
import { useNotesStore } from '@/store/notes';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { Badge } from '@/components/shared/Badge';
import { UptimeBar } from './UptimeBar';
import { CpuChart, MemoryChart } from '@/components/charts/Charts';
import { ActionMenu } from './ActionMenu';
import { formatBytes, formatDuration } from '@/lib/format';
import { useLiveUptime } from '@/hooks/useLiveUptime';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  online: 'success',
  stopped: 'outline',
  errored: 'destructive',
  launching: 'warning',
  stopping: 'warning',
};

const SENSITIVE_REGEX = /KEY|SECRET|TOKEN|PASS|PASSWORD|CREDENTIAL|AUTH|API/i;
const PM2_PREFIX = /^pm_|^exec_/;

function shouldMask(key: string): boolean {
  return SENSITIVE_REGEX.test(key);
}

export function ProcessDetail() {
  const selectedId = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const process = useProcessStore((s) => (selectedId !== null ? s.processes.get(selectedId) : undefined));
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [showMasked, setShowMasked] = useState(true);
  const [envSearch, setEnvSearch] = useState('');
  const liveUptime = useLiveUptime(process);

  useEffect(() => {
    if (process) {
      setEnvVars({});
      fetch(`/api/processes/${process.id}/env`)
        .then((res) => res.json())
        .then((data) => setEnvVars(data))
        .catch(() => setEnvVars({}));
    }
  }, [process?.id]);

  if (!process) {
    return (
      <div className="w-full lg:w-[400px] shrink-0 h-full bg-card border border-border/60 flex flex-col items-center justify-center">
        <MousePointerClick size={28} className="text-muted-foreground/15 mb-3" />
        <p className="text-[13px] text-muted-foreground/35">Select a process</p>
      </div>
    );
  }

  const isOnline = process.status === 'online';
  const cpuData = { ts: process.history.ts, values: process.history.cpu };
  const memData = { ts: process.history.ts, values: process.history.memory };

  const envEntries = Object.entries(envVars)
    .filter(([key]) => !envSearch || key.toLowerCase().includes(envSearch.toLowerCase()))
    .sort(([a], [b]) => {
      const aPm2 = PM2_PREFIX.test(a) ? 0 : 1;
      const bPm2 = PM2_PREFIX.test(b) ? 0 : 1;
      if (aPm2 !== bPm2) return aPm2 - bPm2;
      return a.localeCompare(b);
    });

  const pm2Vars = envEntries.filter(([k]) => PM2_PREFIX.test(k));
  const appVars = envEntries.filter(([k]) => !PM2_PREFIX.test(k));

  return (
    <div className="w-full lg:w-[400px] shrink-0 h-full bg-card border border-border/60 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[48px] border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-[13px] font-semibold text-foreground truncate">
            {process.name}
          </h2>
          <Badge variant={statusVariant[process.status] || 'outline'} className="text-[9px]">
            {process.status}
          </Badge>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <ActionMenu processId={process.id} processName={process.name} />
          <button
            onClick={() => select(null)}
            aria-label="Close detail panel"
            className="h-7 w-7 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer rounded hover:bg-subtle/30"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 border-b border-border/40 shrink-0">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="environment">Env</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-4 min-h-0">
            {/* ─── Overview Tab ─── */}
            <TabsContent value="overview">
              <div className="space-y-3">
                {/* Status + Actions */}
                <div className="flex items-center gap-2 p-3 bg-subtle/20 border border-border/30 rounded-md">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isOnline ? 'bg-success' : process.status === 'errored' ? 'bg-destructive' : 'bg-muted-foreground/30'
                    }`} />
                    <span className="text-[12px] font-medium text-foreground/80">
                      {isOnline ? 'Running' : process.status === 'stopped' ? 'Stopped' : process.status === 'errored' ? 'Errored' : process.status}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground/50">
                    {isOnline ? formatDuration(liveUptime) : '—'}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <StatBox icon={<Hash size={11} />} label="PID" value={isOnline ? String(process.pid) : '—'} />
                  <StatBox icon={<Server size={11} />} label="Mode" value={process.mode} />
                  <StatBox icon={<RotateCw size={11} />} label="Restarts" value={String(process.restarts)} />
                  <StatBox icon={<Cpu size={11} />} label="CPU" value={isOnline ? `${process.cpu.toFixed(1)}%` : '—'}
                    color={isOnline && process.cpu > 80 ? 'text-destructive' : isOnline && process.cpu > 50 ? 'text-warning' : ''} />
                  <StatBox icon={<MemoryStick size={11} />} label="Memory" value={isOnline ? formatBytes(process.memory) : '—'} />
                  <StatBox label="Instances" value={String(process.instances)} />
                </div>

                {/* Uptime Bar */}
                {process.statusHistory && process.statusHistory.length > 0 && (
                  <UptimeBar history={process.statusHistory} />
                )}

                {/* Note */}
                <NoteSection processName={process.name} />
              </div>
            </TabsContent>

            {/* ─── Metrics Tab ─── */}
            <TabsContent value="metrics">
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 mb-1.5">CPU Usage</div>
                  <div className="bg-subtle/20 border border-border/30 p-2.5 rounded-md">
                    {isOnline ? <CpuChart data={cpuData} /> : <div className="h-[120px] flex items-center justify-center text-[11px] text-muted-foreground/35">No data while stopped</div>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 mb-1.5">Memory Usage</div>
                  <div className="bg-subtle/20 border border-border/30 p-2.5 rounded-md">
                    {isOnline ? <MemoryChart data={memData} /> : <div className="h-[120px] flex items-center justify-center text-[11px] text-muted-foreground/35">No data while stopped</div>}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ─── Environment Tab ─── */}
            <TabsContent value="environment">
              <div className="space-y-2.5">
                {/* Search + Mask toggle */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/35" />
                    <input
                      type="text"
                      placeholder="Filter variables..."
                      value={envSearch}
                      onChange={(e) => setEnvSearch(e.target.value)}
                      className="w-full h-8 pl-7 pr-2 text-[11px] font-mono bg-subtle/20 border border-border/40 text-foreground/80 outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/30 rounded-md"
                    />
                  </div>
                  <button
                    onClick={() => setShowMasked(!showMasked)}
                    className="h-8 w-8 flex items-center justify-center text-muted-foreground/50 hover:text-foreground border border-border/40 hover:border-border/60 transition-colors cursor-pointer rounded-md"
                    title={showMasked ? 'Show sensitive values' : 'Hide sensitive values'}
                  >
                    {showMasked ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>

                {/* Env vars */}
                {appVars.length === 0 && pm2Vars.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/35 py-10 text-center">
                    {envSearch ? 'No variables match' : 'No environment variables'}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pm2Vars.length > 0 && (
                      <EnvSection title="PM2" vars={pm2Vars} showMasked={showMasked} />
                    )}
                    {appVars.length > 0 && (
                      <EnvSection title="Application" vars={appVars} showMasked={showMasked} />
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────── */

function StatBox({ icon, label, value, color }: { icon?: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="bg-subtle/20 border border-border/30 p-2.5 rounded-md">
      <div className="flex items-center gap-1 mb-1">
        {icon && <span className="text-muted-foreground/40">{icon}</span>}
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/45">{label}</span>
      </div>
      <span className={`text-[12px] font-mono font-medium ${color || 'text-foreground/80'} ${value === '—' ? 'text-muted-foreground/25' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function EnvSection({ title, vars, showMasked }: { title: string; vars: [string, string][]; showMasked: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40 mb-1.5 px-0.5">{title}</div>
      <div className="border border-border/30 rounded-md overflow-hidden divide-y divide-border/20">
        {vars.map(([key, value]) => (
          <EnvRow key={key} name={key} value={value} masked={shouldMask(key) && showMasked} />
        ))}
      </div>
    </div>
  );
}

function EnvRow({ name, value, masked }: { name: string; value: string; masked: boolean }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-subtle/10 hover:bg-subtle/20 transition-colors">
      <span className="text-[10px] font-mono text-primary/60 shrink-0 min-w-[130px] truncate" title={name}>
        {name}
      </span>
      <span className="text-[10px] font-mono text-foreground/55 break-all" title={masked ? undefined : value}>
        {masked ? '••••••••' : value}
      </span>
    </div>
  );
}

function NoteSection({ processName }: { processName: string }) {
  const notes = useNotesStore((s) => s.notes);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNoteAction = useNotesStore((s) => s.deleteNote);
  const currentNote = notes[processName] || '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentNote);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(currentNote);
    setEditing(false);
  }, [processName, currentNote]);

  const save = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== currentNote) {
      updateNote(processName, trimmed);
    } else if (!trimmed && currentNote) {
      deleteNoteAction(processName);
    }
    setEditing(false);
  }, [draft, currentNote, processName, updateNote, deleteNoteAction]);

  const handleFocus = () => {
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <div className="bg-subtle/20 border border-border/30 rounded-md overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/20">
        <FileText size={11} className="text-muted-foreground/40" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/45">Note</span>
      </div>
      <div className="px-3 py-2">
        {editing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full text-[11px] text-foreground/80 bg-background/50 border border-border/40 p-2 resize-none outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/30 rounded-md"
            />
            <div className="flex justify-end gap-1.5">
              <button
                onClick={() => { setDraft(currentNote); setEditing(false); }}
                className="h-6 px-2.5 text-[10px] text-muted-foreground hover:text-foreground border border-border/40 hover:border-border/60 transition-colors cursor-pointer rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="h-6 px-2.5 text-[10px] font-medium text-primary-foreground bg-primary hover:bg-primary-hover transition-colors cursor-pointer rounded-md"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={handleFocus}
            className="min-h-[28px] text-[11px] text-foreground/55 cursor-text hover:text-foreground/75 transition-colors whitespace-pre-wrap"
          >
            {currentNote || (
              <span className="text-muted-foreground/30 italic">Click to add a note...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

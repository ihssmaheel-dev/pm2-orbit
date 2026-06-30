import { useState, useEffect } from 'react';
import { X, Clock, RotateCw, Hash, Server, Eye, EyeOff, MousePointerClick, Search } from 'lucide-react';
import { useProcessStore } from '@/store/processes';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { Badge } from '@/components/shared/Badge';
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
      fetch(`/api/processes/${process.id}/env`)
        .then((res) => res.json())
        .then((data) => setEnvVars(data))
        .catch(() => setEnvVars({}));
    }
  }, [process]);

  if (!process) {
    return (
      <div className="w-full lg:w-[420px] shrink-0 h-full bg-card border border-border/60 flex flex-col items-center justify-center">
        <MousePointerClick size={32} className="text-muted-foreground/20 mb-4" />
        <p className="text-sm text-muted-foreground/40">Select a process to view details</p>
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
    <div className="w-full lg:w-[420px] shrink-0 h-full bg-card border border-border/60 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 h-[52px] border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-foreground truncate">
            {process.name}
          </h2>
          <Badge variant={statusVariant[process.status] || 'outline'}>
            {process.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ActionMenu processId={process.id} processName={process.name} />
          <button
            onClick={() => select(null)}
            aria-label="Close detail panel"
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <div className="px-5 border-b border-border/40 shrink-0">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="environment">Env</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-5 min-h-0">
            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Hash size={13} />} label="PID" value={isOnline ? String(process.pid) : '—'} />
                  <StatCard icon={<Server size={13} />} label="Mode" value={process.mode} />
                  <StatCard icon={<Clock size={13} />} label="Uptime" value={isOnline ? formatDuration(liveUptime) : '—'} />
                  <StatCard icon={<RotateCw size={13} />} label="Restarts" value={String(process.restarts)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="CPU" value={isOnline ? `${process.cpu.toFixed(1)}%` : '—'} color={isOnline && process.cpu > 80 ? 'text-destructive' : isOnline && process.cpu > 50 ? 'text-warning' : ''} />
                  <StatCard label="Memory" value={isOnline ? formatBytes(process.memory) : '—'} />
                  <StatCard label="Instances" value={String(process.instances)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metrics">
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2">CPU Usage</div>
                  <div className="bg-subtle/30 border border-border/30 p-3">
                    {isOnline ? <CpuChart data={cpuData} /> : <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground/40">No data while stopped</div>}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2">Memory Usage</div>
                  <div className="bg-subtle/30 border border-border/30 p-3">
                    {isOnline ? <MemoryChart data={memData} /> : <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground/40">No data while stopped</div>}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="environment">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                    <input
                      type="text"
                      placeholder="Filter variables..."
                      value={envSearch}
                      onChange={(e) => setEnvSearch(e.target.value)}
                      className="w-full h-7 pl-7 pr-2 text-[11px] font-mono bg-subtle/30 border border-border/40 text-foreground/80 outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/30"
                    />
                  </div>
                  <button
                    onClick={() => setShowMasked(!showMasked)}
                    className="flex items-center gap-1 h-7 px-2 text-[10px] text-muted-foreground/60 hover:text-foreground border border-border/40 hover:border-border/80 transition-colors"
                    title={showMasked ? 'Show sensitive values' : 'Hide sensitive values'}
                  >
                    {showMasked ? <EyeOff size={11} /> : <Eye size={11} />}
                  </button>
                </div>

                {appVars.length === 0 && pm2Vars.length === 0 ? (
                  <div className="text-xs text-muted-foreground/40 py-8 text-center">
                    {envSearch ? 'No environment variables match your search' : 'No environment variables available'}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {pm2Vars.length > 0 && (
                      <>
                        <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 px-1 pt-1 pb-1.5">PM2</div>
                        {pm2Vars.map(([key, value]) => (
                          <EnvRow key={key} name={key} value={value} masked={shouldMask(key) && showMasked} />
                        ))}
                      </>
                    )}
                    {appVars.length > 0 && (
                      <>
                        <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 px-1 pt-3 pb-1.5">Application</div>
                        {appVars.map(([key, value]) => (
                          <EnvRow key={key} name={key} value={value} masked={shouldMask(key) && showMasked} />
                        ))}
                      </>
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

function EnvRow({ name, value, masked }: { name: string; value: string; masked: boolean }) {
  return (
    <div className="flex items-start gap-2 px-3 py-1.5 bg-subtle/20 border border-border/20">
      <span className="text-[10px] font-mono text-primary/70 shrink-0 min-w-[140px] truncate" title={name}>
        {name}
      </span>
      <span className="text-[10px] font-mono text-foreground/60 break-all" title={masked ? undefined : value}>
        {masked ? '••••••••' : value}
      </span>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon?: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="bg-subtle/30 border border-border/30 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">{label}</span>
      </div>
      <span className={`text-sm font-mono font-medium ${color || 'text-foreground'} ${value === '—' ? 'text-muted-foreground/30' : ''}`}>
        {value}
      </span>
    </div>
  );
}

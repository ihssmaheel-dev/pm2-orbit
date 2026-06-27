import { useState, useEffect } from 'react';
import { X, Clock, RotateCw, Hash, Server, Eye, EyeOff, MousePointerClick } from 'lucide-react';
import { useProcessStore } from '@/store/processes';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import { Badge } from '@/components/shared/Badge';
import { CpuChart, MemoryChart } from '@/components/charts/Charts';
import { ActionMenu } from './ActionMenu';
import { formatBytes, formatDuration } from '@/lib/format';

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'outline'> = {
  online: 'success',
  stopped: 'outline',
  errored: 'destructive',
  launching: 'warning',
  stopping: 'warning',
};

const SENSITIVE_REGEX = /KEY|SECRET|TOKEN|PASS|PASSWORD|CREDENTIAL|AUTH|API/i;

function shouldMask(key: string): boolean {
  return SENSITIVE_REGEX.test(key);
}

export function ProcessDetail() {
  const selectedId = useProcessStore((s) => s.selectedId);
  const select = useProcessStore((s) => s.select);
  const process = useProcessStore((s) => (selectedId !== null ? s.processes.get(selectedId) : undefined));
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [showMasked, setShowMasked] = useState(true);

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
      <div className="w-[420px] shrink-0 h-full bg-card border border-border/60 flex flex-col items-center justify-center">
        <MousePointerClick size={32} className="text-muted-foreground/20 mb-4" />
        <p className="text-sm text-muted-foreground/40">Select a process to view details</p>
      </div>
    );
  }

  const cpuData = { ts: process.history.ts, values: process.history.cpu };
  const memData = { ts: process.history.ts, values: process.history.memory };
  const envEntries = Object.entries(envVars);

  return (
    <div className="w-[420px] shrink-0 h-full bg-card border border-border/60 flex flex-col overflow-hidden">
      {/* Header */}
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

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="overview">
          <div className="px-5 border-b border-border/40 shrink-0">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="environment">Env</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-5">
            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={<Hash size={13} />} label="PID" value={String(process.pid)} />
                  <StatCard icon={<Server size={13} />} label="Mode" value={process.mode} />
                  <StatCard icon={<Clock size={13} />} label="Uptime" value={formatDuration(process.uptime)} />
                  <StatCard icon={<RotateCw size={13} />} label="Restarts" value={String(process.restarts)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="CPU" value={`${process.cpu.toFixed(1)}%`} color={process.cpu > 80 ? 'text-destructive' : process.cpu > 50 ? 'text-warning' : 'text-foreground'} />
                  <StatCard label="Memory" value={formatBytes(process.memory)} />
                  <StatCard label="Instances" value={String(process.instances)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metrics">
              <div className="space-y-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2">CPU Usage</div>
                  <div className="bg-subtle/30 border border-border/30 p-3">
                    <CpuChart data={cpuData} />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-2">Memory Usage</div>
                  <div className="bg-subtle/30 border border-border/30 p-3">
                    <MemoryChart data={memData} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="environment">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                    Environment Variables
                  </span>
                  <button
                    onClick={() => setShowMasked(!showMasked)}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showMasked ? <EyeOff size={11} /> : <Eye size={11} />}
                    {showMasked ? 'Show' : 'Hide'}
                  </button>
                </div>

                {envEntries.length === 0 ? (
                  <div className="text-xs text-muted-foreground/40 py-8 text-center">
                    No environment variables available
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {envEntries.map(([key, value]) => {
                      const isMasked = shouldMask(key) && showMasked;
                      return (
                        <div
                          key={key}
                          className="flex items-start gap-2 px-3 py-1.5 bg-subtle/20 border border-border/20"
                        >
                          <span className="text-[10px] font-mono text-primary/70 shrink-0 min-w-[140px]">
                            {key}
                          </span>
                          <span className="text-[10px] font-mono text-foreground/60 break-all">
                            {isMasked ? '••••••••' : value}
                          </span>
                        </div>
                      );
                    })}
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

function StatCard({ icon, label, value, color }: { icon?: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="bg-subtle/30 border border-border/30 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">{label}</span>
      </div>
      <span className={`text-sm font-mono font-medium ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { X, Clock, RotateCw, Hash, Server, Eye, EyeOff } from 'lucide-react';
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

  if (!process) return null;

  const cpuData = { ts: process.history.ts, values: process.history.cpu };
  const memData = { ts: process.history.ts, values: process.history.memory };

  const envEntries = Object.entries(envVars);

  return (
    <div className="w-[65%] h-full border-l border-border bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-light tracking-wider uppercase">{process.name}</h2>
          <Badge variant={statusVariant[process.status] || 'outline'}>
            {process.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <ActionMenu processId={process.id} processName={process.name} />
          <button
            onClick={() => select(null)}
            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <InfoRow icon={<Hash size={14} />} label="PID" value={String(process.pid)} />
              <InfoRow icon={<Server size={14} />} label="Mode" value={process.mode} />
              <InfoRow icon={<Clock size={14} />} label="Uptime" value={formatDuration(process.uptime)} />
              <InfoRow icon={<RotateCw size={14} />} label="Restarts" value={String(process.restarts)} />
              <InfoRow label="CPU" value={`${process.cpu.toFixed(1)}%`} />
              <InfoRow label="Memory" value={formatBytes(process.memory)} />
              <InfoRow label="Instances" value={String(process.instances)} />
            </div>
          </TabsContent>

          <TabsContent value="metrics">
            <div className="space-y-6">
              <CpuChart data={cpuData} />
              <MemoryChart data={memData} />
            </div>
          </TabsContent>

          <TabsContent value="environment">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60">
                  Environment Variables
                </span>
                <button
                  onClick={() => setShowMasked(!showMasked)}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  {showMasked ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showMasked ? 'Show sensitive' : 'Hide sensitive'}
                </button>
              </div>

              {envEntries.length === 0 ? (
                <div className="text-sm text-muted-foreground/50 py-8 text-center">
                  No environment variables available
                </div>
              ) : (
                <div className="space-y-0.5">
                  {envEntries.map(([key, value]) => {
                    const isMasked = shouldMask(key) && showMasked;
                    return (
                      <div
                        key={key}
                        className="flex items-start gap-3 px-3 py-2 bg-subtle/20 border border-border/20 hover:bg-subtle/30 transition-colors"
                      >
                        <span className="text-[11px] font-mono text-primary/80 shrink-0 min-w-[180px]">
                          {key}
                        </span>
                        <span className="text-[11px] font-mono text-foreground/70 break-all">
                          {isMasked ? '••••••••••••' : value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground uppercase tracking-wider text-xs w-20">{label}</span>
      <span className="text-foreground font-mono">{value}</span>
    </div>
  );
}

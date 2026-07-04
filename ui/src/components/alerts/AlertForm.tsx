import { useState, useEffect, useMemo } from 'react';
import { Plus, CheckCircle, XCircle, BellOff, ChevronDown } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/shared/Dialog';
import { useAlertsStore } from '@/store/alerts';
import { useProcessStore } from '@/store/processes';
import { api } from '@/lib/api';
import type { AlertRule } from '@/types/alerts';

interface ChannelInfo {
  configured: boolean;
  enabled: boolean;
}

interface AlertFormProps {
  open: boolean;
  onClose: () => void;
  editRule?: AlertRule | null;
}

export function AlertForm({ open, onClose, editRule }: AlertFormProps) {
  const addRule = useAlertsStore((s) => s.addRule);
  const updateRule = useAlertsStore((s) => s.updateRule);
  const processes = useProcessStore((s) => s.processes);
  const [metric, setMetric] = useState<AlertRule['metric']>('cpu');
  const [operator, setOperator] = useState<AlertRule['operator']>('>');
  const [threshold, setThreshold] = useState('');
  const [severity, setSeverity] = useState<AlertRule['severity']>('warning');
  const [scope, setScope] = useState<AlertRule['scope']>('process');
  const [processId, setProcessId] = useState<number | ''>('');
  const [channels, setChannels] = useState<Set<string>>(new Set(['browser']));
  const [channelInfo, setChannelInfo] = useState<Record<string, ChannelInfo> | null>(null);
  const [cooldown, setCooldown] = useState('60');
  const [duration, setDuration] = useState('');

  const processList = useMemo(() => Array.from(processes.values()), [processes]);

  useEffect(() => {
    api('/api/channels', { silent: true })
      .then((r) => r.json())
      .then((data) => setChannelInfo(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editRule) {
      setMetric(editRule.metric);
      setOperator(editRule.operator);
      setThreshold(String(editRule.threshold));
      setSeverity(editRule.severity);
      setScope(editRule.scope);
      setProcessId(editRule.processId || '');
      setChannels(new Set(editRule.channels));
      setCooldown(String((editRule as any).cooldownMs ? Math.round((editRule as any).cooldownMs / 1000) : 60));
      setDuration(String((editRule as any).duration || ''));
    } else {
      setMetric('cpu');
      setOperator('>');
      setThreshold('');
      setSeverity('warning');
      setScope('process');
      setProcessId('');
      setChannels(new Set(['browser']));
    }
  }, [open, editRule]);

  const toggleChannel = (ch: string) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  const handleSubmit = () => {
    if (threshold.trim() === '' || isNaN(parseFloat(threshold))) return;

    if (editRule) {
      const updates: Partial<AlertRule> = {
        scope,
        metric,
        operator,
        threshold: parseFloat(threshold),
        severity,
        channels: Array.from(channels) as AlertRule['channels'],
      };
      if (processId) {
        updates.processId = processId;
        const proc = processes.get(processId);
        if (proc) updates.processName = proc.name;
      }
      if (cooldown && !isNaN(parseInt(cooldown))) (updates as any).cooldownMs = parseInt(cooldown) * 1000;
      if (duration && !isNaN(parseInt(duration))) (updates as any).duration = parseInt(duration);
      updateRule(editRule.id, updates);
    } else {
      const rule: AlertRule = {
        id: `rule-${Date.now()}`,
        scope,
        metric,
        operator,
        threshold: parseFloat(threshold),
        severity,
        enabled: true,
        channels: Array.from(channels) as AlertRule['channels'],
        ...(processId ? { processId } : {}),
        ...(cooldown && !isNaN(parseInt(cooldown)) ? { cooldownMs: parseInt(cooldown) * 1000 } : {}),
        ...(duration && !isNaN(parseInt(duration)) ? { duration: parseInt(duration) } : {}),
      } as AlertRule;
      addRule(rule);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{editRule ? 'Edit Alert Rule' : 'Create Alert Rule'}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Scope</label>
              <div className="relative">
                <select
                  value={scope}
                  onChange={(e) => {
                    const val = e.target.value as AlertRule['scope'];
                    setScope(val);
                    if (val === 'system') {
                      setMetric('systemCpu');
                      setProcessId('');
                    } else {
                      setMetric('cpu');
                    }
                  }}
                  className="h-10 w-full appearance-none bg-input border border-border text-foreground text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring pl-3 pr-9"
                >
                  <option value="process">Per Process</option>
                  <option value="system">System (Aggregate)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Metric</label>
              <div className="relative">
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as AlertRule['metric'])}
                  className="h-10 w-full appearance-none bg-input border border-border text-foreground text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring pl-3 pr-9"
                >
                  {scope === 'process' ? (
                    <>
                      <option value="cpu">CPU %</option>
                      <option value="memory">Memory (bytes)</option>
                      <option value="restarts">Restarts</option>
                    </>
                  ) : (
                    <>
                      <option value="systemCpu">System CPU %</option>
                      <option value="systemMemory">System Memory %</option>
                      <option value="systemLoad">System Load</option>
                    </>
                  )}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60" />
              </div>
            </div>
          </div>

          {scope === 'process' && (
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Process (optional)</label>
              <div className="relative">
                <select
                  value={processId}
                  onChange={(e) => setProcessId(e.target.value ? parseInt(e.target.value) : '')}
                  className="h-10 w-full appearance-none bg-input border border-border text-foreground text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring pl-3 pr-9"
                >
                  <option value="">All processes (global rule)</option>
                  {processList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (PID {p.pid})</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Cooldown (s)</label>
              <Input
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(e.target.value)}
                placeholder="60"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Duration (s)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="0 = instant"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Severity</label>
              <div className="relative">
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as AlertRule['severity'])}
                  className="h-10 w-full appearance-none bg-input border border-border text-foreground text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring pl-3 pr-9"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Condition</label>
              <div className="relative">
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as AlertRule['operator'])}
                  className="h-10 w-full appearance-none bg-input border border-border text-foreground text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring pl-3 pr-9"
                >
                  <option value=">"> Greater than</option>
                  <option value="<"> Less than</option>
                  <option value=">=">Greater or equal</option>
                  <option value="<=">Less or equal</option>
                  <option value="==">Equal to</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Threshold</label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g. 80"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Cooldown (s)</label>
              <Input
                type="number"
                value={cooldown}
                onChange={(e) => setCooldown(e.target.value)}
                placeholder="60"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Duration (s)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="0 = instant"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Notify via</label>
            <div className="space-y-1.5">
              {(['browser', 'slack', 'discord', 'webhook', 'email'] as const).map((ch) => {
                const info = channelInfo?.[ch];
                const selected = channels.has(ch);
                return (
                  <label
                    key={ch}
                    className={`flex items-center gap-3 px-3 py-2 border cursor-pointer transition-colors ${
                      selected
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/50 bg-transparent hover:bg-subtle/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleChannel(ch)}
                      className="accent-primary"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm text-foreground capitalize">{ch}</span>
                      <div className="flex items-center gap-2">
                        {info ? (
                          <>
                            {info.configured && info.enabled ? (
                              <span className="flex items-center gap-1 text-[10px] text-success">
                                <CheckCircle size={10} /> Active
                              </span>
                            ) : info.configured && !info.enabled ? (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <BellOff size={10} /> Disabled in settings
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
                                <XCircle size={10} /> Not configured
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/30">...</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!threshold}>
          <Plus size={14} /> {editRule ? 'Update Rule' : 'Create Rule'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

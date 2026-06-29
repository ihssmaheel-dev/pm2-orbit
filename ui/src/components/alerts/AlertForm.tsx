import { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, BellOff, ChevronDown } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/shared/Dialog';
import { useAlertsStore } from '@/store/alerts';
import type { AlertRule } from '@/types/alerts';

interface ChannelInfo {
  configured: boolean;
  enabled: boolean;
}

interface AlertFormProps {
  open: boolean;
  onClose: () => void;
}

export function AlertForm({ open, onClose }: AlertFormProps) {
  const addRule = useAlertsStore((s) => s.addRule);
  const [metric, setMetric] = useState<AlertRule['metric']>('cpu');
  const [operator, setOperator] = useState<AlertRule['operator']>('>');
  const [threshold, setThreshold] = useState('');
  const [channels, setChannels] = useState<Set<string>>(new Set(['browser']));
  const [channelInfo, setChannelInfo] = useState<Record<string, ChannelInfo> | null>(null);

  useEffect(() => {
    fetch('/api/channels')
      .then((r) => r.json())
      .then((data) => setChannelInfo(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) {
      setMetric('cpu');
      setOperator('>');
      setThreshold('');
      setChannels(new Set(['browser']));
    }
  }, [open]);

  const toggleChannel = (ch: string) => {
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!threshold) return;

    const rule = {
      id: `rule-${Date.now()}`,
      metric,
      operator,
      threshold: parseFloat(threshold),
      enabled: true,
      channels: Array.from(channels),
    } as unknown as AlertRule;

    addRule(rule);

    addRule(rule);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Create Alert Rule</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Metric</label>
            <div className="relative">
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as AlertRule['metric'])}
                className="h-10 w-full appearance-none bg-input border border-border text-foreground text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring pl-3 pr-9"
              >
                <option value="cpu">CPU %</option>
                <option value="memory">Memory (bytes)</option>
                <option value="restarts">Restarts</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/60" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
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
            <div className="flex-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Threshold</label>
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="e.g. 80"
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
          <Plus size={14} /> Create Rule
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

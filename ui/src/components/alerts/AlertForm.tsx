import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/shared/Dialog';
import { useAlertsStore } from '@/store/alerts';
import type { AlertRule } from '@/types/alerts';

interface AlertFormProps {
  open: boolean;
  onClose: () => void;
}

export function AlertForm({ open, onClose }: AlertFormProps) {
  const addRule = useAlertsStore((s) => s.addRule);
  const [metric, setMetric] = useState<AlertRule['metric']>('cpu');
  const [operator, setOperator] = useState<AlertRule['operator']>('>');
  const [threshold, setThreshold] = useState('');

  const handleSubmit = () => {
    if (!threshold) return;

    const rule: AlertRule = {
      id: `rule-${Date.now()}`,
      metric,
      operator,
      threshold: parseFloat(threshold),
      enabled: true,
    };

    addRule(rule);
    setThreshold('');
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
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as AlertRule['metric'])}
              className="h-10 w-full px-3 bg-input border border-border text-foreground text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="cpu">CPU %</option>
              <option value="memory">Memory (bytes)</option>
              <option value="restarts">Restarts</option>
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Condition</label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as AlertRule['operator'])}
                className="h-10 w-full px-3 bg-input border border-border text-foreground text-sm rounded-none focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value=">"> Greater than</option>
                <option value="<"> Less than</option>
                <option value=">=">Greater or equal</option>
                <option value="<=">Less or equal</option>
                <option value="==">Equal to</option>
              </select>
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

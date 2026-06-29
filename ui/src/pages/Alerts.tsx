import { useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Skeleton } from '@/components/shared/Skeleton';
import { useAlertsStore } from '@/store/alerts';
import { AlertForm } from '@/components/alerts/AlertForm';
import { AlertHistory } from '@/components/alerts/AlertHistory';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';

export function Alerts() {
  const rules = useAlertsStore((s) => s.rules);
  const loading = useAlertsStore((s) => s.loading);
  const removeRule = useAlertsStore((s) => s.removeRule);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-warning rounded-full" />
          <span className="text-sm text-foreground font-medium tracking-wide">ALERTS</span>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus size={14} /> New Rule
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="rules">
            {loading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 h-12 px-4 bg-card border border-border">
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertTriangle size={32} className="mb-3 opacity-30" />
                <div className="text-sm">No alert rules configured</div>
                <div className="text-xs mt-1 text-muted-foreground/60">Create a rule to get notified when thresholds are exceeded</div>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between px-4 py-3 bg-card border border-border">
                    <div className="flex items-center gap-3">
                      <Badge variant={rule.enabled ? 'success' : 'outline'}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                      <span className="text-sm text-foreground">
                        {rule.metric.toUpperCase()} {rule.operator} {rule.threshold}
                      </span>
                      {rule.processId !== undefined && (
                        <span className="text-xs text-muted-foreground">PID {rule.processId}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <AlertHistory />
          </TabsContent>
        </Tabs>
      </div>

      <AlertForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

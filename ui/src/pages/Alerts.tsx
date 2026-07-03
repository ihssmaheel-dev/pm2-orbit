import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Skeleton } from '@/components/shared/Skeleton';
import { useAlertsStore } from '@/store/alerts';
import { AlertForm } from '@/components/alerts/AlertForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';
import type { AlertRule } from '@/types/alerts';

const severityColors: Record<string, string> = {
  info: 'text-blue-500 bg-blue-500/10',
  warning: 'text-warning bg-warning/10',
  critical: 'text-destructive bg-destructive/10',
};

const metricLabels: Record<string, string> = {
  cpu: 'CPU %',
  memory: 'Memory',
  restarts: 'Restarts',
  status: 'Status',
  systemCpu: 'System CPU %',
  systemMemory: 'System Memory %',
  systemLoad: 'System Load',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

export function Alerts() {
  const rules = useAlertsStore((s) => s.rules);
  const loading = useAlertsStore((s) => s.loading);
  const history = useAlertsStore((s) => s.history);
  const removeRule = useAlertsStore((s) => s.removeRule);
  const updateRule = useAlertsStore((s) => s.updateRule);
  const clearHistory = useAlertsStore((s) => s.clearHistory);
  const [formOpen, setFormOpen] = useState(false);
  const [editRule, setEditRule] = useState<AlertRule | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const tabFromUrl = location.pathname.endsWith('/history') ? 'history' : 'rules';

  const handleEdit = (rule: AlertRule) => {
    setEditRule(rule);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditRule(null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditRule(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-warning rounded-full" />
          <span className="text-sm text-foreground font-medium tracking-wide">ALERTS</span>
          <span className="text-xs text-muted-foreground">({rules.length} rules, {history.length} events)</span>
        </div>
        <Button size="sm" onClick={handleNew}>
          <Plus size={14} /> New Rule
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={tabFromUrl} onValueChange={(v) => navigate(v === 'rules' ? '/alerts/rules' : '/alerts/history', { replace: true })}>
          <div className="px-5 border-b border-border">
            <TabsList>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>

          {/* Rules Tab */}
          <TabsContent value="rules">
            {loading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 h-11 px-4 bg-card border border-border">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-12 h-12 rounded-lg bg-subtle/40 border border-border/30 flex items-center justify-center mb-4">
                  <AlertTriangle size={24} className="text-warning/40" />
                </div>
                <p className="text-sm font-medium">No alert rules configured</p>
                <p className="text-xs mt-1 text-muted-foreground/60">Create a rule to get notified when thresholds are exceeded</p>
                <Button size="sm" className="mt-4" onClick={handleNew}>
                  <Plus size={14} /> Create Rule
                </Button>
              </div>
            ) : (
              <div className="p-5">
                {/* Table Header */}
                <div className="flex items-center h-9 px-4 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  <div className="w-20 shrink-0">Status</div>
                  <div className="w-16 shrink-0">Severity</div>
                  <div className="w-20 shrink-0">Scope</div>
                  <div className="w-24 shrink-0">Metric</div>
                  <div className="w-16 shrink-0">Operator</div>
                  <div className="w-20 shrink-0">Threshold</div>
                  <div className="w-24 shrink-0">Channels</div>
                  <div className="flex-1"></div>
                  <div className="w-20 shrink-0 text-right">Actions</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border/50">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center h-11 px-4 hover:bg-subtle/30 transition-colors"
                    >
                      {/* Status */}
                      <div className="w-20 shrink-0">
                        <button
                          onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                          className="cursor-pointer"
                        >
                          <Badge variant={rule.enabled ? 'success' : 'outline'}>
                            {rule.enabled ? 'Active' : 'Off'}
                          </Badge>
                        </button>
                      </div>

                      {/* Severity */}
                      <div className="w-16 shrink-0">
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${severityColors[rule.severity] || severityColors.warning}`}>
                          {rule.severity}
                        </span>
                      </div>

                      {/* Scope */}
                      <div className="w-20 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {rule.scope === 'system' ? 'System' : rule.processId ? `PID ${rule.processId}` : 'Global'}
                        </span>
                      </div>

                      {/* Metric */}
                      <div className="w-24 shrink-0">
                        <span className="text-xs font-medium text-foreground">
                          {metricLabels[rule.metric] || rule.metric}
                        </span>
                      </div>

                      {/* Operator */}
                      <div className="w-16 shrink-0">
                        <span className="text-xs font-mono text-muted-foreground">
                          {rule.operator}
                        </span>
                      </div>

                      {/* Threshold */}
                      <div className="w-20 shrink-0">
                        <span className="text-xs font-mono font-medium text-foreground">
                          {rule.threshold}
                        </span>
                      </div>

                      {/* Channels */}
                      <div className="w-24 shrink-0 flex gap-1">
                        {rule.channels.slice(0, 3).map((ch) => (
                          <span key={ch} className="px-1.5 py-0.5 text-[9px] font-mono bg-subtle text-muted-foreground rounded">
                            {ch}
                          </span>
                        ))}
                        {rule.channels.length > 3 && (
                          <span className="text-[9px] text-muted-foreground">+{rule.channels.length - 3}</span>
                        )}
                      </div>

                      {/* Spacer */}
                      <div className="flex-1"></div>

                      {/* Actions */}
                      <div className="w-20 shrink-0 flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(rule)}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                          title="Edit rule"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => removeRule(rule.id)}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                          title="Delete rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="p-5">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <div className="w-12 h-12 rounded-lg bg-subtle/40 border border-border/30 flex items-center justify-center mb-4">
                    <AlertTriangle size={24} className="text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-medium">No alerts triggered yet</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Alert events will appear here when rules are triggered</p>
                </div>
              ) : (
                <>
                  {/* Header with clear button */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-muted-foreground">
                      {history.length} event{history.length !== 1 ? 's' : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearHistory}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <RotateCcw size={12} /> Clear History
                    </Button>
                  </div>

                  {/* Table Header */}
                  <div className="flex items-center h-9 px-4 border-b border-border text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    <div className="w-40 shrink-0">Time</div>
                    <div className="w-16 shrink-0">Severity</div>
                    <div className="w-28 shrink-0">Process</div>
                    <div className="w-20 shrink-0">Metric</div>
                    <div className="w-24 shrink-0">Value</div>
                    <div className="flex-1">Message</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-border/50">
                    {history.map((event, i) => (
                      <div
                        key={`${event.ruleId}-${event.ts}-${i}`}
                        className="flex items-start h-auto py-2.5 px-4 hover:bg-subtle/30 transition-colors"
                      >
                        {/* Time */}
                        <div className="w-40 shrink-0">
                          <span className="text-xs font-mono text-muted-foreground tabular-nums">
                            {formatTime(event.ts)}
                          </span>
                        </div>

                        {/* Severity */}
                        <div className="w-16 shrink-0">
                          <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${severityColors[event.severity] || severityColors.warning}`}>
                            {event.severity}
                          </span>
                        </div>

                        {/* Process */}
                        <div className="w-28 shrink-0">
                          <span className="text-xs text-foreground truncate block">
                            {event.processName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            PID {event.processId}
                          </span>
                        </div>

                        {/* Metric */}
                        <div className="w-20 shrink-0">
                          <span className="text-xs font-medium text-foreground">
                            {metricLabels[event.metric] || event.metric}
                          </span>
                        </div>

                        {/* Value */}
                        <div className="w-24 shrink-0">
                          <span className="text-xs font-mono text-muted-foreground">
                            {typeof event.value === 'number' ? event.value.toFixed(1) : event.value}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50 ml-1">
                            / {event.threshold}
                          </span>
                        </div>

                        {/* Message */}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground truncate block">
                            {event.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertForm open={formOpen} onClose={handleClose} editRule={editRule} />
    </div>
  );
}

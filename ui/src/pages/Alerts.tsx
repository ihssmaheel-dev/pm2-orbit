import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Pencil, RotateCcw, Bell, Check } from 'lucide-react';
import { Skeleton } from '@/components/shared/Skeleton';
import { useAlertsStore } from '@/store/alerts';
import { AlertForm } from '@/components/alerts/AlertForm';
import type { AlertRule } from '@/types/alerts';

const severityConfig: Record<string, { label: string; dot: string; txt: string }> = {
  info: { label: 'Info', dot: 'bg-blue-400', txt: 'text-blue-400' },
  warning: { label: 'Warning', dot: 'bg-amber-400', txt: 'text-amber-400' },
  critical: { label: 'Critical', dot: 'bg-red-400', txt: 'text-red-400' },
};

const metricLabels: Record<string, string> = {
  cpu: 'CPU',
  memory: 'Memory',
  restarts: 'Restarts',
  status: 'Status',
  systemCpu: 'Sys CPU',
  systemMemory: 'Sys Memory',
  systemLoad: 'Sys Load',
};

const CHANNELS = ['browser', 'slack', 'discord', 'webhook', 'email'] as const;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

function ChannelCheck({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
        enabled
          ? 'bg-primary border-primary text-white'
          : 'bg-transparent border-border/40 hover:border-border/60'
      }`}
    >
      {enabled && <Check size={10} strokeWidth={3} />}
    </button>
  );
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

  const toggleChannel = (rule: AlertRule, channel: string) => {
    const channels = rule.channels.includes(channel as AlertRule['channels'][number])
      ? rule.channels.filter((c) => c !== channel)
      : [...rule.channels, channel];
    updateRule(rule.id, { channels: channels as AlertRule['channels'] });
  };

  return (
    <div className="flex flex-col h-full bg-card/30 border border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-5 shrink-0 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-semibold text-foreground/85">Alerts</span>
          <span className="text-[11px] font-mono text-primary bg-primary/10 px-1.5 leading-4.5 tabular-nums">
            {tabFromUrl === 'rules' ? rules.length : history.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {tabFromUrl === 'history' && history.length > 0 && (
            <button
              onClick={clearHistory}
              className="cursor-pointer flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold text-foreground hover:text-destructive border border-border hover:border-destructive/40 hover:bg-destructive/5 transition-colors"
            >
              <RotateCcw size={10} /> Clear
            </button>
          )}
          <button
            onClick={handleNew}
            className="cursor-pointer flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-semibold text-foreground hover:text-primary border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <Plus size={10} /> New Rule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center h-10 px-5 border-b border-border/40 bg-background/40 text-muted-foreground/50 select-none shrink-0">
        <button
          onClick={() => navigate('/alerts/rules', { replace: true })}
          className={`px-3 h-10 text-[11px] font-semibold uppercase tracking-widest transition-colors cursor-pointer border-b-2 ${
            tabFromUrl === 'rules'
              ? 'text-primary border-primary'
              : 'border-transparent hover:text-foreground/60'
          }`}
        >
          Rules
          <span className="ml-1.5 text-[10px] font-mono tabular-nums text-muted-foreground/40">
            {rules.length}
          </span>
        </button>
        <button
          onClick={() => navigate('/alerts/history', { replace: true })}
          className={`px-3 h-10 text-[11px] font-semibold uppercase tracking-widest transition-colors cursor-pointer border-b-2 ${
            tabFromUrl === 'history'
              ? 'text-primary border-primary'
              : 'border-transparent hover:text-foreground/60'
          }`}
        >
          History
          <span className="ml-1.5 text-[10px] font-mono tabular-nums text-muted-foreground/40">
            {history.length}
          </span>
        </button>
      </div>

      {/* Rules Table */}
      {tabFromUrl === 'rules' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Column headers */}
          <div className="flex items-center h-8 px-5 border-b border-border/40 bg-background/40 text-muted-foreground/50 select-none shrink-0">
            <div className="w-16 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Scope</div>
            <div className="w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Metric</div>
            <div className="flex-1 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Process</div>
            <div className="w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Severity</div>
            <div className="w-12 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Cond</div>
            <div className="w-16 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Value</div>
            {CHANNELS.map((ch) => (
              <div key={ch} className="w-14 shrink-0 px-2 text-[10px] font-semibold uppercase tracking-widest text-center">{ch}</div>
            ))}
            <div className="w-16 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest text-right">Actions</div>
          </div>

          {/* Data rows */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center h-11 px-5 border-b border-border/10">
                    <div className="w-16 shrink-0 px-3"><Skeleton className="h-4 w-12" /></div>
                    <div className="w-20 shrink-0 px-3"><Skeleton className="h-4 w-14" /></div>
                    <div className="flex-1 shrink-0 px-3"><Skeleton className="h-4 w-24" /></div>
                    <div className="w-20 shrink-0 px-3"><Skeleton className="h-4 w-14" /></div>
                    <div className="w-12 shrink-0 px-3"><Skeleton className="h-4 w-6" /></div>
                    <div className="w-16 shrink-0 px-3"><Skeleton className="h-4 w-8" /></div>
                    {CHANNELS.map((ch) => (
                      <div key={ch} className="w-14 shrink-0 px-2 flex justify-center"><Skeleton className="h-4 w-4" /></div>
                    ))}
                    <div className="w-16 shrink-0 px-3 flex justify-end"><Skeleton className="h-4 w-12" /></div>
                  </div>
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center py-16">
                <div>
                  <div className="w-12 h-12 mx-auto mb-4 bg-subtle/40 border border-border/30 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-muted-foreground/25" />
                  </div>
                  <p className="text-sm text-muted-foreground/60">No alert rules configured</p>
                  <p className="text-xs text-muted-foreground/30 mt-1">Create a rule to get notified when thresholds are exceeded</p>
                </div>
              </div>
            ) : (
              rules.map((rule, i) => {
                const sev = severityConfig[rule.severity] || severityConfig.warning;
                return (
                  <div
                    key={rule.id}
                    className={`flex items-center h-11 px-5 border-b border-border/10 hover:bg-subtle/20 transition-colors group ${
                      !rule.enabled ? 'opacity-50' : ''
                    } ${i % 2 === 0 ? 'bg-background/20' : ''}`}
                  >
                    {/* Scope */}
                    <div className="w-16 shrink-0 px-3">
                      <span className="text-[11px] text-muted-foreground/55">
                        {rule.scope === 'system' ? 'System' : rule.processId !== undefined ? `PID ${rule.processId}` : 'Global'}
                      </span>
                    </div>

                    {/* Metric */}
                    <div className="w-20 shrink-0 px-3">
                      <span className="text-[12px] font-medium text-foreground">
                        {metricLabels[rule.metric] || rule.metric}
                      </span>
                    </div>

                    {/* Process */}
                    <div className="flex-1 shrink-0 px-3">
                      <span className="text-[11px] text-muted-foreground/45">
                        {rule.processId !== undefined ? `Process ${rule.processId}` : 'All processes'}
                      </span>
                    </div>

                    {/* Severity */}
                    <div className="w-20 shrink-0 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        <span className={`text-[11px] font-medium ${sev.txt}`}>{sev.label}</span>
                      </span>
                    </div>

                    {/* Condition */}
                    <div className="w-12 shrink-0 px-3">
                      <span className="text-[12px] font-mono text-muted-foreground/55">{rule.operator}</span>
                    </div>

                    {/* Value */}
                    <div className="w-16 shrink-0 px-3">
                      <span className="text-[12px] font-mono font-medium text-foreground/80 tabular-nums">{rule.threshold}</span>
                    </div>

                    {/* Channel checkboxes */}
                    {CHANNELS.map((ch) => (
                      <div key={ch} className="w-14 shrink-0 px-2 flex justify-center">
                        <ChannelCheck
                          enabled={rule.channels.includes(ch)}
                          onChange={() => toggleChannel(rule, ch)}
                        />
                      </div>
                    ))}

                    {/* Actions */}
                    <div className="w-16 shrink-0 px-3 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(rule)}
                        className="h-6 w-6 flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="h-6 w-6 flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* History Table */}
      {tabFromUrl === 'history' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center h-8 px-5 border-b border-border/40 bg-background/40 text-muted-foreground/50 select-none shrink-0">
            <div className="w-24 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Time</div>
            <div className="w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Severity</div>
            <div className="w-32 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Process</div>
            <div className="w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Metric</div>
            <div className="w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Value</div>
            <div className="flex-1 px-3 text-[10px] font-semibold uppercase tracking-widest">Message</div>
          </div>

          <div className="flex-1 overflow-auto">
            {history.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center py-16">
                <div>
                  <div className="w-12 h-12 mx-auto mb-4 bg-subtle/40 border border-border/30 flex items-center justify-center">
                    <Bell size={20} className="text-muted-foreground/25" />
                  </div>
                  <p className="text-sm text-muted-foreground/60">No alerts triggered yet</p>
                  <p className="text-xs text-muted-foreground/30 mt-1">Alert events will appear here when rules fire</p>
                </div>
              </div>
            ) : (
              history.map((event, i) => {
                const sev = severityConfig[event.severity] || severityConfig.warning;
                return (
                  <div
                    key={`${event.ruleId}-${event.ts}-${i}`}
                    className={`flex items-center h-11 px-5 border-b border-border/10 hover:bg-subtle/20 transition-colors ${
                      i % 2 === 0 ? 'bg-background/20' : ''
                    }`}
                  >
                    <div className="w-24 shrink-0 px-3">
                      <span className="text-[11px] font-mono text-muted-foreground/45 tabular-nums">{formatTime(event.ts)}</span>
                    </div>
                    <div className="w-20 shrink-0 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        <span className={`text-[11px] font-medium ${sev.txt}`}>{sev.label}</span>
                      </span>
                    </div>
                    <div className="w-32 shrink-0 px-3">
                      <span className="text-[12px] font-medium text-foreground block truncate">{event.processName}</span>
                      <span className="text-[10px] text-muted-foreground/40 font-mono">PID {event.processId}</span>
                    </div>
                    <div className="w-20 shrink-0 px-3">
                      <span className="text-[11px] text-muted-foreground/55">{metricLabels[event.metric] || event.metric}</span>
                    </div>
                    <div className="w-20 shrink-0 px-3">
                      <span className="text-[12px] font-mono text-foreground/80 tabular-nums">{typeof event.value === 'number' ? event.value.toFixed(1) : event.value}</span>
                      <span className="text-[10px] text-muted-foreground/35 font-mono ml-1">/ {event.threshold}</span>
                    </div>
                    <div className="flex-1 px-3">
                      <span className="text-[11px] text-muted-foreground/50 truncate block">{event.message}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <AlertForm open={formOpen} onClose={handleClose} editRule={editRule} />
    </div>
  );
}

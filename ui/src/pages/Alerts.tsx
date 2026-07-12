import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, Pencil, RotateCcw, Bell } from 'lucide-react';
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

function ChannelDot({ enabled }: { enabled: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center text-[10px] font-medium ${enabled ? 'text-primary' : 'text-muted-foreground/30'}`}>
      {enabled ? 'On' : '—'}
    </span>
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

  return (
    <div className="flex flex-col h-full bg-card/30 border border-border/50">
      {/* Header - matching Logs style */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-card/80 shrink-0">
        <Bell size={14} className="text-primary" />
        <span className="text-sm text-foreground font-semibold tracking-wider uppercase">Alerts</span>

        <div className="ml-auto flex items-center gap-1.5">
          {tabFromUrl === 'history' && history.length > 0 && (
            <button
              onClick={clearHistory}
              className="cursor-pointer flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-destructive border border-border/60 hover:border-destructive/40 hover:bg-destructive/5 transition-colors rounded-none"
            >
              <RotateCcw size={11} /> Clear
            </button>
          )}
          <button
            onClick={handleNew}
            className="cursor-pointer flex items-center gap-1 h-7 px-2.5 text-[11px] font-medium text-foreground hover:text-primary border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors rounded-none"
          >
            <Plus size={11} /> New Rule
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
          <span className="ml-1.5 text-[10px] font-mono tabular-nums text-muted-foreground/40">{rules.length}</span>
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
          <span className="ml-1.5 text-[10px] font-mono tabular-nums text-muted-foreground/40">{history.length}</span>
        </button>
      </div>

      {/* Rules Table */}
      {tabFromUrl === 'rules' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Column headers */}
          <div className="flex items-center h-8 px-5 border-b border-border/40 bg-background/40 text-muted-foreground/50 select-none shrink-0">
            <div className="w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Scope</div>
            <div className="w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Metric</div>
            <div className="flex-1 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Process</div>
            <div className="hidden sm:block w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Condition</div>
            <div className="hidden sm:block w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Threshold</div>
            <div className="hidden md:block w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Severity</div>
            {CHANNELS.map((ch) => (
              <div key={ch} className="hidden lg:block w-16 shrink-0 px-2 text-[10px] font-semibold uppercase tracking-widest text-center">{ch}</div>
            ))}
            <div className="hidden sm:block w-14 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest text-center">Active</div>
            <div className="w-16 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest text-right">Actions</div>
          </div>

          {/* Data rows */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center h-11 px-5 border-b border-border/10">
                    <div className="w-20 shrink-0 px-3"><Skeleton className="h-4 w-12" /></div>
                    <div className="w-20 shrink-0 px-3"><Skeleton className="h-4 w-14" /></div>
                    <div className="flex-1 shrink-0 px-3"><Skeleton className="h-4 w-24" /></div>
                    <div className="w-24 shrink-0 px-3"><Skeleton className="h-4 w-8" /></div>
                    <div className="w-24 shrink-0 px-3"><Skeleton className="h-4 w-10" /></div>
                    <div className="w-24 shrink-0 px-3"><Skeleton className="h-4 w-14" /></div>
                    {CHANNELS.map((ch) => (
                      <div key={ch} className="w-20 shrink-0 px-2 flex justify-center"><Skeleton className="h-4 w-6" /></div>
                    ))}
                    <div className="w-18 shrink-0 px-3 flex justify-center"><Skeleton className="h-4 w-8" /></div>
                    <div className="w-20 shrink-0 px-3 flex justify-end"><Skeleton className="h-4 w-12" /></div>
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
                    <div className="w-20 shrink-0 px-3">
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

                    {/* Condition */}
                    <div className="hidden sm:block w-20 shrink-0 px-3">
                      <span className="text-[12px] font-mono text-muted-foreground/55">{rule.operator}</span>
                    </div>

                    {/* Threshold */}
                    <div className="hidden sm:block w-20 shrink-0 px-3">
                      <span className="text-[12px] font-mono font-medium text-foreground/80 tabular-nums">{rule.threshold}</span>
                    </div>

                    {/* Severity */}
                    <div className="hidden md:block w-20 shrink-0 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        <span className={`text-[11px] font-medium ${sev.txt}`}>{sev.label}</span>
                      </span>
                    </div>

                    {/* Channel status */}
                    {CHANNELS.map((ch) => (
                      <div key={ch} className="hidden lg:block w-16 shrink-0 px-2 flex justify-center">
                        <ChannelDot enabled={rule.channels.includes(ch)} />
                      </div>
                    ))}

                    {/* Active toggle */}
                    <div className="hidden sm:block w-14 shrink-0 px-3 flex justify-center">
                      <button
                        onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                        className={`relative w-8 h-[18px] rounded-full transition-colors cursor-pointer ${
                          rule.enabled ? 'bg-primary' : 'bg-subtle/60'
                        }`}
                        title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                      >
                        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
                          rule.enabled ? 'translate-x-[14px]' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="w-16 shrink-0 px-3 flex items-center justify-end gap-1">
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
            <div className="w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Time</div>
            <div className="hidden sm:block w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Severity</div>
            <div className="hidden sm:block w-20 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Metric</div>
            <div className="hidden md:block w-32 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-widest">Threshold</div>
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
                    {/* Time */}
                    <div className="w-20 shrink-0 px-3">
                      <span className="text-[11px] font-mono text-muted-foreground/45 tabular-nums">{formatTime(event.ts)}</span>
                    </div>

                    {/* Severity */}
                    <div className="hidden sm:block w-20 shrink-0 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                        <span className={`text-[11px] font-medium ${sev.txt}`}>{sev.label}</span>
                      </span>
                    </div>

                    {/* Metric */}
                    <div className="hidden sm:block w-20 shrink-0 px-3">
                      <span className="text-[11px] text-muted-foreground/55">{metricLabels[event.metric] || event.metric}</span>
                    </div>

                    {/* Threshold */}
                    <div className="hidden md:block w-32 shrink-0 px-3">
                      <span className="text-[12px] font-mono text-foreground/80 tabular-nums">
                        {typeof event.value === 'number' ? event.value.toFixed(1) : event.value}
                      </span>
                      <span className="text-[10px] text-muted-foreground/35 font-mono ml-1.5">
                        / {event.threshold}
                      </span>
                    </div>

                    {/* Message */}
                    <div className="flex-1 px-3">
                      <span className="text-[11px] text-muted-foreground/60 leading-snug block">
                        {event.message}
                      </span>
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

import fs from 'fs';
import path from 'path';

const metricLabels: Record<string, string> = {
  cpu: 'CPU',
  memory: 'Memory',
  restarts: 'Restarts',
  status: 'Status',
  systemCpu: 'System CPU',
  systemMemory: 'System Memory',
  systemLoad: 'System Load',
};

export interface AlertRule {
  id: string;
  processId?: number;
  processName?: string;
  scope: 'process' | 'system';
  metric: 'cpu' | 'memory' | 'restarts' | 'status' | 'systemCpu' | 'systemMemory' | 'systemLoad';
  operator: '>' | '<' | '==' | '>=' | '<=';
  threshold: number;
  enabled: boolean;
  severity: 'info' | 'warning' | 'critical';
  channels: ('browser' | 'webhook' | 'slack' | 'discord' | 'email')[];
  webhookUrl?: string;
  slackWebhook?: string;
  discordWebhook?: string;
  emailTo?: string;
}

export interface AlertEvent {
  ruleId: string;
  processId: number;
  processName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  ts: number;
}

const ALERTS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.pm2-orbit',
);
const ALERTS_FILE = path.join(ALERTS_DIR, 'alerts.json');

function loadRules(): AlertRule[] {
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      return JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveRules(rules: AlertRule[]): void {
  try {
    if (!fs.existsSync(ALERTS_DIR)) {
      fs.mkdirSync(ALERTS_DIR, { recursive: true });
    }
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(rules, null, 2));
  } catch {
    // ignore
  }
}

export function createAlertEngine() {
  let rules = loadRules();
  const history: AlertEvent[] = [];
  const pendingEvals = new Map<number, AlertRule[]>();
  const globalRules: AlertRule[] = [];
  const lastFiredAt = new Map<string, number>();

  function rebuildIndex() {
    pendingEvals.clear();
    globalRules.length = 0;

    for (const rule of rules) {
      if (!rule.enabled) continue;
      if (rule.processId !== undefined) {
        const existing = pendingEvals.get(rule.processId) || [];
        existing.push(rule);
        pendingEvals.set(rule.processId, existing);
      } else {
        globalRules.push(rule);
      }
    }
  }

  rebuildIndex();

  function addRule(rule: AlertRule): void {
    rules.push(rule);
    saveRules(rules);
    rebuildIndex();
  }

  function removeRule(id: string): void {
    rules = rules.filter((r) => r.id !== id);
    saveRules(rules);
    rebuildIndex();
  }

  function clearRules(): void {
    rules = [];
    saveRules(rules);
    rebuildIndex();
    lastFiredAt.clear();
    history.length = 0;
  }

  function updateRule(id: string, updates: Partial<AlertRule>): void {
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      saveRules(rules);
      rebuildIndex();
    }
  }

  function evaluate(processId: number, processName: string, metrics: Record<string, number>): AlertEvent[] {
    const fired: AlertEvent[] = [];
    const now = Date.now();
    const rulesToCheck = [
      ...(pendingEvals.get(processId) || []),
      ...globalRules,
    ];

    for (const rule of rulesToCheck) {
      const cooldownMs = (rule as any).cooldownMs || 60000;
      const lastFire = lastFiredAt.get(rule.id) || 0;
      if (now - lastFire < cooldownMs) continue;

      const value = metrics[rule.metric];
      if (value === undefined) continue;

      let triggered = false;
      switch (rule.operator) {
        case '>': triggered = value > rule.threshold; break;
        case '<': triggered = value < rule.threshold; break;
        case '>=': triggered = value >= rule.threshold; break;
        case '<=': triggered = value <= rule.threshold; break;
        case '==': triggered = value === rule.threshold; break;
      }

      if (triggered) {
        lastFiredAt.set(rule.id, now);
        const formattedValue = typeof value === 'number' ? value.toFixed(1) : String(value);
        const formattedThreshold = typeof rule.threshold === 'number' ? rule.threshold.toFixed(1) : String(rule.threshold);
        const event: AlertEvent = {
          ruleId: rule.id,
          processId,
          processName,
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          severity: (rule as any).severity || 'warning',
          message: `${processName} — ${metricLabels[rule.metric] || rule.metric} reached ${formattedValue} (threshold: ${rule.operator} ${formattedThreshold})`,
          ts: Date.now(),
        };
        fired.push(event);
        history.unshift(event);
        if (history.length > 50) history.pop();
      }
    }

    return fired;
  }

  function evaluateSystem(systemMetrics: Record<string, number>): AlertEvent[] {
    const fired: AlertEvent[] = [];
    const now = Date.now();

    for (const rule of rules) {
      if (!rule.enabled || rule.scope !== 'system') continue;

      const cooldownMs = (rule as any).cooldownMs || 60000;
      const lastFire = lastFiredAt.get(rule.id) || 0;
      if (now - lastFire < cooldownMs) continue;

      const value = systemMetrics[rule.metric];
      if (value === undefined) continue;

      let triggered = false;
      switch (rule.operator) {
        case '>': triggered = value > rule.threshold; break;
        case '<': triggered = value < rule.threshold; break;
        case '>=': triggered = value >= rule.threshold; break;
        case '<=': triggered = value <= rule.threshold; break;
        case '==': triggered = value === rule.threshold; break;
      }

      if (triggered) {
        lastFiredAt.set(rule.id, now);
        const formattedValue = typeof value === 'number' ? value.toFixed(1) : String(value);
        const metricLabel = metricLabels[rule.metric] || rule.metric;
        const event: AlertEvent = {
          ruleId: rule.id,
          processId: 0,
          processName: 'System',
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          severity: (rule as any).severity || 'warning',
          message: `System ${metricLabel} reached ${formattedValue} (threshold: ${rule.operator} ${rule.threshold})`,
          ts: now,
        };
        fired.push(event);
        history.unshift(event);
        if (history.length > 50) history.pop();
      }
    }

    return fired;
  }

  function getRules(): AlertRule[] {
    return [...rules];
  }

  const MAX_HISTORY = 50;

  function getHistory(): { events: AlertEvent[]; truncated: boolean } {
    return { events: [...history], truncated: history.length > MAX_HISTORY };
  }

  return {
    addRule,
    removeRule,
    clearRules,
    updateRule,
    evaluate,
    evaluateSystem,
    getRules,
    getHistory,
    MAX_HISTORY,
  };
}

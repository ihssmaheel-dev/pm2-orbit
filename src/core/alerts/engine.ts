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
const MAX_HISTORY = 200;

export interface AlertEngineConfig {
  dir?: string;
}

function getPaths(config?: AlertEngineConfig) {
  const dir = config?.dir || ALERTS_DIR;
  return {
    dir,
    alertsFile: path.join(dir, 'alerts.json'),
    historyFile: path.join(dir, 'alerts-history.json'),
  };
}

function loadRules(alertsFile: string): AlertRule[] {
  try {
    if (fs.existsSync(alertsFile)) {
      return JSON.parse(fs.readFileSync(alertsFile, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveRules(rules: AlertRule[], dir: string, alertsFile: string): void {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(alertsFile, JSON.stringify(rules, null, 2));
  } catch {
    // ignore
  }
}

function loadHistory(historyFile: string): AlertEvent[] {
  try {
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return [];
}

function saveHistory(history: AlertEvent[], dir: string, historyFile: string): void {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(historyFile, JSON.stringify(history.slice(0, MAX_HISTORY), null, 2));
  } catch {
    // ignore
  }
}

export function createAlertEngine(config?: AlertEngineConfig) {
  const paths = getPaths(config);
  let rules = loadRules(paths.alertsFile);
  let history = loadHistory(paths.historyFile);
  const pendingEvals = new Map<number, AlertRule[]>();
  const globalRules: AlertRule[] = [];
  const lastFiredAt = new Map<string, number>();
  const sustainedStart = new Map<string, number>();

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
    saveRules(rules, paths.dir, paths.alertsFile);
    rebuildIndex();
  }

  function removeRule(id: string): void {
    rules = rules.filter((r) => r.id !== id);
    saveRules(rules, paths.dir, paths.alertsFile);
    rebuildIndex();
  }

  function clearRules(): void {
    rules = [];
    saveRules(rules, paths.dir, paths.alertsFile);
    rebuildIndex();
    lastFiredAt.clear();
    history.length = 0;
  }

  function updateRule(id: string, updates: Partial<AlertRule>): void {
    const rule = rules.find((r) => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      saveRules(rules, paths.dir, paths.alertsFile);
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
        const duration = (rule as any).duration;
        if (duration && duration > 0) {
          const start = sustainedStart.get(rule.id) || now;
          if (!sustainedStart.has(rule.id)) {
            sustainedStart.set(rule.id, now);
          }
          if (now - start < duration * 1000) continue;
          sustainedStart.delete(rule.id);
        }

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
        if (history.length > MAX_HISTORY) history.pop();
        saveHistory(history, paths.dir, paths.historyFile);
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
        if (history.length > MAX_HISTORY) history.pop();
        saveHistory(history, paths.dir, paths.historyFile);
      }
    }

    return fired;
  }

  function getRules(): AlertRule[] {
    return [...rules];
  }

  function getHistory(): { events: AlertEvent[]; truncated: boolean } {
    return { events: [...history], truncated: history.length > MAX_HISTORY };
  }

  function clearHistory(): void {
    history.length = 0;
    saveHistory(history, paths.dir, paths.historyFile);
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
    clearHistory,
    MAX_HISTORY,
  };
}

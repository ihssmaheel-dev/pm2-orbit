import fs from 'fs';
import path from 'path';

export interface AlertRule {
  id: string;
  processId?: number;
  processName?: string;
  metric: 'cpu' | 'memory' | 'restarts' | 'status';
  operator: '>' | '<' | '==' | '>=' | '<=';
  threshold: number;
  enabled: boolean;
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
    const rulesToCheck = [
      ...(pendingEvals.get(processId) || []),
      ...globalRules,
    ];

    for (const rule of rulesToCheck) {
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
        const event: AlertEvent = {
          ruleId: rule.id,
          processId,
          processName,
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          message: `${processName}: ${rule.metric} ${rule.operator} ${rule.threshold} (current: ${value})`,
          ts: Date.now(),
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
    updateRule,
    evaluate,
    getRules,
    getHistory,
    MAX_HISTORY,
  };
}

const VALID_METRICS = ['cpu', 'memory', 'restarts', 'status', 'systemCpu', 'systemMemory', 'systemLoad'] as const;
const VALID_SCOPES = ['process', 'system'] as const;
const VALID_OPERATORS = ['>', '<', '==', '>=', '<='] as const;
const VALID_CHANNELS = ['browser', 'webhook', 'slack', 'discord', 'email'] as const;

export function sanitizeFileName(name: string): string {
  return name.replace(/\.\.(\/|\\)/g, '')
    .replace(/[/\\]/g, '_')
    .replace(/\0/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 128);
}

export function parseIdParam(id: string): number | null {
  if (!id || typeof id !== 'string') return null;
  const num = parseInt(id, 10);
  if (isNaN(num) || num < 0) return null;
  if (!Number.isSafeInteger(num)) return null;
  return num;
}

export function validateAlertRule(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;

  const b = body as Record<string, unknown>;

  if (typeof b.id !== 'string' || !b.id) return null;

  if (typeof b.metric !== 'string' || !(VALID_METRICS as readonly string[]).includes(b.metric)) return null;

  if (typeof b.operator !== 'string' || !(VALID_OPERATORS as readonly string[]).includes(b.operator)) return null;

  if (typeof b.threshold !== 'number' || isNaN(b.threshold)) return null;

  const channels: ('browser' | 'webhook' | 'slack' | 'discord' | 'email')[] = [];
  if (Array.isArray(b.channels)) {
    for (const c of b.channels) {
      if (typeof c === 'string' && (VALID_CHANNELS as readonly string[]).includes(c)) {
        channels.push(c as 'browser' | 'webhook' | 'slack' | 'discord' | 'email');
      }
    }
  }

  return {
    id: b.id,
    scope: (VALID_SCOPES as readonly string[]).includes(b.scope as string) ? b.scope : 'process',
    metric: b.metric as 'cpu' | 'memory' | 'restarts' | 'status' | 'systemCpu' | 'systemMemory' | 'systemLoad',
    operator: b.operator as '>' | '<' | '==' | '>=' | '<=',
    threshold: b.threshold,
    severity: (['info', 'warning', 'critical'] as readonly string[]).includes(b.severity as string) ? b.severity : 'warning',
    ...(typeof b.processId === 'number' ? { processId: b.processId } : {}),
    ...(typeof b.processName === 'string' ? { processName: b.processName } : {}),
    enabled: b.enabled !== false,
    channels,
    ...(typeof b.webhookUrl === 'string' ? { webhookUrl: b.webhookUrl } : {}),
    ...(typeof b.slackWebhook === 'string' ? { slackWebhook: b.slackWebhook } : {}),
    ...(typeof b.discordWebhook === 'string' ? { discordWebhook: b.discordWebhook } : {}),
    ...(typeof b.emailTo === 'string' ? { emailTo: b.emailTo } : {}),
  };
}

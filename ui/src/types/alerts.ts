export interface AlertRule {
  id: string;
  processId?: number;
  processName?: string;
  scope: 'process' | 'system';
  metric: 'cpu' | 'memory' | 'restarts' | 'status' | 'systemCpu' | 'systemMemory' | 'systemLoad';
  operator: '>' | '<' | '==' | '>=' | '<=';
  threshold: number;
  duration?: number;
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

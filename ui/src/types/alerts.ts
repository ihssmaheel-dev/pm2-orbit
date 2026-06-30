export interface AlertRule {
  id: string;
  processId?: number;
  processName?: string;
  metric: 'cpu' | 'memory' | 'restarts' | 'status';
  operator: '>' | '<' | '==' | '>=' | '<=';
  threshold: number;
  duration?: number;
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

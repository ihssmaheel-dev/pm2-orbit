export type ProcessStatus = 'online' | 'stopped' | 'errored' | 'launching' | 'stopping';
export type ProcessMode = 'fork' | 'cluster';
export type ProcessAction = 'restart' | 'stop' | 'start' | 'reload' | 'delete' | 'scale';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TagData {
  tags: Tag[];
  assignments: Record<string, string[]>;
}

export interface ProcessSnapshot {
  id: number;
  name: string;
  status: ProcessStatus;
  pid: number;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  mode: ProcessMode;
  instances: number;
  history: { ts: number[]; cpu: number[]; memory: number[] };
  customMetrics?: Record<string, number>;
  tags?: Tag[];
  note?: string;
  statusHistory?: { ts: number; status: ProcessStatus }[];
}

export interface ProcessEvent {
  type: 'update' | 'add' | 'remove';
  process: ProcessSnapshot;
}

export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number; used: number; total: number };
  network: { rx: number; tx: number };
  cpuCores: number;
  self: { cpu: number; memory: number };
}

export interface Tick {
  ts: number;
  events: ProcessEvent[];
  full?: ProcessSnapshot[] | undefined;
  fullSeq?: number | undefined;
  system: SystemSnapshot;
  type?: 'update' | 'reconnect';
  alerts?: AlertEvent[];
}

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertScope = 'process' | 'system';
export type AlertMetric = 'cpu' | 'memory' | 'restarts' | 'status' | 'systemCpu' | 'systemMemory' | 'systemLoad';
export type NotificationChannel = 'browser' | 'webhook' | 'slack' | 'discord' | 'email';

export interface AlertRule {
  id: string;
  processId?: number;
  processName?: string;
  scope: AlertScope;
  metric: AlertMetric;
  operator: '>' | '<' | '==' | '>=' | '<=';
  threshold: number;
  enabled: boolean;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  webhookUrl?: string;
  slackWebhook?: string;
  discordWebhook?: string;
  emailTo?: string;
  cooldownMs?: number;
  duration?: number;
}

export interface AlertEvent {
  ruleId: string;
  processId: number;
  processName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  message: string;
  ts: number;
}

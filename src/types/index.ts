export type ProcessStatus = 'online' | 'stopped' | 'errored' | 'launching' | 'stopping';
export type ProcessMode = 'fork' | 'cluster';
export type ProcessAction = 'restart' | 'stop' | 'start' | 'reload' | 'delete' | 'scale';

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
}

export interface ProcessEvent {
  type: 'update' | 'add' | 'remove';
  process: ProcessSnapshot;
}

export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number };
  network: { rx: number; tx: number };
  cpuCores: number;
}

export interface Tick {
  ts: number;
  events: ProcessEvent[];
  full?: ProcessSnapshot[];
  fullSeq?: number;
  system: SystemSnapshot;
  type?: 'update' | 'reconnect';
}

export interface AlertRule {
  id: string;
  processId?: number;
  processName?: string;
  metric: 'cpu' | 'memory' | 'restarts' | 'status';
  operator: '>' | '<' | '==' | '>=' | '<=';
  threshold: number;
  duration?: number;
  enabled: boolean;
  channels?: ('browser' | 'webhook' | 'slack' | 'discord' | 'email')[];
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

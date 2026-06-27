export type ProcessStatus = 'online' | 'stopped' | 'errored' | 'launching' | 'stopping';
export type ProcessMode = 'fork' | 'cluster';

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

import type { ProcessSnapshot, ProcessEvent } from './pm2';
import type { SystemSnapshot } from './system';

export interface Tick {
  ts: number;
  events: ProcessEvent[];
  full?: ProcessSnapshot[];
  fullSeq?: number;
  system: SystemSnapshot;
  type?: 'update' | 'reconnect';
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  version: string;
  processes?: number;
}

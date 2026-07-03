import type { ProcessSnapshot, ProcessEvent } from './pm2';
import type { SystemSnapshot } from './system';
import type { AlertEvent } from './alerts';

export interface Tick {
  ts: number;
  events: ProcessEvent[];
  full?: ProcessSnapshot[];
  fullSeq?: number;
  system: SystemSnapshot;
  type?: 'update' | 'reconnect';
  alerts?: AlertEvent[];
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  version: string;
  processes?: number;
}

import type { ProcessSnapshot, ProcessEvent } from './pm2';
import type { SystemSnapshot } from './system';

export interface Tick {
  ts: number;
  events: ProcessEvent[];
  full?: ProcessSnapshot[];
  fullHash?: string;
  system: SystemSnapshot;
}

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  version: string;
  processes?: number;
}

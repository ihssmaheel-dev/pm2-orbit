export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number; used: number; total: number };
  network: { rx: number; tx: number };
  cpuCores: number;
}

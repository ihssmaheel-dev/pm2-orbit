import os from 'os';

export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number };
  network: { rx: number; tx: number };
}

let prevIdle = 0;
let prevTotal = 0;

export function readSystem(): SystemSnapshot {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    const { user, nice, sys, irq, idle: cpuIdle } = cpu.times;
    idle += cpuIdle;
    total += user + nice + sys + irq + cpuIdle;
  }

  const idleDiff = idle - prevIdle;
  const totalDiff = total - prevTotal;
  prevIdle = idle;
  prevTotal = total;

  const cpuPercent = totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 1000) / 10;

  return {
    cpu: cpuPercent,
    memory: { used: os.totalmem() - os.freemem(), total: os.totalmem() },
    loadAvg: os.loadavg() as [number, number, number],
    disk: { read: 0, write: 0 },
    network: { rx: 0, tx: 0 },
  };
}

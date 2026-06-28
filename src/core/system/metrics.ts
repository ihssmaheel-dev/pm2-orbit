import os from 'os';
import si from 'systeminformation';

export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number };
  network: { rx: number; tx: number };
}

let prevIdle = 0;
let prevTotal = 0;

let diskCache = { read: 0, write: 0 };
let networkCache = { rx: 0, tx: 0 };
let collectorTimer: ReturnType<typeof setInterval> | null = null;

async function collect() {
  try {
    const [netData, fsData] = await Promise.all([
      si.networkStats(),
      si.fsStats(),
    ]);

    let rx = 0;
    let tx = 0;
    for (const iface of netData) {
      if (iface.iface !== 'lo' && !iface.iface.startsWith('lo')) {
        rx += iface.rx_sec || 0;
        tx += iface.tx_sec || 0;
      }
    }
    networkCache = { rx, tx };

    diskCache = {
      read: fsData.rx_sec || 0,
      write: fsData.wx_sec || 0,
    };
  } catch {
    // keep previous values on error
  }
}

export function startMetricsCollector(intervalMs = 2000) {
  if (collectorTimer) return;
  collect();
  collectorTimer = setInterval(collect, intervalMs);
}

export function stopMetricsCollector() {
  if (collectorTimer) {
    clearInterval(collectorTimer);
    collectorTimer = null;
  }
}

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
    disk: diskCache,
    network: networkCache,
  };
}

import os from 'os';
import si from 'systeminformation';

export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number };
  network: { rx: number; tx: number };
  cpuCores: number;
}

let prevIdle = 0;
let prevTotal = 0;

let diskCache = { read: 0, write: 0 };
let networkCache = { rx: 0, tx: 0 };
let loadCache: [number, number, number] | null = null;
let collectorTimer: ReturnType<typeof setInterval> | null = null;

async function collectNetwork() {
  try {
    const netData = await si.networkStats();
    let rx = 0;
    let tx = 0;
    for (const iface of netData) {
      if (iface.iface !== 'lo' && !iface.iface.startsWith('lo')) {
        rx += iface.rx_sec || 0;
        tx += iface.tx_sec || 0;
      }
    }
    networkCache = { rx, tx };
  } catch {
    // keep previous values
  }
}

async function collectDisk() {
  // Method 1: systeminformation disksIO (ops/sec × 512 byte sectors)
  try {
    const disk = await si.disksIO();
    if (disk.rIO_sec || disk.wIO_sec) {
      diskCache = {
        read: Math.round((disk.rIO_sec || 0) * 512),
        write: Math.round((disk.wIO_sec || 0) * 512),
      };
      return;
    }
  } catch {}

  // Method 2: systeminformation fsStats (bytes/sec, filesystem layer)
  try {
    const fs = await si.fsStats();
    if (fs.rx_sec || fs.wx_sec) {
      diskCache = { read: fs.rx_sec || 0, write: fs.wx_sec || 0 };
      return;
    }
  } catch {}

  // Method 3: PowerShell CIM query on Windows
  if (os.platform() === 'win32') {
    try {
      const { execSync } = require('child_process');
      const output = execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter \'Name LIKE \\\"%Total%\\\"\' | Select-Object DiskReadBytesPerSec, DiskWriteBytesPerSec | ConvertTo-Json"',
        { encoding: 'utf-8', timeout: 5000 },
      );
      const data = JSON.parse(output.trim());
      const items = Array.isArray(data) ? data : [data];
      if (items.length > 0) {
        const read = parseFloat(items[0].DiskReadBytesPerSec) || 0;
        const write = parseFloat(items[0].DiskWriteBytesPerSec) || 0;
        if (read || write) {
          diskCache = { read, write };
          return;
        }
      }
    } catch {}
  }
}

async function collectLoad() {
  if (os.platform() === 'win32') {
    try {
      const cl = await si.currentLoad();
      if (cl.avgLoad > 0 || cl.currentLoad > 0) {
        const avg = cl.avgLoad || cl.currentLoad / 100;
        loadCache = [avg, avg * 0.9, avg * 0.85];
      }
    } catch {
      // keep previous values
    }
  }
}

async function collect() {
  await Promise.all([collectNetwork(), collectDisk(), collectLoad()]);
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

  const loadAvg: [number, number, number] =
    os.platform() === 'win32' && loadCache
      ? loadCache
      : (os.loadavg() as [number, number, number]);

  return {
    cpu: cpuPercent,
    memory: { used: os.totalmem() - os.freemem(), total: os.totalmem() },
    loadAvg,
    disk: diskCache,
    network: networkCache,
    cpuCores: cpus.length,
  };
}

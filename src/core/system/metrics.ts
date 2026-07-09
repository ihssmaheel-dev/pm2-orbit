import os from 'os';
import si from 'systeminformation';

export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number; used: number; total: number };
  network: { rx: number; tx: number };
  cpuCores: number;
  self: { cpu: number; memory: number };
}

let prevIdle = 0;
let prevTotal = 0;

let prevSelfUsage = process.cpuUsage();
let prevSelfTime = Date.now();

function computeSelfMetrics(): { cpu: number; memory: number } {
  const now = Date.now();
  const elapsedMs = Math.max(1, now - prevSelfTime);
  const usage = process.cpuUsage(prevSelfUsage);
  prevSelfUsage = usage;
  prevSelfTime = now;
  const micros = usage.user + usage.system;
  const cpuPercent = Math.round((micros / (elapsedMs * 1000)) * 1000) / 10;
  const memory = process.memoryUsage().rss;
  return { cpu: Math.max(0, cpuPercent), memory };
}

let diskCache = { read: 0, write: 0 };
let diskSpaceCache = { used: 0, total: 0 };
let networkCache = { rx: 0, tx: 0 };
let loadCache: [number, number, number] | null = null;
let collectorTimer: ReturnType<typeof setInterval> | null = null;

let cachedSnapshot: SystemSnapshot | null = null;

let lastNetCollection = 0;

async function collectNetwork() {
  const now = Date.now();
  if (now - lastNetCollection < 2000) return;
  lastNetCollection = now;
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

  // Method 3: PowerShell CIM query on Windows (cached, max one attempt per 30s)
  if (os.platform() === 'win32') {
    const lastPsQuery = (global as any).__lastDiskPsQuery || 0;
    if (Date.now() - lastPsQuery > 30000) {
      (global as any).__lastDiskPsQuery = Date.now();
      try {
        const { exec } = require('child_process');
        const output = await new Promise<string>((resolve) => {
          exec(
            'powershell -NoProfile -Command "Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter \'Name LIKE \\\"%Total%\\\"\' | Select-Object DiskReadBytesPerSec, DiskWriteBytesPerSec | ConvertTo-Json"',
            { encoding: 'utf-8', timeout: 5000 },
            (_err: Error | null, stdout: string) => resolve(stdout || '')
          );
        });
        if (output) {
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
        }
      } catch {}
    }
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

async function collectDiskSpace() {
  try {
    const fsSize = await si.fsSize();
    if (fsSize && fsSize.length > 0) {
      // Use the first non-virtual filesystem (typically the root)
      const rootFs = fsSize.find((f) => f.mount === '/') || fsSize[0];
      if (rootFs) {
        diskSpaceCache = {
          used: rootFs.used || 0,
          total: rootFs.size || 0,
        };
      }
    }
  } catch {
    // keep previous values
  }
}

async function collect() {
  await Promise.all([collectNetwork(), collectDisk(), collectLoad(), collectDiskSpace()]);
  cachedSnapshot = null;
}

export function startMetricsCollector(intervalMs = 2000) {
  if (collectorTimer) return;
  cachedSnapshot = null;
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
  if (cachedSnapshot) return cachedSnapshot;

  cachedSnapshot = computeSystemSnapshot();
  return cachedSnapshot;
}

function computeSystemSnapshot(): SystemSnapshot {
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
    disk: { ...diskCache, ...diskSpaceCache },
    network: networkCache,
    cpuCores: cpus.length,
    self: computeSelfMetrics(),
  };
}

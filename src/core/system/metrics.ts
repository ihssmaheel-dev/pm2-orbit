import os from 'os';
import { execSync } from 'child_process';

export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number };
  network: { rx: number; tx: number };
}

let prevIdle = 0;
let prevTotal = 0;

let prevDiskRead = 0;
let prevDiskWrite = 0;
let prevNetRx = 0;
let prevNetTx = 0;
let prevDiskTime = Date.now();
let prevNetTime = Date.now();

function readDiskLinux(): { read: number; write: number } {
  try {
    const data = execSync('cat /proc/diskstats', { encoding: 'utf-8', timeout: 1000 });
    let readBytes = 0;
    let writeBytes = 0;
    for (const line of data.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 14) continue;
      const name = parts[2];
      if (name === 'sda' || name === 'nvme0n1' || name === 'vda' || name === 'xvda') {
        readBytes += parseInt(parts[5]) * 512;
        writeBytes += parseInt(parts[9]) * 512;
      }
    }
    const now = Date.now();
    const elapsed = (now - prevDiskTime) / 1000;
    prevDiskTime = now;
    const readRate = elapsed > 0 ? (readBytes - prevDiskRead) / elapsed : 0;
    const writeRate = elapsed > 0 ? (writeBytes - prevDiskWrite) / elapsed : 0;
    prevDiskRead = readBytes;
    prevDiskWrite = writeBytes;
    return { read: Math.max(0, readRate), write: Math.max(0, writeRate) };
  } catch {
    return { read: 0, write: 0 };
  }
}

function readDiskWindows(): { read: number; write: number } {
  try {
    const output = execSync(
      'powershell -Command "Get-Counter \'\\PhysicalDisk(_Total)\\Disk Read Bytes/sec\',\'\\PhysicalDisk(_Total)\\Disk Write Bytes/sec\' | Select-Object -ExpandProperty CounterSamples | ConvertTo-Json"',
      { encoding: 'utf-8', timeout: 2000 },
    );
    const data = JSON.parse(output);
    const samples = Array.isArray(data) ? data : [data];
    let read = 0;
    let write = 0;
    for (const s of samples) {
      if (s.Path?.includes('Read Bytes/sec')) read = s.CookedValue || 0;
      if (s.Path?.includes('Write Bytes/sec')) write = s.CookedValue || 0;
    }
    return { read, write };
  } catch {
    return { read: 0, write: 0 };
  }
}

function readNetLinux(): { rx: number; tx: number } {
  try {
    const data = execSync('cat /proc/net/dev', { encoding: 'utf-8', timeout: 1000 });
    let rxBytes = 0;
    let txBytes = 0;
    for (const line of data.split('\n')) {
      if (line.includes(':') && !line.includes('lo:')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const stats = parts[1].trim().split(/\s+/);
          if (stats.length >= 10) {
            rxBytes += parseInt(stats[0]) || 0;
            txBytes += parseInt(stats[8]) || 0;
          }
        }
      }
    }
    const now = Date.now();
    const elapsed = (now - prevNetTime) / 1000;
    prevNetTime = now;
    const rxRate = elapsed > 0 ? (rxBytes - prevNetRx) / elapsed : 0;
    const txRate = elapsed > 0 ? (txBytes - prevNetTx) / elapsed : 0;
    prevNetRx = rxBytes;
    prevNetTx = txBytes;
    return { rx: Math.max(0, rxRate), tx: Math.max(0, txRate) };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

function readNetWindows(): { rx: number; tx: number } {
  try {
    const output = execSync(
      'powershell -Command "Get-Counter \'\\Network Interface(*)\\Bytes Received/sec\',\'\\Network Interface(*)\\Bytes Sent/sec\' | Select-Object -ExpandProperty CounterSamples | ConvertTo-Json"',
      { encoding: 'utf-8', timeout: 2000 },
    );
    const data = JSON.parse(output);
    const samples = Array.isArray(data) ? data : [data];
    let rx = 0;
    let tx = 0;
    for (const s of samples) {
      if (s.Path?.includes('Bytes Received/sec')) rx += s.CookedValue || 0;
      if (s.Path?.includes('Bytes Sent/sec')) tx += s.CookedValue || 0;
    }
    return { rx, tx };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

function readDisk(): { read: number; write: number } {
  const platform = os.platform();
  if (platform === 'linux') return readDiskLinux();
  if (platform === 'win32') return readDiskWindows();
  return { read: 0, write: 0 };
}

function readNet(): { rx: number; tx: number } {
  const platform = os.platform();
  if (platform === 'linux') return readNetLinux();
  if (platform === 'win32') return readNetWindows();
  return { rx: 0, tx: 0 };
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
    disk: readDisk(),
    network: readNet(),
  };
}

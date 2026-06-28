import os from 'os';
import fs from 'fs';

export interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number };
  network: { rx: number; tx: number };
}

let prevIdle = 0;
let prevTotal = 0;

let prevNetRx = 0;
let prevNetTx = 0;
let prevNetTime = Date.now();

function readNetWindows(): { rx: number; tx: number } {
  try {
    // Use PowerShell with a simpler command
    const { execSync } = require('child_process');
    const output = execSync(
      'powershell -NoProfile -Command "Get-NetAdapter | Select-Object BytesReceived,BytesSent | ConvertTo-Json"',
      { encoding: 'utf-8', timeout: 5000 },
    );
    const data = JSON.parse(output);
    const adapters = Array.isArray(data) ? data : [data];
    let rx = 0;
    let tx = 0;
    for (const a of adapters) {
      rx += a.BytesReceived || 0;
      tx += a.BytesSent || 0;
    }
    const now = Date.now();
    const elapsed = (now - prevNetTime) / 1000;
    prevNetTime = now;
    const rxRate = elapsed > 0 ? (rx - prevNetRx) / elapsed : 0;
    const txRate = elapsed > 0 ? (tx - prevNetTx) / elapsed : 0;
    prevNetRx = rx;
    prevNetTx = tx;
    return { rx: Math.max(0, rxRate), tx: Math.max(0, txRate) };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

function readNetLinux(): { rx: number; tx: number } {
  try {
    const data = fs.readFileSync('/proc/net/dev', 'utf-8');
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

function readNet(): { rx: number; tx: number } {
  const platform = os.platform();
  if (platform === 'win32') return readNetWindows();
  return readNetLinux();
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
    disk: { read: 0, write: 0 },
    network: readNet(),
  };
}

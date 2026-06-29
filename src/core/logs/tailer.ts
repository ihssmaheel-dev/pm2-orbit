import fs from 'fs';
import path from 'path';
import { sanitizeFileName } from '../../utils/validate';

const MAX_BUFFER_SIZE = parseInt(process.env.PM2_ORBIT_LOG_BUFFER || '2000', 10);
const POLL_INTERVAL = 2000;
const DEBOUNCE_MS = 150;

interface LogEntry {
  ts: number;
  stream: 'stdout' | 'stderr';
  message: string;
}

export function createLogTailer(processId: number, processName: string, logPaths?: { out?: string; err?: string }) {
  const buffer: LogEntry[] = [];
  let closed = false;
  const watchers: fs.FSWatcher[] = [];
  const filePositions: Record<string, number> = {};
  const debounceTimers: Record<string, NodeJS.Timeout | null> = {};
  let pollTimer: NodeJS.Timeout | null = null;

  function resolveLogPath(type: 'out' | 'err'): string {
    if (logPaths) {
      if (type === 'out' && logPaths.out) return logPaths.out;
      if (type === 'err' && logPaths.err) return logPaths.err;
    }

    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const base = path.join(homeDir, '.pm2', 'logs', sanitizeFileName(processName));

    const patterns = [`${base}-${type}.log`];
    if (type === 'err') patterns.push(`${base}-error.log`);
    for (let i = 0; i < 16; i++) {
      patterns.push(`${base}-${type}-${i}.log`);
      if (type === 'err') patterns.push(`${base}-error-${i}.log`);
    }

    for (const p of patterns) {
      if (fs.existsSync(p)) return p;
    }
    return patterns[0];
  }

  function readNewLines(filePath: string, stream: 'stdout' | 'stderr') {
    try {
      if (!fs.existsSync(filePath)) return;

      const stat = fs.statSync(filePath);
      const lastPos = filePositions[filePath] || 0;

      if (stat.size < lastPos) {
        filePositions[filePath] = 0;
      }

      if (stat.size <= (filePositions[filePath] || 0)) return;

      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(stat.size - (filePositions[filePath] || 0));
      fs.readSync(fd, buf, 0, buf.length, filePositions[filePath] || 0);
      fs.closeSync(fd);

      filePositions[filePath] = stat.size;

      const text = buf.toString('utf-8');
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.length === 0 && buffer.length > 0) continue;

        buffer.push({
          ts: Date.now(),
          stream,
          message: line,
        });
      }

      if (buffer.length > MAX_BUFFER_SIZE) {
        buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
      }
    } catch {
      // ignore read errors
    }
  }

  function pollFiles() {
    if (closed) return;
    const outPath = resolveLogPath('out');
    const errPath = resolveLogPath('err');
    readNewLines(outPath, 'stdout');
    readNewLines(errPath, 'stderr');
  }

  function startWatching() {
    const outPath = resolveLogPath('out');
    const errPath = resolveLogPath('err');

    readNewLines(outPath, 'stdout');
    readNewLines(errPath, 'stderr');

    for (const fp of [outPath, errPath]) {
      try {
        if (fs.existsSync(fp)) {
          const watcher = fs.watch(fp, () => {
            if (closed) return;
            if (debounceTimers[fp]) clearTimeout(debounceTimers[fp]!);
            debounceTimers[fp] = setTimeout(() => {
              debounceTimers[fp] = null;
              readNewLines(fp, fp === outPath ? 'stdout' : 'stderr');
            }, DEBOUNCE_MS);
          });
          watchers.push(watcher);
        }
      } catch {
        // ignore
      }
    }

    pollTimer = setInterval(pollFiles, POLL_INTERVAL);
  }

  startWatching();

  function getBuffer(): LogEntry[] {
    return [...buffer];
  }

  function close(): void {
    closed = true;
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    for (const fp of Object.keys(debounceTimers)) {
      if (debounceTimers[fp]) clearTimeout(debounceTimers[fp]!);
    }
    for (const w of watchers) {
      try { w.close(); } catch { /* ignore */ }
    }
  }

  function isClosed(): boolean {
    return closed;
  }

  return {
    processId,
    processName,
    getBuffer,
    close,
    isClosed,
  };
}

export type LogTailer = ReturnType<typeof createLogTailer>;

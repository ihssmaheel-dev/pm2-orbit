import fs from 'fs';
import path from 'path';

const MAX_BUFFER_SIZE = parseInt(process.env.PM2_ORBIT_LOG_BUFFER || '500', 10);

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

  function getLogPath(type: 'out' | 'err'): string {
    if (logPaths) {
      if (type === 'out' && logPaths.out) return logPaths.out;
      if (type === 'err' && logPaths.err) return logPaths.err;
    }

    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const base = path.join(homeDir, '.pm2', 'logs', processName);

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

      if (stat.size <= lastPos) return;

      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(stat.size - lastPos);
      fs.readSync(fd, buf, 0, buf.length, lastPos);
      fs.closeSync(fd);

      filePositions[filePath] = stat.size;

      const text = buf.toString('utf-8');
      const lines = text.split('\n').filter((l) => l.length > 0);

      for (const line of lines) {
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

  function startWatching() {
    const outPath = getLogPath('out');
    const errPath = getLogPath('err');

    readNewLines(outPath, 'stdout');
    readNewLines(errPath, 'stderr');

    for (const fp of [outPath, errPath]) {
      try {
        if (fs.existsSync(fp)) {
          const watcher = fs.watch(fp, () => {
            if (!closed) {
              readNewLines(fp, fp === outPath ? 'stdout' : 'stderr');
            }
          });
          watchers.push(watcher);
        }
      } catch {
        // ignore
      }
    }
  }

  startWatching();

  function getBuffer(): LogEntry[] {
    return [...buffer];
  }

  function close(): void {
    closed = true;
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

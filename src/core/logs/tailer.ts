import fs from 'fs';
import path from 'path';

const MAX_BUFFER_SIZE = parseInt(process.env.PM2_ORBIT_LOG_BUFFER || '500', 10);

interface LogEntry {
  ts: number;
  stream: 'stdout' | 'stderr';
  message: string;
}

export function createLogTailer(processId: number, processName: string) {
  const buffer: LogEntry[] = [];
  let closed = false;
  const watchers: fs.FSWatcher[] = [];
  const filePositions: Record<string, number> = {};

  function getLogPath(type: 'out' | 'err'): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.pm2', 'logs', `${processName}-${type}.log`);
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

    // Read initial content
    readNewLines(outPath, 'stdout');
    readNewLines(errPath, 'stderr');

    // Watch for changes
    try {
      if (fs.existsSync(outPath)) {
        const watcher = fs.watch(outPath, () => {
          if (!closed) readNewLines(outPath, 'stdout');
        });
        watchers.push(watcher);
      }
    } catch {
      // ignore
    }

    try {
      if (fs.existsSync(errPath)) {
        const watcher = fs.watch(errPath, () => {
          if (!closed) readNewLines(errPath, 'stderr');
        });
        watchers.push(watcher);
      }
    } catch {
      // ignore
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

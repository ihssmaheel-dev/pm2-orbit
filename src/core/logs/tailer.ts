import fs from 'fs';
import path from 'path';
import { sanitizeFileName } from '../../utils/validate';

const MAX_BUFFER_SIZE = parseInt(process.env.PM2_ORBIT_LOG_BUFFER || '2000', 10);

interface LogEntry {
  ts: number;
  stream: 'stdout' | 'stderr';
  message: string;
}

export function createLogTailer(processId: number, processName: string, logPaths?: { out?: string; err?: string }) {
  const buffer: LogEntry[] = [];
  let closed = false;
  let outPath = '';
  let errPath = '';
  const filePositions: Record<string, number> = {};
  let partial: string | null = null;

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
        partial = null;
      }

      if (stat.size <= (filePositions[filePath] || 0)) return;

      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(stat.size - (filePositions[filePath] || 0));
      fs.readSync(fd, buf, 0, buf.length, filePositions[filePath] || 0);
      fs.closeSync(fd);

      filePositions[filePath] = stat.size;

      let text = buf.toString('utf-8');
      if (partial !== null) {
        text = partial + text;
        partial = null;
      }

      if (!text.endsWith('\n')) {
        const idx = text.lastIndexOf('\n');
        if (idx >= 0) {
          partial = text.slice(idx + 1);
          text = text.slice(0, idx + 1);
        } else {
          partial = text;
          return;
        }
      }

      const lines = text.split('\n');
      lines.pop();

      for (const raw of lines) {
        const line = raw.replace(/\r$/, '');
        if (line.length === 0) continue;

        const ch = line[0];
        if (ch === ' ' || ch === '\t' || ch === '}' || ch === ']' || ch === ')') {
          if (buffer.length > 0) {
            buffer[buffer.length - 1].message += '\n' + line;
            continue;
          }
        }

        buffer.push({ ts: Date.now(), stream, message: line });
      }

      if (buffer.length > MAX_BUFFER_SIZE) {
        buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
      }
    } catch {
      // ignore read errors
    }
  }

  function init() {
    outPath = resolveLogPath('out');
    errPath = resolveLogPath('err');
    readNewLines(outPath, 'stdout');
    readNewLines(errPath, 'stderr');
  }

  function poll() {
    if (closed) return;
    readNewLines(outPath, 'stdout');
    readNewLines(errPath, 'stderr');
  }

  function getBuffer(): LogEntry[] {
    return buffer;
  }

  function getNewEntries(sinceIndex: number): { entries: LogEntry[]; total: number } {
    if (sinceIndex >= buffer.length) return { entries: [], total: buffer.length };
    if (sinceIndex <= 0) return { entries: buffer.slice(), total: buffer.length };
    return { entries: buffer.slice(sinceIndex), total: buffer.length };
  }

  function close(): void {
    closed = true;
  }

  function isClosed(): boolean {
    return closed;
  }

  init();

  return {
    processId,
    processName,
    poll,
    getBuffer,
    getNewEntries,
    close,
    isClosed,
  };
}

export type LogTailer = ReturnType<typeof createLogTailer>;

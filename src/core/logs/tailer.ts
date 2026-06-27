import fs from 'fs';
import path from 'path';
import readline from 'readline';

const MAX_BUFFER_SIZE = parseInt(process.env.PM2_ORBIT_LOG_BUFFER || '500', 10);

interface LogEntry {
  ts: number;
  stream: 'stdout' | 'stderr';
  message: string;
}

export function createLogTailer(processId: number, processName: string) {
  const buffer: LogEntry[] = [];
  let closed = false;

  function getLogPath(type: 'out' | 'err'): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.pm2', 'logs', `${processName}-${type}.log`);
  }

  function tail(type: 'out' | 'err'): readline.Interface | null {
    const logPath = getLogPath(type);
    if (!fs.existsSync(logPath)) return null;

    const stream = fs.createReadStream(logPath, { encoding: 'utf-8', flags: 'r' });
    const rl = readline.createInterface({ input: stream, terminal: false });

    // Read last N lines
    const lines: string[] = [];
    rl.on('line', (line) => {
      lines.push(line);
      if (lines.length > MAX_BUFFER_SIZE) lines.shift();
    });

    rl.on('close', () => {
      for (const line of lines) {
        buffer.push({
          ts: Date.now(),
          stream: type === 'err' ? 'stderr' : 'stdout',
          message: line,
        });
      }
      if (buffer.length > MAX_BUFFER_SIZE) {
        buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
      }
    });

    return rl;
  }

  const stdoutRl = tail('out');
  const stderrRl = tail('err');

  function getBuffer(): LogEntry[] {
    return [...buffer];
  }

  function close(): void {
    closed = true;
    stdoutRl?.close();
    stderrRl?.close();
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

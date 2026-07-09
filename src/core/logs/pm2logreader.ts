import fs from 'fs';
import path from 'path';
import type { LogEntry } from '../pm2/bridge';

const PM2_LOGS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.pm2', 'logs',
);

const ANSIRE = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORa-z]/g;

function stripAnsi(str: string): string {
  return str.replace(ANSIRE, '');
}

function readLastLines(filePath: string, maxLines: number): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.length > 0);
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

export function readHistoricalLogs(
  processName: string,
  processId: number,
  maxLines: number = 100,
): LogEntry[] {
  const now = Date.now();
  const entries: LogEntry[] = [];

  // Read stdout log
  const outLines = readLastLines(path.join(PM2_LOGS_DIR, `${processName}-out.log`), maxLines);
  for (const line of outLines) {
    entries.push({
      ts: now,
      processId,
      processName,
      stream: 'stdout',
      message: stripAnsi(line),
    });
  }

  // Read stderr log
  const errLines = readLastLines(path.join(PM2_LOGS_DIR, `${processName}-err.log`), maxLines);
  for (const line of errLines) {
    entries.push({
      ts: now,
      processId,
      processName,
      stream: 'stderr',
      message: stripAnsi(line),
    });
  }

  // Sort by position (interleaved stdout/stderr from PM2 is sequential)
  entries.sort((a, b) => {
    const aIdx = a.stream === 'stdout' ? outLines.indexOf(a.message) : errLines.indexOf(a.message);
    const bIdx = b.stream === 'stdout' ? outLines.indexOf(b.message) : errLines.indexOf(b.message);
    return aIdx - bIdx;
  });

  return entries.slice(-maxLines);
}

import { logger } from '../../utils/logger';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Database: any = null;

try {
  Database = require('better-sqlite3');
} catch {
  // better-sqlite3 not installed — use in-memory fallback
}

const DB_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.pm2-orbit',
);
const DB_PATH = path.join(DB_DIR, 'history.db');

export interface ProcessMetricRow {
  ts: number;
  processId: number;
  processName: string;
  cpu: number;
  memory: number;
}

export interface SystemMetricRow {
  ts: number;
  cpu: number;
  memoryUsed: number;
  memoryTotal: number;
  load1: number;
  load5: number;
  load15: number;
}

const MEMORY_RETENTION_MS = 30 * 60 * 1000;

function createMemoryStore() {
  const processHistory: ProcessMetricRow[] = [];
  const systemHistory: SystemMetricRow[] = [];

  function prune() {
    const cutoff = Date.now() - MEMORY_RETENTION_MS;
    while (processHistory.length > 0 && processHistory[0].ts < cutoff) {
      processHistory.shift();
    }
    while (systemHistory.length > 0 && systemHistory[0].ts < cutoff) {
      systemHistory.shift();
    }
  }

  const pruneInterval = setInterval(prune, 60000);

  return {
    pushProcessMetrics(row: ProcessMetricRow) {
      processHistory.push(row);
      if (processHistory.length > 5000) processHistory.shift();
    },
    pushSystemMetrics(row: SystemMetricRow) {
      systemHistory.push(row);
      if (systemHistory.length > 2000) systemHistory.shift();
    },
    getProcessHistory(processId: number, hours = 24): ProcessMetricRow[] {
      const cutoff = Date.now() - Math.min(hours, 1) * 60 * 60 * 1000;
      return processHistory.filter((r) => r.processId === processId && r.ts > cutoff);
    },
    getSystemHistory(hours = 24): SystemMetricRow[] {
      const cutoff = Date.now() - Math.min(hours, 1) * 60 * 60 * 1000;
      return systemHistory.filter((r) => r.ts > cutoff);
    },
    close() {
      clearInterval(pruneInterval);
      processHistory.length = 0;
      systemHistory.length = 0;
    },
  };
}

export function createStore() {
  if (!Database) {
    logger.warn('better-sqlite3 not installed — using in-memory history');
    return createMemoryStore();
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS process_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      process_id INTEGER NOT NULL,
      process_name TEXT NOT NULL,
      cpu REAL NOT NULL,
      memory REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_process_history_ts ON process_history(ts);
    CREATE INDEX IF NOT EXISTS idx_process_history_pid ON process_history(process_id);

    CREATE TABLE IF NOT EXISTS system_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      cpu REAL NOT NULL,
      memory_used INTEGER NOT NULL,
      memory_total INTEGER NOT NULL,
      load1 REAL NOT NULL,
      load5 REAL NOT NULL,
      load15 REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_system_history_ts ON system_history(ts);
  `);

  const insertProcess = db.prepare(
    'INSERT INTO process_history (ts, process_id, process_name, cpu, memory) VALUES (?, ?, ?, ?, ?)',
  );

  const insertSystem = db.prepare(
    'INSERT INTO system_history (ts, cpu, memory_used, memory_total, load1, load5, load15) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );

  const processBuffer: ProcessMetricRow[] = [];
  const systemBuffer: SystemMetricRow[] = [];
  const FLUSH_INTERVAL = 5000;
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;
  let lastCleanup = 0;

  function flush() {
    if (processBuffer.length > 0) {
      const tx = db.transaction(() => {
        for (const row of processBuffer) {
          insertProcess.run(row.ts, row.processId, row.processName, row.cpu, row.memory);
        }
      });
      tx();
      processBuffer.length = 0;
    }

    if (systemBuffer.length > 0) {
      const tx = db.transaction(() => {
        for (const row of systemBuffer) {
          insertSystem.run(row.ts, row.cpu, row.memoryUsed, row.memoryTotal, row.load1, row.load5, row.load15);
        }
      });
      tx();
      systemBuffer.length = 0;
    }

    const now = Date.now();
    if (now - lastCleanup > CLEANUP_INTERVAL) {
      lastCleanup = now;
      const cutoff = now - HISTORY_RETENTION_MS;
      db.prepare('DELETE FROM process_history WHERE ts < ?').run(cutoff);
      db.prepare('DELETE FROM system_history WHERE ts < ?').run(cutoff);
    }
  }

  const flushInterval = setInterval(flush, FLUSH_INTERVAL);

  function close() {
    clearInterval(flushInterval);
    flush();
    db.close();
  }

  function pushProcessMetrics(row: ProcessMetricRow) {
    processBuffer.push(row);
  }

  function pushSystemMetrics(row: SystemMetricRow) {
    systemBuffer.push(row);
  }

  function getProcessHistory(processId: number, hours = 24): ProcessMetricRow[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return db.prepare(
      'SELECT ts, process_id as processId, process_name as processName, cpu, memory FROM process_history WHERE process_id = ? AND ts > ? ORDER BY ts ASC',
    ).all(processId, cutoff) as ProcessMetricRow[];
  }

  function getSystemHistory(hours = 24): SystemMetricRow[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return db.prepare(
      'SELECT ts, cpu, memory_used as memoryUsed, memory_total as memoryTotal, load1, load5, load15 FROM system_history WHERE ts > ? ORDER BY ts ASC',
    ).all(cutoff) as SystemMetricRow[];
  }

  return {
    pushProcessMetrics,
    pushSystemMetrics,
    getProcessHistory,
    getSystemHistory,
    close,
  };
}

export type Store = ReturnType<typeof createStore>;

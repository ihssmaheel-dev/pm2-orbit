const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LOG_LEVELS;

const rawLevel = process.env.LOG_LEVEL || 'info';
const currentLevel: Level = (rawLevel in LOG_LEVELS) ? rawLevel as Level : 'info';

function shouldLog(level: Level): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  debug: (msg: string, ...extra: unknown[]) => {
    if (!shouldLog('debug')) return;
    console.log(`  \x1b[90m${timestamp()} [DEBUG] ${msg}\x1b[0m`, ...extra);
  },

  info: (msg: string, ...extra: unknown[]) => {
    if (!shouldLog('info')) return;
    console.log(`  ${timestamp()} [INFO] ${msg}`, ...extra);
  },

  warn: (msg: string, ...extra: unknown[]) => {
    if (!shouldLog('warn')) return;
    console.log(`  \x1b[33m${timestamp()} [WARN] ${msg}\x1b[0m`, ...extra);
  },

  error: (msg: string, ...extra: unknown[]) => {
    if (!shouldLog('error')) return;
    console.error(`  \x1b[31m${timestamp()} [ERROR] ${msg}\x1b[0m`, ...extra);
  },
};

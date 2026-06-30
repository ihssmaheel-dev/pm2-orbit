import { createLogTailer, type LogTailer } from './tailer';

const POLL_INTERVAL = 2000;

const registry = new Map<number, { tailer: LogTailer; refs: number; name: string }>();
let pollTimer: NodeJS.Timeout | null = null;

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    for (const [, entry] of registry) {
      entry.tailer.poll();
    }
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function acquireTailer(processId: number, processName: string, logPaths?: { out?: string; err?: string }): LogTailer {
  const existing = registry.get(processId);
  if (existing) {
    existing.refs++;
    return existing.tailer;
  }

  const tailer = createLogTailer(processId, processName, logPaths);
  registry.set(processId, { tailer, refs: 1, name: processName });
  startPolling();
  return tailer;
}

export function releaseTailer(processId: number): void {
  const entry = registry.get(processId);
  if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) {
    entry.tailer.close();
    registry.delete(processId);
    if (registry.size === 0) stopPolling();
  }
}

export function getAllActive(): { processId: number; processName: string }[] {
  const result: { processId: number; processName: string }[] = [];
  for (const [id, entry] of registry) {
    result.push({ processId: id, processName: entry.name });
  }
  return result;
}

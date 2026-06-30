import { useSyncExternalStore } from 'react';

let tick = 0;
const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (interval === null) {
    interval = setInterval(() => {
      tick++;
      for (const fn of listeners) fn();
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  };
}

function getSnapshot(): number {
  return tick;
}

export function useSecondTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

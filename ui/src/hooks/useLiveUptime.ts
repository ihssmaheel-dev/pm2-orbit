import { useEffect, useRef } from 'react';
import { useSecondTick } from '@/lib/ticker';
import type { ProcessSnapshot } from '@/types/pm2';

export function useLiveUptime(process: ProcessSnapshot | undefined): number {
  const startedAtRef = useRef<number>(0);
  const prevUptimeRef = useRef<number>(0);

  useSecondTick();

  useEffect(() => {
    if (process && process.status === 'online' && process.uptime > 0) {
      const prev = prevUptimeRef.current;
      const now = Date.now();
      if (process.uptime < prev - 1000 || process.uptime > prev + 1000) {
        startedAtRef.current = now - process.uptime;
      }
      prevUptimeRef.current = process.uptime;
    }
  }, [process?.uptime, process?.status]);

  if (!process || process.status !== 'online') {
    return process?.uptime ?? 0;
  }

  if (startedAtRef.current === 0) {
    return process.uptime;
  }

  return Date.now() - startedAtRef.current;
}

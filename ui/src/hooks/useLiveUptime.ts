import { useEffect, useRef, useState } from 'react';
import type { ProcessSnapshot } from '@/types/pm2';

export function useLiveUptime(process: ProcessSnapshot | undefined): number {
  const startedAtRef = useRef<number>(0);
  const prevUptimeRef = useRef<number>(0);
  const [, setTick] = useState(0);

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

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!process || process.status !== 'online') {
    return process?.uptime ?? 0;
  }

  return Date.now() - startedAtRef.current;
}

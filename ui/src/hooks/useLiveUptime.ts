import { useEffect, useRef, useState } from 'react';
import type { ProcessSnapshot } from '@/types/pm2';

export function useLiveUptime(process: ProcessSnapshot | undefined): number {
  const startedAtRef = useRef<number>(0);
  const [, setTick] = useState(0);

  if (process && process.status === 'online' && process.uptime > 0) {
    startedAtRef.current = Date.now() - process.uptime;
  }

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!process || process.status !== 'online') {
    return process?.uptime ?? 0;
  }

  return Date.now() - startedAtRef.current;
}

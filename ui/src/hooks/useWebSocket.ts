import { useEffect, useRef, useState } from 'react';
import { WSClient } from '@/lib/ws';
import { useProcessStore } from '@/store/processes';
import { useLogsStore } from '@/store/logs';
import { useSystemStore } from '@/store/system';
import type { Tick } from '@/types/api';

type WSStatus = 'connecting' | 'connected' | 'disconnected';

export function useWebSocket() {
  const clientRef = useRef<WSClient | null>(null);
  const [status, setStatus] = useState<WSStatus>('connecting');
  const lastTickRef = useRef<number>(0);
  const lastFullSeqRef = useRef<number>(0);

  const applyDelta = useProcessStore((s) => s.applyDelta);
  const setAll = useProcessStore((s) => s.setAll);
  const updateSystem = useSystemStore((s) => s.update);
  const clearLogsRef = useRef(useLogsStore.getState().clearLogs);
  clearLogsRef.current = useLogsStore((s) => s.clearLogs);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    const client = new WSClient(url);
    clientRef.current = client;

    const unsubTick = client.subscribe((tick: Tick) => {
      lastTickRef.current = tick.ts;

      if (tick.full && tick.fullSeq !== undefined) {
        if (tick.fullSeq !== lastFullSeqRef.current) {
          lastFullSeqRef.current = tick.fullSeq;
          setAll(tick.full);
        }
      }

      if (tick.events.length > 0) {
        for (const event of tick.events) {
          if (event.type === 'remove') {
            clearLogsRef.current(event.process.id);
          }
        }
        applyDelta(tick.events);
      }

      updateSystem(tick.system);
    });

    const unsubStatus = client.onStatus(setStatus);

    client.connect();

    return () => {
      unsubTick();
      unsubStatus();
      client.disconnect();
    };
  }, [applyDelta, setAll, updateSystem]);

  return { status, lastTick: lastTickRef.current };
}

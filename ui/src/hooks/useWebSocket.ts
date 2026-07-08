import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { WSClient } from '@/lib/ws';
import { useProcessStore } from '@/store/processes';
import { useLogsStore } from '@/store/logs';
import { useSystemStore } from '@/store/system';
import { useAlertsStore } from '@/store/alerts';
import { useTagsStore } from '@/store/tags';
import { useNotesStore } from '@/store/notes';
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
  const addAlertEvent = useAlertsStore((s) => s.addEvent);
  const fetchAllTags = useTagsStore((s) => s.fetchAll);
  const applyAssignmentsRef = useRef(useTagsStore.getState().applyAssignmentsToProcesses);
  applyAssignmentsRef.current = useTagsStore((s) => s.applyAssignmentsToProcesses);
  const fetchNotesRef = useRef(useNotesStore.getState().fetchNotes);
  fetchNotesRef.current = useNotesStore.getState().fetchNotes;
  const applyNotesRef = useRef(useNotesStore.getState().applyNotesToProcesses);
  applyNotesRef.current = useNotesStore.getState().applyNotesToProcesses;
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchAllTags();
    fetchNotesRef.current();
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws`;

    const client = new WSClient(url);
    clientRef.current = client;

    const unsubTick = client.subscribe((tick: Tick) => {
      lastTickRef.current = tick.ts;

      if (tick.type === 'reconnect') {
        toast.success('PM2 daemon reconnected');
        return;
      }

      if (tick.full && tick.fullSeq !== undefined) {
        if (tick.fullSeq !== lastFullSeqRef.current) {
          lastFullSeqRef.current = tick.fullSeq;
          setAll(tick.full);
          // Re-apply stored tag assignments and notes to new snapshots (no API call)
          applyAssignmentsRef.current();
          applyNotesRef.current();
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

      if (tick.alerts && tick.alerts.length > 0) {
        for (const alertEvent of tick.alerts) {
          addAlertEvent(alertEvent);
          toast.warning(alertEvent.message, {
            description: `${alertEvent.severity.toUpperCase()} — ${alertEvent.processName}`,
          });
        }
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

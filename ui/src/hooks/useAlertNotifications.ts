import { useEffect, useRef } from 'react';
import { useAlertsStore } from '@/store/alerts';
import { requestNotificationPermission, sendBrowserNotification } from '@/lib/notify';

export function useAlertNotifications() {
  const history = useAlertsStore((s) => s.history);
  const lastNotifiedTsRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (history.length === 0) return;

    const latest = history[0];

    // Skip first load — don't notify for historical alerts
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastNotifiedTsRef.current = latest.ts;
      return;
    }

    // Only notify for genuinely new alerts
    if (latest.ts > lastNotifiedTsRef.current) {
      lastNotifiedTsRef.current = latest.ts;
      sendBrowserNotification(
        'PM2 Orbit Alert',
        latest.message,
      );
    }
  }, [history]);
}

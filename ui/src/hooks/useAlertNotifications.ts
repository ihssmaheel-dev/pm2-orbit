import { useEffect } from 'react';
import { useAlertsStore } from '@/store/alerts';
import { requestNotificationPermission, sendBrowserNotification } from '@/lib/notify';

export function useAlertNotifications() {
  const history = useAlertsStore((s) => s.history);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (history.length === 0) return;

    const latest = history[0];
    sendBrowserNotification(
      'PM2 Orbit Alert',
      latest.message,
    );
  }, [history.length]);
}

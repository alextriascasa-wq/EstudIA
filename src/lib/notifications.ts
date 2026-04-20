/**
 * Browser Notification helpers for timer completion.
 */

/** Check if the Notification API is available in this browser. */
export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined';
}

/** Current permission state. */
export function notifPermission(): NotificationPermission {
  if (!notificationsSupported()) return 'denied';
  return Notification.permission;
}

/** Request notification permission. Returns true if granted. */
export async function requestNotifPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

/** Send a browser notification for timer events. */
export function sendTimerNotification(title: string, body: string): void {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'studyflow-timer',
      renotify: true,
    } as any);
  } catch {
    // Notification constructor can throw in some contexts (e.g. SW scope).
  }
}

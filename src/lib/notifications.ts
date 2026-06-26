import type { WeatherSnapshot } from '../weather/types';

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function getNotifPermission(): NotifPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as NotifPermission;
}

/** Returns true if this looks like an iOS device (to show the "add to home screen" hint). */
export function isIos(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(navigator as Navigator & { standalone?: boolean }).standalone
  );
}

/** Returns true if the app is running as an installed PWA (standalone). */
export function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export async function requestPermission(): Promise<NotifPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  const result = await Notification.requestPermission();
  return result as NotifPermission;
}

export function showNotification(title: string, body: string, tag = 'weather') {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  navigator.serviceWorker.ready
    .then((reg) => {
      void reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
      } as NotificationOptions);
    })
    .catch(() => {
      // Fallback to basic Notification
      new Notification(title, { body, icon: '/icons/icon-192.png', tag });
    });
}

/** Analyze a snapshot and show relevant alerts if permission is granted. */
export function triggerWeatherAlerts(snapshot: WeatherSnapshot, locationName: string, t: (key: string, vals?: Record<string, string | number>) => string) {
  if (Notification.permission !== 'granted') return;

  const c = snapshot.fusion.current;
  const precipProb = c.precipitationProbability?.value ?? 0;
  const uv = c.uvIndex?.value ?? 0;

  if (precipProb >= 60) {
    showNotification(
      t('notifications.rainAlert', { location: locationName }),
      '',
      'rain-alert',
    );
  } else if (uv >= 8) {
    showNotification(
      t('notifications.uvAlert', { location: locationName }),
      '',
      'uv-alert',
    );
  }
}

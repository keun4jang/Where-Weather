import type { WeatherSnapshot } from '../weather/types';

const SCHEDULED_IDS = [901, 1201, 1501, 1801];
const SCHEDULE_HOURS = [9, 12, 15, 18];

/** True when running inside a Capacitor native app (Android/iOS). */
async function isNative(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Schedule daily weather notifications at 9:00, 12:00, 15:00, 18:00.
 * Uses @capacitor/local-notifications on native; Web Notification API elsewhere.
 * Call this once after the user grants notification permission and weather has loaded.
 */
export async function scheduleWeatherAlerts(snapshot?: WeatherSnapshot): Promise<void> {
  if (await isNative()) {
    await scheduleNative(snapshot);
  } else {
    await scheduleWeb(snapshot);
  }
}

// ─── Native (Capacitor) ──────────────────────────────────────────────────────

async function scheduleNative(snapshot?: WeatherSnapshot): Promise<void> {
  const { LocalNotifications } = await import('@capacitor/local-notifications');

  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') {
    const { display: result } = await LocalNotifications.requestPermissions();
    if (result !== 'granted') return;
  }

  // Cancel previous schedules so we don't accumulate duplicates
  const { notifications: pending } = await LocalNotifications.getPending();
  const ours = pending.filter((n) => SCHEDULED_IDS.includes(n.id));
  if (ours.length > 0) await LocalNotifications.cancel({ notifications: ours });

  const body = snapshot ? buildBody(snapshot) : '날씨를 확인해보세요 🌤';

  await LocalNotifications.schedule({
    notifications: SCHEDULE_HOURS.map((hour, i) => ({
      id: SCHEDULED_IDS[i],
      title: 'Where Weather 🌦️',
      body,
      schedule: { on: { hour, minute: 0 }, repeats: true, allowWhileIdle: true },
      sound: undefined,
      smallIcon: 'ic_launcher',
      channelId: 'weather-daily',
    })),
  });
}

// ─── Web fallback (today only, no true scheduling API in web) ────────────────

async function scheduleWeb(snapshot?: WeatherSnapshot): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const body = snapshot ? buildBody(snapshot) : '날씨를 확인해보세요 🌤';
  const now = new Date();

  for (const hour of SCHEDULE_HOURS) {
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1); // already passed → tomorrow

    const delay = target.getTime() - now.getTime();
    setTimeout(() => {
      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready
          .then((reg) =>
            reg.showNotification('Where Weather 🌦️', {
              body,
              icon: '/icons/icon-192.png',
              tag: `daily-${hour}`,
            } as NotificationOptions),
          )
          .catch(() => {});
      }
    }, delay);
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildBody(snapshot: WeatherSnapshot): string {
  const c = snapshot.fusion.current;
  const temp = Math.round(c.temperatureC.value);
  const prob = Math.round(c.precipitationProbability?.value ?? 0);
  const loc = snapshot.location.name ?? '';
  const umbrella = prob >= 50 ? ' ☂️ 우산 챙기세요!' : '';
  return `${loc} ${temp}°${umbrella}`;
}

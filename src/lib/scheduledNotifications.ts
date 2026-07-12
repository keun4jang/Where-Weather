import type { WeatherSnapshot } from '../weather/types';

const SCHEDULED_IDS = [600, 901, 1201, 1501, 1801];
const SCHEDULE_HOURS = [6, 9, 12, 15, 18];

const NOTIF_ENABLED_KEY = 'notifEnabled';

export function getNotifEnabled(): boolean {
  try { return localStorage.getItem(NOTIF_ENABLED_KEY) !== 'false'; } catch { return true; }
}

export function setNotifEnabled(enabled: boolean): void {
  try { localStorage.setItem(NOTIF_ENABLED_KEY, enabled ? 'true' : 'false'); } catch { /* */ }
}

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
  if (!getNotifEnabled()) return;
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

  await LocalNotifications.schedule({
    notifications: SCHEDULE_HOURS.map((hour, i) => ({
      id: SCHEDULED_IDS[i],
      title: 'Where Weather 🌦️',
      body: hour === 6
        ? (snapshot ? buildMorningBody(snapshot) : '☀️ 좋은 아침! 오늘 날씨를 확인해보세요.')
        : (snapshot ? buildBody(snapshot) : '날씨를 확인해보세요 🌤'),
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

  const now = new Date();

  for (const hour of SCHEDULE_HOURS) {
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    const body = hour === 6
      ? (snapshot ? buildMorningBody(snapshot) : '☀️ 좋은 아침! 오늘 날씨를 확인해보세요.')
      : (snapshot ? buildBody(snapshot) : '날씨를 확인해보세요 🌤');
    const delay = target.getTime() - now.getTime();
    setTimeout(() => {
      if (Notification.permission === 'granted' && getNotifEnabled()) {
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

function buildMorningBody(snapshot: WeatherSnapshot): string {
  const c = snapshot.fusion.current;
  const temp = Math.round(c.temperatureC.value);
  const prob = Math.round(c.precipitationProbability?.value ?? 0);
  const uv = Math.round(c.uvIndex?.value ?? 0);
  const loc = snapshot.location.name ?? '';
  const parts: string[] = [`☀️ 좋은 아침! ${loc} ${temp}°`];
  if (prob >= 50) parts.push('☂️ 우산 필요');
  if (uv >= 7) parts.push('🧴 자외선 강함');
  return parts.join(' · ');
}

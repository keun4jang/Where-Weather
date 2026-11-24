import type { WeatherSnapshot } from '../weather/types';

/** IDs used by the old LocalNotifications repeating schedule (stale text). Cancelled on start. */
const LEGACY_IDS = [600, 901, 1201, 1501, 1801];
const SCHEDULE_HOURS = [6, 9, 12, 15, 18];

const NOTIF_ENABLED_KEY = 'notifEnabled';

export function getNotifEnabled(): boolean {
  try { return localStorage.getItem(NOTIF_ENABLED_KEY) !== 'false'; } catch { return true; }
}

export function setNotifEnabled(enabled: boolean): void {
  try { localStorage.setItem(NOTIF_ENABLED_KEY, enabled ? 'true' : 'false'); } catch { /* */ }
  void scheduleWeatherAlerts();
}

interface DailyPlugin {
  configureDaily(opts: { enabled: boolean }): Promise<void>;
}

async function nativeDailyPlugin(): Promise<DailyPlugin | null> {
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    return registerPlugin<DailyPlugin>('RainAlert');
  } catch {
    return null;
  }
}

/**
 * Daily weather notifications at 06:00 / 09:00 / 12:00 / 15:00 / 18:00.
 *
 * Native: the Android DailyWeatherWorker fetches weather AT SEND TIME (location comes
 * from RainAlert.configure). Web: timers only fire while the page is open; text is
 * built from the newest snapshot when the timer fires, not when it was scheduled.
 *
 * Safe to call repeatedly (every weather load).
 */
export async function scheduleWeatherAlerts(snapshot?: WeatherSnapshot): Promise<void> {
  if (snapshot) latestSnapshot = snapshot;
  const plugin = await nativeDailyPlugin();
  if (plugin) {
    await cancelLegacyNative();
    await plugin.configureDaily({ enabled: getNotifEnabled() }).catch(() => {});
    return;
  }
  scheduleWeb();
}

// ─── Native ──────────────────────────────────────────────────────────────────

let legacyCancelled = false;

async function cancelLegacyNative(): Promise<void> {
  if (legacyCancelled) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      const { display: result } = await LocalNotifications.requestPermissions();
      if (result !== 'granted') return;
    }
    await LocalNotifications.cancel({ notifications: LEGACY_IDS.map((id) => ({ id })) });
    legacyCancelled = true;
  } catch {
    /* plugin unavailable */
  }
}

// ─── Web fallback (page must be open) ────────────────────────────────────────

let latestSnapshot: WeatherSnapshot | undefined;
let webTimers: ReturnType<typeof setTimeout>[] = [];

function scheduleWeb(): void {
  // Clear previous timers — this runs on every weather refresh and used to pile up duplicates.
  webTimers.forEach(clearTimeout);
  webTimers = [];
  if (!getNotifEnabled()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const now = new Date();
  for (const hour of SCHEDULE_HOURS) {
    const target = new Date(now);
    target.setHours(hour, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    webTimers.push(
      setTimeout(() => {
        if (Notification.permission !== 'granted' || !getNotifEnabled()) return;
        const body = buildNotificationBody(hour, latestSnapshot);
        navigator.serviceWorker.ready
          .then((reg) =>
            reg.showNotification('Where Weather 🌦️', {
              body,
              icon: '/icons/icon-192.png',
              tag: 'daily-weather',
            } as NotificationOptions),
          )
          .catch(() => {});
      }, target.getTime() - now.getTime()),
    );
  }
}

// ─── Text (kept in sync with DailyWeatherWorker.buildBody) ───────────────────

export function buildNotificationBody(hour: number, snapshot?: WeatherSnapshot): string {
  if (!snapshot) return hour === 6 ? '☀️ 좋은 아침! 오늘 날씨를 확인해보세요.' : '날씨를 확인해보세요 🌤';
  const c = snapshot.fusion.current;
  const temp = Math.round(c.temperatureC.value);
  const prob = Math.round(c.precipitationProbability?.value ?? 0);
  const loc = snapshot.location.name ?? '';
  if (hour === 6) {
    const uv = Math.round(c.uvIndex?.value ?? 0);
    const parts: string[] = [`☀️ 좋은 아침! ${loc} ${temp}°`.replace(/\s+/g, ' ')];
    if (prob >= 50) parts.push('☂️ 우산 필요');
    if (uv >= 7) parts.push('🧴 자외선 강함');
    return parts.join(' · ');
  }
  const umbrella = prob >= 50 ? ' ☂️ 우산 챙기세요!' : '';
  return `${loc} ${temp}°${umbrella}`.trim();
}

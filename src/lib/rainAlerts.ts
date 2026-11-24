import type { TFunction } from 'i18next';
import type { NamedLocation } from '../weather/types';
import { fetchDailyForecast, type DailyForecast } from '../weather/openMeteoDailyClient';
import { localIsoDate, planRainAlerts, weekSignature } from '../weather/rainAlert';
import { getCache, setCache } from './cache';
import { showNotification } from './notifications';

/**
 * Rain alerts ("tomorrow / later this week it rains → no scooter").
 *
 * - Android app (Capacitor): hands location + localized templates to the native
 *   RainAlertWorker, which checks the forecast every ~3h even when the app is closed.
 * - Web/PWA: there is no backend, so we can only check while the app is open.
 */

const ENABLED_KEY = 'rainAlertEnabled';
const THRESHOLD_KEY = 'rainProbThreshold';
const LOCATION_KEY = 'rainAlertLocation';
const WEB_LAST_TOMORROW = 'rainAlertLastTomorrow';
const WEB_LAST_WEEK = 'rainAlertLastWeek';
const TTL_DAILY = 30 * 60 * 1000; // same key/TTL as MonthlyForecastCard

interface RainAlertPlugin {
  configure(opts: {
    enabled: boolean;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    rainProbThreshold?: number;
    strings?: Record<string, string>;
  }): Promise<void>;
  sendTestNotification(): Promise<void>;
  notificationStatus(): Promise<{ enabled: boolean }>;
  openNotificationSettings(): Promise<void>;
  batteryStatus(): Promise<{ ignoring: boolean }>;
  requestBatteryExemption(): Promise<void>;
}

export function getRainAlertEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) !== 'false'; } catch { return true; }
}

/** Rain sensitivity: daily max precipitation probability (%) that counts as rain. */
export const RAIN_THRESHOLD_OPTIONS = [40, 60, 80] as const;

export function getRainThreshold(): number {
  try {
    const v = Number(localStorage.getItem(THRESHOLD_KEY));
    return (RAIN_THRESHOLD_OPTIONS as readonly number[]).includes(v) ? v : 60;
  } catch { return 60; }
}

export async function setRainThreshold(value: number, t: TFunction): Promise<void> {
  try { localStorage.setItem(THRESHOLD_KEY, String(value)); } catch { /* */ }
  await syncRainAlerts(t);
}

function readLocation(): NamedLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? (JSON.parse(raw) as NamedLocation) : null;
  } catch { return null; }
}

function locationLabel(loc: NamedLocation): string {
  return loc.name ?? '';
}

async function nativePlugin(): Promise<RainAlertPlugin | null> {
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    return registerPlugin<RainAlertPlugin>('RainAlert');
  } catch {
    return null;
  }
}

export async function isNativeRainAlerts(): Promise<boolean> {
  return (await nativePlugin()) !== null;
}

/** Android only: null on web. */
export async function getBatteryExempt(): Promise<boolean | null> {
  const plugin = await nativePlugin();
  if (!plugin) return null;
  try { return (await plugin.batteryStatus()).ignoring; } catch { return null; }
}

export async function requestBatteryExemption(): Promise<void> {
  const plugin = await nativePlugin();
  if (plugin) await plugin.requestBatteryExemption().catch(() => {});
}

/** Android: OS-level notification permission for the app. null on web. */
export async function getNativeNotificationsEnabled(): Promise<boolean | null> {
  const plugin = await nativePlugin();
  if (!plugin) return null;
  try { return (await plugin.notificationStatus()).enabled; } catch { return null; }
}

export async function openNativeNotificationSettings(): Promise<void> {
  const plugin = await nativePlugin();
  if (plugin) await plugin.openNotificationSettings().catch(() => {});
}

/**
 * Sends a test notification now. Android: native worker fetches current weather
 * and posts it. Web: shows a notification if permission is granted.
 * Returns false when it could not even be attempted.
 */
export async function sendTestNotification(t: TFunction): Promise<boolean> {
  const plugin = await nativePlugin();
  if (plugin) {
    if (!(await ensureNativePermission())) return false;
    await syncRainAlerts(t); // make sure the native side has the current location
    await plugin.sendTestNotification();
    return true;
  }
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  showNotification('Where Weather 🔔', t('settingsScreen.testBody'), 'test');
  return true;
}

/** Native notifications use single-brace placeholders filled in Kotlin. */
function nativeStrings(t: TFunction): Record<string, string> {
  const ph = { location: '{location}', prob: '{prob}', mm: '{mm}', days: '{days}' };
  return {
    tomorrowTitle: t('rainAlert.tomorrowTitle', ph),
    tomorrowBody: t('rainAlert.tomorrowBody', ph),
    weekTitle: t('rainAlert.weekTitle', ph),
    weekBody: t('rainAlert.weekBody', ph),
  };
}

async function ensureNativePermission(): Promise<boolean> {
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return true;
    const { display: result } = await LocalNotifications.requestPermissions();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Push the current settings to wherever the check runs.
 * Call when the primary location or language changes, and when the toggle changes.
 */
export async function syncRainAlerts(t: TFunction, location?: NamedLocation | null): Promise<void> {
  if (location) {
    try { localStorage.setItem(LOCATION_KEY, JSON.stringify(location)); } catch { /* */ }
  }
  const loc = location ?? readLocation();
  const enabled = getRainAlertEnabled();

  const plugin = await nativePlugin();
  if (plugin) {
    if (enabled && !(await ensureNativePermission())) return;
    await plugin.configure({
      enabled,
      latitude: loc?.latitude,
      longitude: loc?.longitude,
      locationName: loc ? locationLabel(loc) : undefined,
      rainProbThreshold: getRainThreshold(),
      strings: nativeStrings(t),
    });
    return;
  }

  if (enabled && loc) await checkWeb(t, loc);
}

export async function setRainAlertEnabled(enabled: boolean, t: TFunction): Promise<void> {
  try { localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false'); } catch { /* */ }
  await syncRainAlerts(t);
}

// ─── Web fallback: only while the app is open ────────────────────────────────

async function checkWeb(t: TFunction, loc: NamedLocation): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const key = `daily:${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)}`;
  let days = getCache<DailyForecast[]>(key);
  if (!days) {
    try {
      days = await fetchDailyForecast(loc);
      setCache(key, days, TTL_DAILY);
    } catch {
      return;
    }
  }

  const today = localIsoDate(new Date());
  const plan = planRainAlerts(days, today, getRainThreshold());
  const location = locationLabel(loc);

  if (plan.tomorrow && localStorage.getItem(WEB_LAST_TOMORROW) !== plan.tomorrow.date) {
    showNotification(
      t('rainAlert.tomorrowTitle', { location }),
      t('rainAlert.tomorrowBody', {
        location,
        prob: Math.round(plan.tomorrow.precipitationProbability ?? 0),
        mm: (plan.tomorrow.precipitationMm ?? 0).toFixed(1),
      }),
      'rain-tomorrow',
    );
    localStorage.setItem(WEB_LAST_TOMORROW, plan.tomorrow.date);
  }

  const sig = weekSignature(plan.week);
  const lastWeek = localStorage.getItem(WEB_LAST_WEEK) ?? '';
  // Stored as "<notifiedDay>|<signature>": at most once a day, and only when the rainy days change.
  if (plan.week.length > 0 && !lastWeek.endsWith(`|${sig}`) && !lastWeek.startsWith(`${today}|`)) {
    const days = plan.week
      .map((d) =>
        new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, {
          month: 'numeric',
          day: 'numeric',
          weekday: 'short',
        }),
      )
      .join(', ');
    showNotification(
      t('rainAlert.weekTitle', { location, days }),
      t('rainAlert.weekBody', { location, days }),
      'rain-week',
    );
    localStorage.setItem(WEB_LAST_WEEK, `${today}|${sig}`);
  }
}

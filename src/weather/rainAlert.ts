import type { DailyForecast } from './openMeteoDailyClient';

/**
 * Rain alert rules ("can I ride the scooter?").
 *
 * KEEP IN SYNC with android/.../rain/RainAlertWorker.kt — the native worker
 * applies the same thresholds when the app is closed.
 *
 * A day counts as rainy when the daily max precipitation probability is
 * >= RAIN_PROB_THRESHOLD, or the forecast daily total is >= RAIN_MM_THRESHOLD
 * (precipitation_sum includes snow water-equivalent, so snow counts too).
 */
export const RAIN_PROB_THRESHOLD = 60;
export const RAIN_MM_THRESHOLD = 1;
/** "Next week" = the 7 days after tomorrow's alert, i.e. today+2 … today+7. */
export const WEEK_DAYS_AHEAD = 7;

export function isRainyDay(day: DailyForecast): boolean {
  const prob = day.precipitationProbability ?? 0;
  const mm = day.precipitationMm ?? 0;
  return prob >= RAIN_PROB_THRESHOLD || mm >= RAIN_MM_THRESHOLD;
}

export interface RainPlan {
  /** Tomorrow's forecast, if tomorrow is rainy. */
  tomorrow?: DailyForecast;
  /** Rainy days from today+2 through today+WEEK_DAYS_AHEAD. */
  week: DailyForecast[];
}

/**
 * Decide which rain alerts apply.
 * @param days  daily forecast (any order-preserving list containing today)
 * @param todayIso  local date of "today" for the location, YYYY-MM-DD
 */
export function planRainAlerts(days: DailyForecast[], todayIso: string): RainPlan {
  const todayIdx = days.findIndex((d) => d.date === todayIso);
  if (todayIdx < 0) return { week: [] };

  const tomorrowDay = days[todayIdx + 1];
  const week = days
    .slice(todayIdx + 2, todayIdx + 1 + WEEK_DAYS_AHEAD)
    .filter(isRainyDay);

  return {
    tomorrow: tomorrowDay && isRainyDay(tomorrowDay) ? tomorrowDay : undefined,
    week,
  };
}

/** Stable key used to avoid re-sending the same weekly alert. */
export function weekSignature(week: DailyForecast[]): string {
  return week.map((d) => d.date).join(',');
}

/** Local YYYY-MM-DD for a Date (not UTC — toISOString() would shift days in KST mornings). */
export function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

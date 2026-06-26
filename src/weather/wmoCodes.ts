/**
 * WMO weather interpretation codes (WW).
 * Maps each code to an i18n key and an emoji icon (day/night aware where useful).
 */

export interface WmoDescriptor {
  /** i18n key under `wmo.*` */
  key: string;
  icon: string;
  /** Whether this code implies precipitation. */
  precipitation: boolean;
}

const TABLE: Record<number, WmoDescriptor> = {
  0: { key: 'wmo.clear', icon: '☀️', precipitation: false },
  1: { key: 'wmo.mainlyClear', icon: '🌤️', precipitation: false },
  2: { key: 'wmo.partlyCloudy', icon: '⛅', precipitation: false },
  3: { key: 'wmo.overcast', icon: '☁️', precipitation: false },
  45: { key: 'wmo.fog', icon: '🌫️', precipitation: false },
  48: { key: 'wmo.rimeFog', icon: '🌫️', precipitation: false },
  51: { key: 'wmo.drizzleLight', icon: '🌦️', precipitation: true },
  53: { key: 'wmo.drizzleModerate', icon: '🌦️', precipitation: true },
  55: { key: 'wmo.drizzleDense', icon: '🌧️', precipitation: true },
  56: { key: 'wmo.freezingDrizzleLight', icon: '🌧️', precipitation: true },
  57: { key: 'wmo.freezingDrizzleDense', icon: '🌧️', precipitation: true },
  61: { key: 'wmo.rainSlight', icon: '🌦️', precipitation: true },
  63: { key: 'wmo.rainModerate', icon: '🌧️', precipitation: true },
  65: { key: 'wmo.rainHeavy', icon: '🌧️', precipitation: true },
  66: { key: 'wmo.freezingRainLight', icon: '🌧️', precipitation: true },
  67: { key: 'wmo.freezingRainHeavy', icon: '🌧️', precipitation: true },
  71: { key: 'wmo.snowSlight', icon: '🌨️', precipitation: true },
  73: { key: 'wmo.snowModerate', icon: '❄️', precipitation: true },
  75: { key: 'wmo.snowHeavy', icon: '❄️', precipitation: true },
  77: { key: 'wmo.snowGrains', icon: '🌨️', precipitation: true },
  80: { key: 'wmo.rainShowersSlight', icon: '🌦️', precipitation: true },
  81: { key: 'wmo.rainShowersModerate', icon: '🌧️', precipitation: true },
  82: { key: 'wmo.rainShowersViolent', icon: '⛈️', precipitation: true },
  85: { key: 'wmo.snowShowersSlight', icon: '🌨️', precipitation: true },
  86: { key: 'wmo.snowShowersHeavy', icon: '❄️', precipitation: true },
  95: { key: 'wmo.thunderstorm', icon: '⛈️', precipitation: true },
  96: { key: 'wmo.thunderstormHailSlight', icon: '⛈️', precipitation: true },
  99: { key: 'wmo.thunderstormHailHeavy', icon: '⛈️', precipitation: true },
};

const UNKNOWN: WmoDescriptor = { key: 'wmo.unknown', icon: '❓', precipitation: false };

export function describeWmo(code: number | undefined): WmoDescriptor {
  if (code === undefined || code === null) return UNKNOWN;
  return TABLE[code] ?? UNKNOWN;
}

export function isPrecipitationCode(code: number | undefined): boolean {
  return describeWmo(code).precipitation;
}

import type { WeatherSnapshot } from '../weather/types';
interface WidgetData {
  location: string;
  tempC: number;
  feelsC?: number;
  condition: string;
  umbrella: string;
  clothing: string;
  updatedAt: number;
  noData?: boolean;
}

function wmoLabel(code: number | undefined): string {
  if (code === undefined) return '';
  // Minimal inline label map for widget (avoids importing full i18n in SW context)
  const map: Record<number, string> = {
    0: '☀️ 맑음', 1: '🌤 대체로 맑음', 2: '⛅ 구름 조금', 3: '☁️ 흐림',
    45: '🌫 안개', 48: '🌫 안개',
    51: '🌦 이슬비', 53: '🌦 이슬비', 55: '🌦 이슬비',
    61: '🌧 비', 63: '🌧 비', 65: '🌧 강한 비',
    71: '🌨 눈', 73: '🌨 눈', 75: '🌨 강한 눈',
    80: '🌦 소나기', 81: '🌦 소나기', 82: '⛈ 강한 소나기',
    95: '⛈ 천둥번개', 96: '⛈ 우박', 99: '⛈ 우박',
  };
  return map[code] ?? '🌡 날씨';
}

function umbrellaEmoji(precipProb?: number): string {
  if (precipProb === undefined) return '';
  if (precipProb >= 60) return '☂️ 우산 필요';
  if (precipProb >= 30) return '🌂 우산 챙겨요';
  return '✅ 우산 불필요';
}

function clothingEmoji(feelsC?: number): string {
  if (feelsC === undefined) return '';
  if (feelsC < 0) return '🧥 두껍게';
  if (feelsC < 10) return '🧥 코트';
  if (feelsC < 17) return '🧣 겉옷';
  if (feelsC < 23) return '👕 티셔츠';
  return '🩳 얇게';
}

export function buildWidgetData(snapshot: WeatherSnapshot): WidgetData {
  const loc = snapshot.location;
  const location = [loc.name, loc.country].filter(Boolean).join(', ') || '내 위치';
  const current = snapshot.fusion.current;

  return {
    location,
    tempC: current.temperatureC.value,
    feelsC: current.apparentTemperatureC?.value,
    condition: wmoLabel(current.weatherCode),
    umbrella: umbrellaEmoji(current.precipitationProbability?.value),
    clothing: clothingEmoji(current.apparentTemperatureC?.value),
    updatedAt: snapshot.generatedAt,
  };
}

export async function pushWidgetData(snapshot: WeatherSnapshot): Promise<void> {
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg?.active) return;

  const data = buildWidgetData(snapshot);
  reg.active.postMessage({ type: 'WIDGET_DATA_UPDATE', payload: JSON.stringify(data) });

  // Register periodic background sync if available
  try {
    const ps = (reg as ServiceWorkerRegistration & { periodicSync?: { register(tag: string, opts: object): Promise<void> } }).periodicSync;
    if (ps) {
      await ps.register('weather-widget-sync', { minInterval: 60 * 60 * 1000 });
    }
  } catch {
    // not supported — fine
  }
}

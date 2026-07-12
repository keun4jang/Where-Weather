import { ProviderFetchError } from '../lib/errors';
import { safeNumber } from './normalize';
import type { Coordinates } from './types';

export interface DailyForecast {
  date: string; // YYYY-MM-DD
  tempMaxC: number;
  tempMinC: number;
  precipitationMm?: number;
  precipitationProbability?: number;
  weatherCode?: number;
  uvIndexMax?: number;
}

interface DailyResponse {
  daily?: {
    time: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
    uv_index_max?: number[];
  };
}

export async function fetchDailyForecast(coords: Coordinates): Promise<DailyForecast[]> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(coords.latitude));
  url.searchParams.set('longitude', String(coords.longitude));
  url.searchParams.set(
    'daily',
    [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'weather_code',
      'uv_index_max',
    ].join(','),
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '16');

  let data: DailyResponse;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new ProviderFetchError('open-meteo', `HTTP ${res.status}`);
    data = (await res.json()) as DailyResponse;
  } catch (err) {
    if (err instanceof ProviderFetchError) throw err;
    throw new ProviderFetchError('open-meteo', String(err));
  }

  const d = data.daily;
  if (!d?.time) throw new ProviderFetchError('open-meteo', 'missing daily data');

  return d.time.map((date, i) => ({
    date,
    tempMaxC: d.temperature_2m_max?.[i] ?? 0,
    tempMinC: d.temperature_2m_min?.[i] ?? 0,
    precipitationMm: safeNumber(d.precipitation_sum?.[i]),
    precipitationProbability: safeNumber(d.precipitation_probability_max?.[i]),
    weatherCode: safeNumber(d.weather_code?.[i]),
    uvIndexMax: safeNumber(d.uv_index_max?.[i]),
  }));
}

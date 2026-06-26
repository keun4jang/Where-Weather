import { ProviderFetchError } from '../lib/errors';
import { buildHourly, safeNumber } from './normalize';
import type { Coordinates, NormalizedHourly, ProviderResult } from './types';

/**
 * MET Norway (Locationforecast 2.0). The public API requires a custom
 * User-Agent header which browsers are not allowed to set, so direct calls fail
 * in-browser. We route through an optional proxy (see functions/api/metno.ts).
 * If no proxy is configured, this client is disabled and the app falls back to
 * Open-Meteo only.
 */

const PROXY_URL = (import.meta.env.VITE_METNO_PROXY_URL as string | undefined) ?? '';

export function isMetNoAvailable(): boolean {
  return PROXY_URL.length > 0;
}

interface MetNoTimeStep {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature?: number;
        relative_humidity?: number;
        wind_speed?: number;
        wind_speed_of_gust?: number;
        cloud_area_fraction?: number;
        ultraviolet_index_clear_sky?: number;
      };
    };
    next_1_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number; probability_of_precipitation?: number };
    };
  };
}

interface MetNoResponse {
  properties?: { timeseries?: MetNoTimeStep[] };
}

/** MET Norway symbol_code → approximate WMO code for fusion consistency. */
function symbolToWmo(symbol?: string): number | undefined {
  if (!symbol) return undefined;
  const base = symbol.replace(/_(day|night|polartwilight)$/, '');
  const map: Record<string, number> = {
    clearsky: 0,
    fair: 1,
    partlycloudy: 2,
    cloudy: 3,
    fog: 45,
    lightrain: 61,
    rain: 63,
    heavyrain: 65,
    lightsnow: 71,
    snow: 73,
    heavysnow: 75,
    lightrainshowers: 80,
    rainshowers: 81,
    heavyrainshowers: 82,
    lightsnowshowers: 85,
    snowshowers: 86,
    rainandthunder: 95,
    heavyrainandthunder: 96,
  };
  return map[base];
}

export async function fetchMetNo(coords: Coordinates): Promise<ProviderResult> {
  if (!isMetNoAvailable()) {
    throw new ProviderFetchError('met-no', 'MET Norway proxy not configured');
  }

  const url = new URL(PROXY_URL);
  url.searchParams.set('lat', coords.latitude.toFixed(4));
  url.searchParams.set('lon', coords.longitude.toFixed(4));

  let data: MetNoResponse;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new ProviderFetchError('met-no', `HTTP ${res.status}`);
    data = (await res.json()) as MetNoResponse;
  } catch (err) {
    if (err instanceof ProviderFetchError) throw err;
    throw new ProviderFetchError('met-no', String(err));
  }

  const series = data.properties?.timeseries ?? [];
  const first = series[0];
  if (!first) throw new ProviderFetchError('met-no', 'empty timeseries');

  const instant = first.data.instant.details;
  const next = first.data.next_1_hours;

  const times: string[] = [];
  const temps: number[] = [];
  const probs: number[] = [];
  const precip: number[] = [];
  const codes: number[] = [];
  for (const step of series.slice(0, 24)) {
    times.push(step.time);
    temps.push(step.data.instant.details.air_temperature ?? NaN);
    probs.push(step.data.next_1_hours?.details?.probability_of_precipitation ?? NaN);
    precip.push(step.data.next_1_hours?.details?.precipitation_amount ?? NaN);
    codes.push(symbolToWmo(step.data.next_1_hours?.summary?.symbol_code) ?? NaN);
  }
  const hourly: NormalizedHourly[] = buildHourly(times, temps, probs, precip, codes);

  return {
    provider: 'met-no',
    fetchedAt: Date.now(),
    current: {
      time: first.time,
      temperatureC: instant.air_temperature ?? NaN,
      humidity: safeNumber(instant.relative_humidity),
      windSpeedMs: safeNumber(instant.wind_speed),
      windGustMs: safeNumber(instant.wind_speed_of_gust),
      cloudCover: safeNumber(instant.cloud_area_fraction),
      uvIndex: safeNumber(instant.ultraviolet_index_clear_sky),
      precipitationMm: safeNumber(next?.details?.precipitation_amount),
      precipitationProbability: safeNumber(next?.details?.probability_of_precipitation),
      weatherCode: symbolToWmo(next?.summary?.symbol_code),
    },
    hourly,
  };
}

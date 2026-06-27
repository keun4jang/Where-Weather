import { ProviderFetchError } from '../lib/errors';
import type { Coordinates, ProviderResult } from './types';
import { buildHourly, hourlyFrom, kmhToMs, safeNumber } from './normalize';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    precipitation?: number;
    precipitation_probability?: number;
    cloud_cover?: number;
    weather_code?: number;
    is_day?: number;
    uv_index?: number;
  };
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    weather_code?: number[];
  };
}

export async function fetchOpenMeteo(coords: Coordinates): Promise<ProviderResult> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set('latitude', String(coords.latitude));
  url.searchParams.set('longitude', String(coords.longitude));
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'wind_speed_10m',
      'wind_gusts_10m',
      'precipitation',
      'precipitation_probability',
      'cloud_cover',
      'weather_code',
      'is_day',
      'uv_index',
    ].join(','),
  );
  url.searchParams.set(
    'hourly',
    ['temperature_2m', 'precipitation_probability', 'precipitation', 'weather_code'].join(','),
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '2');

  let data: OpenMeteoResponse;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new ProviderFetchError('open-meteo', `HTTP ${res.status}`);
    data = (await res.json()) as OpenMeteoResponse;
  } catch (err) {
    if (err instanceof ProviderFetchError) throw err;
    throw new ProviderFetchError('open-meteo', String(err));
  }

  const c = data.current;
  if (!c || typeof c.temperature_2m !== 'number') {
    throw new ProviderFetchError('open-meteo', 'missing current data');
  }

  const h = data.hourly;
  const hourly = h
    ? hourlyFrom(
        buildHourly(
          h.time,
          h.temperature_2m ?? [],
          h.precipitation_probability,
          h.precipitation,
          h.weather_code,
          48, // fetch 2 days then filter to current time
        ),
        c.time,
      ).slice(0, 24)
    : [];

  return {
    provider: 'open-meteo',
    fetchedAt: Date.now(),
    current: {
      time: c.time,
      temperatureC: c.temperature_2m,
      apparentTemperatureC: safeNumber(c.apparent_temperature),
      humidity: safeNumber(c.relative_humidity_2m),
      windSpeedMs: c.wind_speed_10m !== undefined ? kmhToMs(c.wind_speed_10m) : undefined,
      windGustMs: c.wind_gusts_10m !== undefined ? kmhToMs(c.wind_gusts_10m) : undefined,
      precipitationMm: safeNumber(c.precipitation),
      precipitationProbability: safeNumber(c.precipitation_probability),
      cloudCover: safeNumber(c.cloud_cover),
      weatherCode: safeNumber(c.weather_code),
      uvIndex: safeNumber(c.uv_index),
      isDay: c.is_day === undefined ? undefined : c.is_day === 1,
    },
    hourly,
  };
}

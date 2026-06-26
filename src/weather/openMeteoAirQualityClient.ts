import { ProviderFetchError } from '../lib/errors';
import { safeNumber } from './normalize';
import type { AirQuality, Coordinates } from './types';

const AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

interface AqResponse {
  current?: {
    time: string;
    pm2_5?: number;
    pm10?: number;
    ozone?: number;
    european_aqi?: number;
    us_aqi?: number;
  };
}

export async function fetchAirQuality(coords: Coordinates): Promise<AirQuality> {
  const url = new URL(AQ_URL);
  url.searchParams.set('latitude', String(coords.latitude));
  url.searchParams.set('longitude', String(coords.longitude));
  url.searchParams.set(
    'current',
    ['pm2_5', 'pm10', 'ozone', 'european_aqi', 'us_aqi'].join(','),
  );
  url.searchParams.set('timezone', 'auto');

  let data: AqResponse;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new ProviderFetchError('open-meteo', `HTTP ${res.status}`);
    data = (await res.json()) as AqResponse;
  } catch (err) {
    if (err instanceof ProviderFetchError) throw err;
    throw new ProviderFetchError('open-meteo', String(err));
  }

  const c = data.current;
  if (!c) throw new ProviderFetchError('open-meteo', 'missing air quality data');

  return {
    time: c.time,
    pm25: safeNumber(c.pm2_5),
    pm10: safeNumber(c.pm10),
    ozone: safeNumber(c.ozone),
    europeanAqi: safeNumber(c.european_aqi),
    usAqi: safeNumber(c.us_aqi),
    fetchedAt: Date.now(),
  };
}

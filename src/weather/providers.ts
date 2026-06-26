import { getCache, setCache, getStaleCache, TTL } from '../lib/cache';
import { buildVerdicts } from './verdict';
import { fetchAirQuality } from './openMeteoAirQualityClient';
import { fetchMetNo, isMetNoAvailable } from './metNoClient';
import { fetchOpenMeteo } from './openMeteoClient';
import { fuse } from './fusion';
import type {
  AirQuality,
  Coordinates,
  NamedLocation,
  ProviderError,
  ProviderResult,
  WeatherSnapshot,
} from './types';

function cacheKey(coords: Coordinates): string {
  return `wx:${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`;
}

async function settle<T>(
  provider: ProviderResult['provider'],
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: ProviderError }> {
  try {
    return { ok: true, value: await promise };
  } catch (err) {
    return {
      ok: false,
      error: { provider, message: err instanceof Error ? err.message : String(err) },
    };
  }
}

/** Fetches all weather providers + air quality, fuses, and builds verdicts. */
export async function getWeatherSnapshot(
  location: NamedLocation,
): Promise<WeatherSnapshot> {
  const coords: Coordinates = {
    latitude: location.latitude,
    longitude: location.longitude,
  };
  const key = cacheKey(coords);

  const cached = getCache<WeatherSnapshot>(key);
  if (cached) return { ...cached, location };

  const providerPromises = [settle('open-meteo', fetchOpenMeteo(coords))];
  if (isMetNoAvailable()) {
    providerPromises.push(settle('met-no', fetchMetNo(coords)));
  }

  const aqCacheKey = `aq:${coords.latitude.toFixed(3)},${coords.longitude.toFixed(3)}`;
  let airQuality: AirQuality | undefined = getCache<AirQuality>(aqCacheKey) ?? undefined;
  const aqPromise = airQuality
    ? Promise.resolve(undefined)
    : settle('open-meteo', fetchAirQuality(coords));

  const [providerSettled, aqSettled] = await Promise.all([
    Promise.all(providerPromises),
    aqPromise,
  ]);

  const contributors: ProviderResult[] = [];
  const errors: ProviderError[] = [];
  for (const result of providerSettled) {
    if (result.ok) contributors.push(result.value);
    else errors.push(result.error);
  }

  if (aqSettled && aqSettled.ok && aqSettled.value) {
    airQuality = aqSettled.value;
    setCache(aqCacheKey, airQuality, TTL.AIR_QUALITY);
  }

  if (contributors.length === 0) {
    const stale = getStaleCache<WeatherSnapshot>(key);
    if (stale) return { ...stale, location };
    throw new Error('errors.allProvidersFailed');
  }

  const fusion = fuse(contributors, errors);
  const verdicts = buildVerdicts(fusion, airQuality);

  const snapshot: WeatherSnapshot = {
    location,
    fusion,
    airQuality,
    verdicts,
    generatedAt: Date.now(),
  };

  setCache(key, snapshot, TTL.WEATHER);
  return snapshot;
}

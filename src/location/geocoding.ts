import { getCache, setCache, TTL } from '../lib/cache';
import type { Coordinates, NamedLocation } from '../weather/types';

const SEARCH_URL = 'https://geocoding-api.open-meteo.com/v1/search';

interface GeoApiResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

/** Forward geocoding: search a place name → coordinates. */
export async function searchLocations(
  query: string,
  language = 'en',
): Promise<NamedLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(SEARCH_URL);
  url.searchParams.set('name', trimmed);
  url.searchParams.set('count', '6');
  url.searchParams.set('language', language);
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: GeoApiResult[] };
  return (data.results ?? []).map((r) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
    timezone: r.timezone,
  }));
}

/**
 * Reverse geocoding via Open-Meteo's search endpoint is not supported, so we
 * label coordinates with a best-effort name using the BigDataCloud free
 * client-side reverse geocoder. Falls back to coordinate text.
 */
export async function reverseGeocode(
  coords: Coordinates,
  language = 'en',
): Promise<NamedLocation> {
  const cacheKey = `geo:${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}:${language}`;
  const cached = getCache<NamedLocation>(cacheKey);
  if (cached) return cached;

  const fallback: NamedLocation = {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
    url.searchParams.set('latitude', String(coords.latitude));
    url.searchParams.set('longitude', String(coords.longitude));
    url.searchParams.set('localityLanguage', language);
    const res = await fetch(url.toString());
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const named: NamedLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: data.city || data.locality || undefined,
      admin1: data.principalSubdivision,
      country: data.countryName,
    };
    setCache(cacheKey, named, TTL.GEOCODE);
    return named;
  } catch {
    return fallback;
  }
}

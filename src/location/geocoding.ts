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
    // Nominatim: zoom=18 gives neighbourhood/suburb level (e.g. 개봉1동)
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(coords.latitude));
    url.searchParams.set('lon', String(coords.longitude));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('zoom', '18');
    url.searchParams.set('accept-language', language);
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'WhereWeather/1.0 (weather app)' },
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      address?: {
        neighbourhood?: string;
        suburb?: string;
        quarter?: string;
        village?: string;
        town?: string;
        city?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };
    const a = data.address ?? {};
    // neighbourhood > suburb > quarter > village > town > city (most → least specific)
    const neighbourhood = a.neighbourhood || a.suburb || a.quarter || a.village || a.town || a.city;
    const city = a.city || a.county || a.state;
    // Display: "서울특별시 개봉1동" style — state/city + neighbourhood
    const nameParts = [city, neighbourhood].filter(Boolean);
    const named: NamedLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      name: nameParts.length > 0 ? nameParts.join(' ') : undefined,
      admin1: a.state,
      country: a.country,
    };
    setCache(cacheKey, named, TTL.GEOCODE);
    return named;
  } catch {
    return fallback;
  }
}

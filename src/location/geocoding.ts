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
  const cacheKey = `geo2:${coords.latitude.toFixed(2)},${coords.longitude.toFixed(2)}:${language}`;
  const cached = getCache<NamedLocation>(cacheKey);
  if (cached) return cached;

  const fallback: NamedLocation = {
    latitude: coords.latitude,
    longitude: coords.longitude,
  };

  try {
    // zoom=18 → neighbourhood/dong level
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
        // Korean: neighbourhood=동, borough=구, city=시/도
        neighbourhood?: string;
        borough?: string;   // 구 (gu) — key field for Korean addresses
        suburb?: string;
        quarter?: string;
        city_district?: string;
        village?: string;
        town?: string;
        city?: string;
        county?: string;
        state?: string;
        country?: string;
      };
    };
    const a = data.address ?? {};

    // Most→least specific dong-level name
    const dong = a.neighbourhood || a.suburb || a.quarter;
    // Gu/district level (borough covers 구 in Korean addresses)
    const gu = a.borough || a.city_district;
    // City/province
    const city = a.city || a.county || a.state;

    // Build the most detailed name possible:
    // e.g. "구로구 개봉1동"  or  "서울특별시 구로구 개봉1동"
    let nameParts: string[];
    if (dong && gu) {
      nameParts = [gu, dong];           // 구로구 개봉1동
    } else if (dong && city) {
      nameParts = [city, dong];         // 서울특별시 개봉1동
    } else if (gu) {
      nameParts = city ? [city, gu] : [gu];
    } else {
      nameParts = [city, a.village || a.town].filter(Boolean) as string[];
    }

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

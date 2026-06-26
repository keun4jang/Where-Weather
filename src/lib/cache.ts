interface CacheEntry<T> {
  value: T;
  storedAt: number;
  ttlMs: number;
}

const PREFIX = 'ww:';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function setCache<T>(key: string, value: T, ttlMs: number): void {
  if (!isBrowser()) return;
  const entry: CacheEntry<T> = { value, storedAt: Date.now(), ttlMs };
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — caching is best-effort.
  }
}

export function getCache<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.storedAt > entry.ttlMs) {
      window.localStorage.removeItem(PREFIX + key);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}

/** Returns the cached value even if stale (used as a fallback when offline). */
export function getStaleCache<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return (JSON.parse(raw) as CacheEntry<T>).value;
  } catch {
    return null;
  }
}

export function removeCache(key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PREFIX + key);
}

export const TTL = {
  WEATHER: 5 * 60 * 1000,
  AIR_QUALITY: 30 * 60 * 1000,
  GEOCODE: 24 * 60 * 60 * 1000,
} as const;

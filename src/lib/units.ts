export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindUnit = 'ms' | 'kmh' | 'mph';

export function cToF(celsius: number): number {
  return celsius * (9 / 5) + 32;
}

export function fToC(fahrenheit: number): number {
  return (fahrenheit - 32) * (5 / 9);
}

export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  const value = unit === 'fahrenheit' ? cToF(celsius) : celsius;
  return `${Math.round(value)}°${unit === 'fahrenheit' ? 'F' : 'C'}`;
}

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

export function msToMph(ms: number): number {
  return ms * 2.236936;
}

export function convertWind(ms: number, unit: WindUnit): number {
  switch (unit) {
    case 'kmh':
      return msToKmh(ms);
    case 'mph':
      return msToMph(ms);
    default:
      return ms;
  }
}

export function formatWind(ms: number, unit: WindUnit): string {
  const value = convertWind(ms, unit);
  const suffix = unit === 'kmh' ? 'km/h' : unit === 'mph' ? 'mph' : 'm/s';
  return `${Math.round(value)} ${suffix}`;
}

export function mmToInches(mm: number): number {
  return mm / 25.4;
}

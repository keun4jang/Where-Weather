import type { NormalizedCurrent, NormalizedHourly } from './types';

/** Open-Meteo returns wind in km/h by default; convert to m/s. */
export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

export function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function buildHourly(
  times: string[],
  temps: number[],
  probs?: number[],
  precip?: number[],
  codes?: number[],
  limit = 24,
): NormalizedHourly[] {
  const result: NormalizedHourly[] = [];
  for (let i = 0; i < times.length && result.length < limit; i += 1) {
    result.push({
      time: times[i],
      temperatureC: temps[i],
      precipitationProbability: probs ? safeNumber(probs[i]) : undefined,
      precipitationMm: precip ? safeNumber(precip[i]) : undefined,
      weatherCode: codes ? safeNumber(codes[i]) : undefined,
    });
  }
  return result;
}

/** Filter hourly series to entries at or after `fromIso`. */
export function hourlyFrom(hourly: NormalizedHourly[], fromIso: string): NormalizedHourly[] {
  const from = new Date(fromIso).getTime();
  return hourly.filter((h) => new Date(h.time).getTime() >= from - 60 * 60 * 1000);
}

export type { NormalizedCurrent };

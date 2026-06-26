import type {
  FusedCurrent,
  FusedMetric,
  FusionOutput,
  NormalizedCurrent,
  ProviderError,
  ProviderResult,
} from './types';

/** Numeric keys on NormalizedCurrent that we fuse. */
type FusableKey =
  | 'temperatureC'
  | 'apparentTemperatureC'
  | 'humidity'
  | 'windSpeedMs'
  | 'windGustMs'
  | 'precipitationProbability'
  | 'precipitationMm'
  | 'uvIndex'
  | 'cloudCover';

const FUSABLE_KEYS: FusableKey[] = [
  'temperatureC',
  'apparentTemperatureC',
  'humidity',
  'windSpeedMs',
  'windGustMs',
  'precipitationProbability',
  'precipitationMm',
  'uvIndex',
  'cloudCover',
];

/** Per-key tolerance used to score agreement (in the metric's own units). */
const AGREEMENT_TOLERANCE: Record<FusableKey, number> = {
  temperatureC: 2,
  apparentTemperatureC: 3,
  humidity: 10,
  windSpeedMs: 2,
  windGustMs: 3,
  precipitationProbability: 20,
  precipitationMm: 1,
  uvIndex: 1.5,
  cloudCover: 25,
};

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Weighted median. Weights need not sum to 1. Returns the value at the point
 * where cumulative weight crosses half of the total weight.
 */
export function weightedMedian(values: number[], weights: number[]): number {
  if (values.length === 0) return NaN;
  if (values.length !== weights.length) {
    throw new Error('weightedMedian: values and weights length mismatch');
  }
  const pairs = values
    .map((value, i) => ({ value, weight: weights[i] }))
    .sort((a, b) => a.value - b.value);
  const total = pairs.reduce((sum, p) => sum + p.weight, 0);
  if (total <= 0) return median(values);
  const half = total / 2;
  let cumulative = 0;
  for (const pair of pairs) {
    cumulative += pair.weight;
    if (cumulative >= half) return pair.value;
  }
  return pairs[pairs.length - 1].value;
}

export function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function collect(
  contributors: ProviderResult[],
  key: FusableKey,
): { values: number[]; weights: number[] } {
  const values: number[] = [];
  const weights: number[] = [];
  for (const c of contributors) {
    const raw = c.current[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      values.push(raw);
      // Equal weighting today; structure allows per-provider weighting later.
      weights.push(1);
    }
  }
  return { values, weights };
}

function fuseMetric(values: number[], weights: number[]): FusedMetric | undefined {
  if (values.length === 0) return undefined;
  return {
    value: weightedMedian(values, weights),
    spread: standardDeviation(values),
    sourceCount: values.length,
  };
}

/** Pick the mode of weather codes; ties resolve to the most "severe" (highest). */
function fuseWeatherCode(contributors: ProviderResult[]): number | undefined {
  const counts = new Map<number, number>();
  for (const c of contributors) {
    const code = c.current.weatherCode;
    if (typeof code === 'number') counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  if (counts.size === 0) return undefined;
  let best: number | undefined;
  let bestCount = -1;
  for (const [code, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== undefined && code > best)) {
      best = code;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Confidence in [0,1]. Combines:
 *  - source count (more sources → higher base confidence)
 *  - agreement across sources (lower normalized spread → higher confidence)
 */
export function computeConfidence(contributors: ProviderResult[]): number {
  if (contributors.length === 0) return 0;
  if (contributors.length === 1) return 0.6;

  const agreementScores: number[] = [];
  for (const key of FUSABLE_KEYS) {
    const { values } = collect(contributors, key);
    if (values.length < 2) continue;
    const spread = standardDeviation(values);
    const tolerance = AGREEMENT_TOLERANCE[key];
    // 1 when spread is 0, decaying toward 0 as spread exceeds tolerance.
    const score = Math.max(0, 1 - spread / (tolerance * 2));
    agreementScores.push(score);
  }

  const agreement =
    agreementScores.length > 0
      ? agreementScores.reduce((a, b) => a + b, 0) / agreementScores.length
      : 0.5;

  const countBoost = Math.min(1, contributors.length / 2);
  const confidence = 0.5 * countBoost + 0.5 * agreement;
  return Math.max(0, Math.min(1, confidence));
}

/** True when at least one fusable metric disagrees beyond its tolerance. */
export function hasSourceDisagreement(contributors: ProviderResult[]): boolean {
  if (contributors.length < 2) return false;
  for (const key of FUSABLE_KEYS) {
    const { values } = collect(contributors, key);
    if (values.length < 2) continue;
    if (standardDeviation(values) > AGREEMENT_TOLERANCE[key]) return true;
  }
  return false;
}

function pickReferenceCurrent(contributors: ProviderResult[]): NormalizedCurrent {
  return contributors[0].current;
}

export function fuse(
  contributors: ProviderResult[],
  errors: ProviderError[] = [],
): FusionOutput {
  if (contributors.length === 0) {
    throw new Error('fuse: at least one contributor is required');
  }

  const reference = pickReferenceCurrent(contributors);

  const fused: Partial<FusedCurrent> = {
    time: reference.time,
    weatherCode: fuseWeatherCode(contributors),
    isDay: contributors.map((c) => c.current.isDay).find((v) => v !== undefined),
  };

  for (const key of FUSABLE_KEYS) {
    const { values, weights } = collect(contributors, key);
    const metric = fuseMetric(values, weights);
    if (metric) {
      (fused as Record<string, FusedMetric>)[key] = metric;
    }
  }

  if (!fused.temperatureC) {
    throw new Error('fuse: no temperature data available from any source');
  }

  // Prefer the hourly series from the provider with the most points.
  const hourly =
    [...contributors].sort((a, b) => b.hourly.length - a.hourly.length)[0]?.hourly ?? [];

  return {
    current: fused as FusedCurrent,
    hourly,
    confidence: computeConfidence(contributors),
    contributors,
    errors,
  };
}

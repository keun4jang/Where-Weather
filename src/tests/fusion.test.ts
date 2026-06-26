import { describe, expect, it } from 'vitest';
import {
  computeConfidence,
  fuse,
  hasSourceDisagreement,
  median,
  standardDeviation,
  weightedMedian,
} from '../weather/fusion';
import type { ProviderResult } from '../weather/types';

function provider(
  id: ProviderResult['provider'],
  temp: number,
  extra: Partial<ProviderResult['current']> = {},
): ProviderResult {
  return {
    provider: id,
    fetchedAt: Date.now(),
    current: { time: '2026-06-26T12:00', temperatureC: temp, ...extra },
    hourly: [],
  };
}

describe('median', () => {
  it('computes odd-length median', () => {
    expect(median([3, 1, 2])).toBe(2);
  });
  it('computes even-length median', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it('returns NaN for empty', () => {
    expect(Number.isNaN(median([]))).toBe(true);
  });
});

describe('weightedMedian', () => {
  it('equals median for equal weights', () => {
    expect(weightedMedian([1, 2, 3], [1, 1, 1])).toBe(2);
  });
  it('shifts toward heavier weights', () => {
    expect(weightedMedian([10, 20], [9, 1])).toBe(10);
  });
  it('throws on length mismatch', () => {
    expect(() => weightedMedian([1, 2], [1])).toThrow();
  });
});

describe('standardDeviation', () => {
  it('is zero for identical values', () => {
    expect(standardDeviation([5, 5, 5])).toBe(0);
  });
  it('is positive for spread values', () => {
    expect(standardDeviation([0, 10])).toBeGreaterThan(0);
  });
});

describe('fuse', () => {
  it('fuses two close providers with high confidence', () => {
    const out = fuse([provider('open-meteo', 20), provider('met-no', 21)]);
    // Weighted median of two equal-weight values is the lower crossing point.
    expect(out.current.temperatureC.value).toBe(20);
    expect(out.current.temperatureC.sourceCount).toBe(2);
    expect(out.confidence).toBeGreaterThan(0.7);
  });

  it('gives single source a moderate confidence', () => {
    const out = fuse([provider('open-meteo', 20)]);
    expect(out.confidence).toBeCloseTo(0.6, 5);
  });

  it('throws when no contributors', () => {
    expect(() => fuse([])).toThrow();
  });

  it('detects disagreement on temperature', () => {
    const contributors = [provider('open-meteo', 10), provider('met-no', 25)];
    expect(hasSourceDisagreement(contributors)).toBe(true);
  });

  it('reports no disagreement for close sources', () => {
    const contributors = [provider('open-meteo', 20), provider('met-no', 20.5)];
    expect(hasSourceDisagreement(contributors)).toBe(false);
  });
});

describe('computeConfidence', () => {
  it('is 0 with no contributors', () => {
    expect(computeConfidence([])).toBe(0);
  });
  it('drops when sources disagree', () => {
    const agree = computeConfidence([provider('open-meteo', 20), provider('met-no', 20)]);
    const disagree = computeConfidence([provider('open-meteo', 5), provider('met-no', 30)]);
    expect(disagree).toBeLessThan(agree);
  });
});

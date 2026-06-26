import { describe, expect, it } from 'vitest';
import {
  airQualityVerdict,
  buildVerdicts,
  clothingVerdict,
  commuteVerdict,
  laundryVerdict,
  runningVerdict,
  umbrellaVerdict,
} from '../weather/verdict';
import type { FusedCurrent, FusionOutput } from '../weather/types';

function fusion(current: Partial<FusedCurrent>): FusionOutput {
  return {
    current: {
      time: '2026-06-26T12:00',
      temperatureC: { value: 20, spread: 0, sourceCount: 1 },
      ...current,
    } as FusedCurrent,
    hourly: [],
    confidence: 0.8,
    contributors: [],
    errors: [],
  };
}

describe('umbrellaVerdict', () => {
  it('says yes for high precip probability', () => {
    const v = umbrellaVerdict(
      fusion({ precipitationProbability: { value: 80, spread: 0, sourceCount: 1 } }),
    );
    expect(v.level).toBe('bad');
  });
  it('says maybe for moderate probability', () => {
    const v = umbrellaVerdict(
      fusion({ precipitationProbability: { value: 35, spread: 0, sourceCount: 1 } }),
    );
    expect(v.level).toBe('caution');
  });
  it('says no for dry weather', () => {
    const v = umbrellaVerdict(
      fusion({ precipitationProbability: { value: 5, spread: 0, sourceCount: 1 } }),
    );
    expect(v.level).toBe('good');
  });
  it('flags rain via weather code', () => {
    const v = umbrellaVerdict(fusion({ weatherCode: 63 }));
    expect(v.level).toBe('bad');
  });
});

describe('clothingVerdict', () => {
  it('recommends heavy layers when freezing', () => {
    const v = clothingVerdict(
      fusion({ apparentTemperatureC: { value: -3, spread: 0, sourceCount: 1 } }),
    );
    expect(v.titleKey).toContain('freezing');
  });
  it('recommends light clothes when hot', () => {
    const v = clothingVerdict(
      fusion({ apparentTemperatureC: { value: 32, spread: 0, sourceCount: 1 } }),
    );
    expect(v.titleKey).toContain('hot');
  });
});

describe('laundryVerdict', () => {
  it('bad when rain likely', () => {
    expect(
      laundryVerdict(
        fusion({ precipitationProbability: { value: 70, spread: 0, sourceCount: 1 } }),
      ).level,
    ).toBe('bad');
  });
  it('good when dry and low humidity', () => {
    expect(
      laundryVerdict(
        fusion({
          precipitationProbability: { value: 5, spread: 0, sourceCount: 1 },
          humidity: { value: 40, spread: 0, sourceCount: 1 },
        }),
      ).level,
    ).toBe('good');
  });
});

describe('runningVerdict', () => {
  it('bad when too hot', () => {
    expect(
      runningVerdict(
        fusion({ apparentTemperatureC: { value: 35, spread: 0, sourceCount: 1 } }),
      ).level,
    ).toBe('bad');
  });
  it('good in mild calm conditions', () => {
    expect(
      runningVerdict(
        fusion({
          apparentTemperatureC: { value: 15, spread: 0, sourceCount: 1 },
          windSpeedMs: { value: 2, spread: 0, sourceCount: 1 },
        }),
      ).level,
    ).toBe('good');
  });
});

describe('commuteVerdict', () => {
  it('bad in a thunderstorm', () => {
    expect(commuteVerdict(fusion({ weatherCode: 95 })).level).toBe('bad');
  });
  it('caution in fog', () => {
    expect(commuteVerdict(fusion({ weatherCode: 45 })).level).toBe('caution');
  });
});

describe('airQualityVerdict', () => {
  it('returns null without data', () => {
    expect(airQualityVerdict(undefined)).toBeNull();
  });
  it('bad for high AQI', () => {
    const v = airQualityVerdict({ time: 't', europeanAqi: 95, fetchedAt: 0 });
    expect(v?.level).toBe('bad');
  });
});

describe('buildVerdicts', () => {
  it('produces the five core verdicts', () => {
    const verdicts = buildVerdicts(fusion({}));
    expect(verdicts.map((v) => v.id)).toEqual([
      'umbrella',
      'clothing',
      'laundry',
      'running',
      'commute',
    ]);
  });
  it('adds air verdict when air quality present', () => {
    const verdicts = buildVerdicts(fusion({}), { time: 't', europeanAqi: 20, fetchedAt: 0 });
    expect(verdicts.some((v) => v.id === 'air')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { describeWmo, isPrecipitationCode } from '../weather/wmoCodes';

describe('describeWmo', () => {
  it('maps clear sky', () => {
    expect(describeWmo(0).key).toBe('wmo.clear');
  });
  it('maps thunderstorm', () => {
    expect(describeWmo(95).key).toBe('wmo.thunderstorm');
  });
  it('returns unknown for undefined', () => {
    expect(describeWmo(undefined).key).toBe('wmo.unknown');
  });
  it('returns unknown for unmapped code', () => {
    expect(describeWmo(1234).key).toBe('wmo.unknown');
  });
});

describe('isPrecipitationCode', () => {
  it('true for rain', () => {
    expect(isPrecipitationCode(63)).toBe(true);
  });
  it('false for clear', () => {
    expect(isPrecipitationCode(0)).toBe(false);
  });
  it('false for undefined', () => {
    expect(isPrecipitationCode(undefined)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import {
  cToF,
  convertWind,
  fToC,
  formatTemperature,
  formatWind,
  mmToInches,
  msToKmh,
  msToMph,
} from '../lib/units';

describe('temperature conversion', () => {
  it('converts C to F', () => {
    expect(cToF(0)).toBe(32);
    expect(cToF(100)).toBe(212);
  });
  it('converts F to C', () => {
    expect(fToC(32)).toBe(0);
    expect(fToC(212)).toBeCloseTo(100, 5);
  });
  it('formats with unit suffix', () => {
    expect(formatTemperature(20, 'celsius')).toBe('20°C');
    expect(formatTemperature(0, 'fahrenheit')).toBe('32°F');
  });
});

describe('wind conversion', () => {
  it('converts m/s to km/h', () => {
    expect(msToKmh(10)).toBeCloseTo(36, 5);
  });
  it('converts m/s to mph', () => {
    expect(msToMph(10)).toBeCloseTo(22.369, 2);
  });
  it('convertWind respects unit', () => {
    expect(convertWind(10, 'ms')).toBe(10);
    expect(convertWind(10, 'kmh')).toBeCloseTo(36, 5);
  });
  it('formats wind', () => {
    expect(formatWind(10, 'kmh')).toBe('36 km/h');
    expect(formatWind(5, 'ms')).toBe('5 m/s');
  });
});

describe('precipitation conversion', () => {
  it('converts mm to inches', () => {
    expect(mmToInches(25.4)).toBeCloseTo(1, 5);
  });
});

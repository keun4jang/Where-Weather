import { describe, expect, it } from 'vitest';
import { isRainyDay, localIsoDate, planRainAlerts, weekSignature } from '../weather/rainAlert';
import type { DailyForecast } from '../weather/openMeteoDailyClient';

function day(date: string, prob?: number, mm?: number): DailyForecast {
  return { date, tempMaxC: 10, tempMinC: 0, precipitationProbability: prob, precipitationMm: mm };
}

const dates = Array.from({ length: 10 }, (_, i) => `2026-11-${String(23 + i).padStart(2, '0')}`);

describe('isRainyDay', () => {
  it('uses probability or amount', () => {
    expect(isRainyDay(day('d', 60, 0))).toBe(true);
    expect(isRainyDay(day('d', 10, 1))).toBe(true);
    expect(isRainyDay(day('d', 59, 0.9))).toBe(false);
    expect(isRainyDay(day('d'))).toBe(false);
  });
});

describe('planRainAlerts', () => {
  it('flags rainy tomorrow and rainy days later in the week', () => {
    const days = dates.map((d, i) => day(d, i === 1 || i === 4 || i === 7 || i === 8 ? 80 : 0, 0));
    const plan = planRainAlerts(days, dates[0]);
    expect(plan.tomorrow?.date).toBe(dates[1]);
    // today+2..today+7 only → index 4 and 7, not 8
    expect(plan.week.map((d) => d.date)).toEqual([dates[4], dates[7]]);
  });

  it('returns nothing when dry', () => {
    const plan = planRainAlerts(dates.map((d) => day(d, 10, 0)), dates[0]);
    expect(plan.tomorrow).toBeUndefined();
    expect(plan.week).toEqual([]);
  });

  it('anchors on today even if the list starts earlier', () => {
    const days = dates.map((d, i) => day(d, i === 3 ? 90 : 0));
    expect(planRainAlerts(days, dates[2]).tomorrow?.date).toBe(dates[3]);
  });

  it('returns nothing when today is missing', () => {
    expect(planRainAlerts([day('2020-01-01', 100)], dates[0])).toEqual({ week: [] });
  });
});

describe('helpers', () => {
  it('weekSignature joins dates', () => {
    expect(weekSignature([day('a'), day('b')])).toBe('a,b');
  });
  it('localIsoDate uses local fields', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 0, 30))).toBe('2026-01-05');
  });
});

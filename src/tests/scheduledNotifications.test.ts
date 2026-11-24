import { describe, expect, it } from 'vitest';
import { buildNotificationBody } from '../lib/scheduledNotifications';
import type { WeatherSnapshot } from '../weather/types';

function snap(temp: number, prob: number, uv: number): WeatherSnapshot {
  return {
    location: { latitude: 0, longitude: 0, name: '개봉1동' },
    fusion: {
      current: {
        temperatureC: { value: temp },
        precipitationProbability: { value: prob },
        uvIndex: { value: uv },
      },
    },
  } as unknown as WeatherSnapshot;
}

describe('buildNotificationBody', () => {
  it('morning summary with umbrella and UV', () => {
    expect(buildNotificationBody(6, snap(11.4, 80, 8))).toBe('☀️ 좋은 아침! 개봉1동 11° · ☂️ 우산 필요 · 🧴 자외선 강함');
  });
  it('daytime without rain', () => {
    expect(buildNotificationBody(12, snap(13, 10, 2))).toBe('개봉1동 13°');
  });
  it('daytime with rain', () => {
    expect(buildNotificationBody(15, snap(9, 60, 0))).toBe('개봉1동 9° ☂️ 우산 챙기세요!');
  });
  it('falls back without data', () => {
    expect(buildNotificationBody(9)).toBe('날씨를 확인해보세요 🌤');
  });
});

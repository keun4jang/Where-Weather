import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../app/useSettings';
import { formatTemperature } from '../lib/units';
import { describeWmo } from '../weather/wmoCodes';
import { fetchDailyForecast, type DailyForecast } from '../weather/openMeteoDailyClient';
import { getCache, setCache } from '../lib/cache';
import type { NamedLocation } from '../weather/types';

const TTL_DAILY = 30 * 60 * 1000; // 30분

interface Props {
  location: NamedLocation;
}

function formatDate(dateStr: string, language: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today;
}

export default function MonthlyForecastCard({ location }: Props) {
  const { t, i18n } = useTranslation();
  const { temperatureUnit } = useSettings();
  const [days, setDays] = useState<DailyForecast[]>([]);

  useEffect(() => {
    const key = `daily:${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
    const cached = getCache<DailyForecast[]>(key);
    if (cached) { setDays(cached); return; }

    fetchDailyForecast(location)
      .then((data) => {
        setCache(key, data, TTL_DAILY);
        setDays(data);
      })
      .catch(() => {});
  }, [location]);

  if (days.length === 0) return null;

  return (
    <section className="ww-card">
      <h3 className="mb-2 text-sm font-bold">{t('monthly.title')}</h3>
      <div className="space-y-0.5 max-h-80 overflow-y-auto">
        {days.map((day) => {
          const descriptor = describeWmo(day.weatherCode);
          const today = isToday(day.date);
          return (
            <div
              key={day.date}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${today ? 'bg-brand-600/20 font-semibold' : 'hover:bg-slate-100/50 dark:hover:bg-slate-700/30'}`}
            >
              <span className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                {today ? t('timeline.now') : formatDate(day.date, i18n.language)}
              </span>
              <span className="text-base" aria-label={t(descriptor.key)}>{descriptor.icon}</span>
              <span className="flex-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                {t(descriptor.key)}
              </span>
              {typeof day.precipitationProbability === 'number' && day.precipitationProbability >= 20 && (
                <span className="text-xs text-blue-400">💧{Math.round(day.precipitationProbability)}%</span>
              )}
              <span className="shrink-0 text-xs">
                <span className="text-red-400">{formatTemperature(day.tempMaxC, temperatureUnit)}</span>
                <span className="text-slate-400 mx-0.5">/</span>
                <span className="text-blue-400">{formatTemperature(day.tempMinC, temperatureUnit)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

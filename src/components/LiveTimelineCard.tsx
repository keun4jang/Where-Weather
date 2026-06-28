import { useTranslation } from 'react-i18next';
import { useSettings } from '../app/useSettings';
import { formatHour } from '../lib/time';
import { formatTemperature } from '../lib/units';
import { describeWmo } from '../weather/wmoCodes';
import type { NamedLocation, NormalizedHourly } from '../weather/types';

interface Props {
  hourly: NormalizedHourly[];
  location: NamedLocation;
}

export default function LiveTimelineCard({ hourly, location }: Props) {
  const { t, i18n } = useTranslation();
  const { temperatureUnit } = useSettings();
  if (hourly.length === 0) return null;

  // Re-filter at render time so "now" always reflects the actual current hour,
  // even when the fetched data is from the cache.
  const nowMs = Date.now();
  const fromCurrentHour = hourly.filter(
    (h) => new Date(h.time).getTime() >= nowMs - 60 * 60 * 1000,
  );
  const upcoming = (fromCurrentHour.length > 0 ? fromCurrentHour : hourly).slice(0, 12);

  return (
    <section className="ww-card">
      <h3 className="mb-3 text-sm font-bold">{t('timeline.title')}</h3>
      <ol className="flex gap-3 overflow-x-auto pb-1" role="list">
        {upcoming.map((h, idx) => {
          const descriptor = describeWmo(h.weatherCode);
          const isNow = idx === 0;
          return (
            <li
              key={h.time}
              className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl bg-slate-100 px-2 py-2 text-center dark:bg-slate-700/50"
            >
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isNow
                  ? t('timeline.now')
                  : formatHour(h.time, i18n.language, location.timezone)}
              </span>
              <span className="text-xl" aria-label={t(descriptor.key)}>
                {descriptor.icon}
              </span>
              <span className="text-sm font-semibold">
                {formatTemperature(h.temperatureC, temperatureUnit)}
              </span>
              {typeof h.precipitationProbability === 'number' && (
                <span className="text-[10px] text-blue-500">💧{Math.round(h.precipitationProbability)}%</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

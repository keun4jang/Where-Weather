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
      <ol className="-mx-1 flex gap-2.5 overflow-x-auto px-1 py-1" role="list">
        {upcoming.map((h, idx) => {
          const descriptor = describeWmo(h.weatherCode);
          const isNow = idx === 0;
          return (
            <li
              key={h.time}
              className={`ww-pill ${isNow ? 'ww-pill-active' : ''}`}
            >
              <span className={`text-xs ${isNow ? 'font-semibold text-white' : 'text-violet-200/80'}`}>
                {isNow
                  ? t('timeline.now')
                  : formatHour(h.time, i18n.language, location.timezone)}
              </span>
              <span className="ww-icon-3d text-2xl" aria-label={t(descriptor.key)}>
                {descriptor.icon}
              </span>
              <span className="text-sm font-semibold">
                {formatTemperature(h.temperatureC, temperatureUnit)}
              </span>
              {typeof h.precipitationProbability === 'number' && (
                <span className="text-[10px] font-semibold text-sky-300">💧{Math.round(h.precipitationProbability)}%</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

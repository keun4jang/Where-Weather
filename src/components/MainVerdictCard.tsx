import { useTranslation } from 'react-i18next';
import { useSettings } from '../app/useSettings';
import { formatTemperature, formatWind } from '../lib/units';
import { describeWmo } from '../weather/wmoCodes';
import { verify } from '../weather/verification';
import ConfidenceMeter from './ConfidenceMeter';
import type { NamedLocation, FusionOutput } from '../weather/types';

interface Props {
  location: NamedLocation;
  fusion: FusionOutput;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/10">
      <div className="text-[11px] text-violet-200/80">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

/** High/low over the next 24 hours of hourly data. */
function highLow(hourly: FusionOutput['hourly']): { hi: number; lo: number } | null {
  const now = Date.now();
  const next = hourly.filter((h) => {
    const t = new Date(h.time).getTime();
    return t >= now - 60 * 60 * 1000 && t <= now + 24 * 60 * 60 * 1000;
  });
  if (next.length === 0) return null;
  const temps = next.map((h) => h.temperatureC);
  return { hi: Math.max(...temps), lo: Math.min(...temps) };
}

export default function MainVerdictCard({ location, fusion }: Props) {
  const { t } = useTranslation();
  const { temperatureUnit, windUnit } = useSettings();
  const c = fusion.current;
  const descriptor = describeWmo(c.weatherCode);
  const verification = verify(fusion);

  const placeName =
    location.name ??
    t('location.coordinates', {
      lat: location.latitude.toFixed(2),
      lon: location.longitude.toFixed(2),
    });

  const hl = highLow(fusion.hourly);

  return (
    <section className="ww-card-solid relative overflow-hidden">
      {/* soft glow behind the icon */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet-300/30 blur-3xl" />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-violet-200/80">
            {t('verdictMain.title')}
          </p>
          <h2 className="truncate text-2xl font-light">{placeName}</h2>
        </div>
        <div className="ww-icon-3d -mr-1 -mt-1 text-7xl leading-none" aria-hidden>
          {descriptor.icon}
        </div>
      </div>

      <div className="relative mt-1">
        <span className="text-8xl font-thin leading-none tracking-tighter">
          {formatTemperature(c.temperatureC.value, temperatureUnit)}
        </span>
        <p className="mt-2 text-lg font-light">{t(descriptor.key)}</p>
        <p className="text-sm text-violet-100/80">
          {hl && (
            <>
              {t('verdictMain.high')}:{formatTemperature(hl.hi, temperatureUnit)}{' '}
              {t('verdictMain.low')}:{formatTemperature(hl.lo, temperatureUnit)}
            </>
          )}
          {hl && c.apparentTemperatureC && ' · '}
          {c.apparentTemperatureC &&
            t('verdictMain.feelsLike', {
              value: formatTemperature(c.apparentTemperatureC.value, temperatureUnit),
            })}
        </p>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {c.humidity && (
          <Stat label={t('verdictMain.humidity')} value={`${Math.round(c.humidity.value)}%`} />
        )}
        {c.windSpeedMs && (
          <Stat label={t('verdictMain.wind')} value={formatWind(c.windSpeedMs.value, windUnit)} />
        )}
        {c.uvIndex && (
          <Stat label={t('verdictMain.uv')} value={`${Math.round(c.uvIndex.value)}`} />
        )}
        {c.precipitationProbability && (
          <Stat
            label={t('verdictMain.precipChance')}
            value={`${Math.round(c.precipitationProbability.value)}%`}
          />
        )}
      </div>

      <div className="relative mt-4">
        <ConfidenceMeter value={fusion.confidence} />
        <p className="mt-2 text-xs text-violet-100/80">
          {t(verification.messageKey, { count: verification.sourceCount })}
        </p>
      </div>
    </section>
  );
}

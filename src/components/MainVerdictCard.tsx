import { useTranslation } from 'react-i18next';
import { useSettings } from '../app/settings';
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
    <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/50">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
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

  return (
    <section className="ww-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t('verdictMain.title')}
          </p>
          <h2 className="text-lg font-bold">{placeName}</h2>
        </div>
        <div className="text-right">
          <div className="text-4xl" aria-hidden>
            {descriptor.icon}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-end gap-3">
        <span className="text-5xl font-extrabold tracking-tight">
          {formatTemperature(c.temperatureC.value, temperatureUnit)}
        </span>
        <span className="pb-1 text-sm text-slate-500 dark:text-slate-400">{t(descriptor.key)}</span>
      </div>

      {c.apparentTemperatureC && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('verdictMain.feelsLike', {
            value: formatTemperature(c.apparentTemperatureC.value, temperatureUnit),
          })}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
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

      <div className="mt-4">
        <ConfidenceMeter value={fusion.confidence} />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t(verification.messageKey, { count: verification.sourceCount })}
        </p>
      </div>
    </section>
  );
}

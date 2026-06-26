import { useTranslation } from 'react-i18next';
import type { AirQuality } from '../weather/types';

interface Props {
  airQuality?: AirQuality;
}

function Metric({ label, value, unit }: { label: string; value?: number; unit?: string }) {
  if (typeof value !== 'number') return null;
  return (
    <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/50">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-semibold">
        {Math.round(value)}
        {unit ? ` ${unit}` : ''}
      </div>
    </div>
  );
}

export default function AirQualityCard({ airQuality }: Props) {
  const { t } = useTranslation();
  if (!airQuality) return null;

  return (
    <section className="ww-card">
      <h3 className="mb-3 text-sm font-bold">{t('air.title')}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label={t('air.aqi')} value={airQuality.europeanAqi ?? airQuality.usAqi} />
        <Metric label={t('air.pm25')} value={airQuality.pm25} unit="µg/m³" />
        <Metric label={t('air.pm10')} value={airQuality.pm10} unit="µg/m³" />
        <Metric label={t('air.ozone')} value={airQuality.ozone} unit="µg/m³" />
      </div>
    </section>
  );
}

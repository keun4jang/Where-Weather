import { useTranslation } from 'react-i18next';
import type { AirQuality } from '../weather/types';

interface Props {
  airQuality?: AirQuality;
}

function pm25Grade(v: number): { label: string; color: string } {
  if (v <= 15) return { label: '좋음', color: 'text-green-500' };
  if (v <= 35) return { label: '보통', color: 'text-yellow-500' };
  if (v <= 75) return { label: '나쁨', color: 'text-orange-500' };
  return { label: '매우나쁨', color: 'text-red-500' };
}

function pm10Grade(v: number): { label: string; color: string } {
  if (v <= 30) return { label: '좋음', color: 'text-green-500' };
  if (v <= 80) return { label: '보통', color: 'text-yellow-500' };
  if (v <= 150) return { label: '나쁨', color: 'text-orange-500' };
  return { label: '매우나쁨', color: 'text-red-500' };
}

function aqiGrade(v: number): { label: string; color: string } {
  if (v <= 50) return { label: '좋음', color: 'text-green-500' };
  if (v <= 100) return { label: '보통', color: 'text-yellow-500' };
  if (v <= 150) return { label: '나쁨', color: 'text-orange-500' };
  return { label: '매우나쁨', color: 'text-red-500' };
}

interface MetricProps {
  label: string;
  value?: number;
  unit?: string;
  grade?: { label: string; color: string };
}

function Metric({ label, value, unit, grade }: MetricProps) {
  if (typeof value !== 'number') return null;
  return (
    <div className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/50">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-semibold">{Math.round(value)}</span>
        {unit && <span className="text-[10px] text-slate-400">{unit}</span>}
      </div>
      {grade && <div className={`text-xs font-medium ${grade.color}`}>{grade.label}</div>}
    </div>
  );
}

export default function AirQualityCard({ airQuality }: Props) {
  const { t } = useTranslation();
  if (!airQuality) return null;

  const aqi = airQuality.europeanAqi ?? airQuality.usAqi;

  return (
    <section className="ww-card">
      <h3 className="mb-2 text-sm font-bold">{t('air.title')}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {aqi !== undefined && (
          <Metric label={t('air.aqi')} value={aqi} grade={aqiGrade(aqi)} />
        )}
        <Metric
          label={t('air.pm25')}
          value={airQuality.pm25}
          unit="µg/m³"
          grade={airQuality.pm25 !== undefined ? pm25Grade(airQuality.pm25) : undefined}
        />
        <Metric
          label={t('air.pm10')}
          value={airQuality.pm10}
          unit="µg/m³"
          grade={airQuality.pm10 !== undefined ? pm10Grade(airQuality.pm10) : undefined}
        />
        <Metric label={t('air.ozone')} value={airQuality.ozone} unit="µg/m³" />
      </div>
    </section>
  );
}

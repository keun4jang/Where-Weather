import { useTranslation } from 'react-i18next';
import { useSettings } from '../app/useSettings';
import { formatTemperature } from '../lib/units';
import type { FusionOutput } from '../weather/types';

const PROVIDER_LABELS: Record<string, string> = {
  'open-meteo': 'Open-Meteo',
  'met-no': 'MET Norway',
};

interface Props {
  fusion: FusionOutput;
}

export default function SourceJuryCard({ fusion }: Props) {
  const { t } = useTranslation();
  const { temperatureUnit } = useSettings();

  return (
    <section className="ww-card">
      <h3 className="text-sm font-bold">{t('jury.title')}</h3>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('jury.subtitle')}</p>
      <ul className="space-y-2" role="list">
        {fusion.contributors.map((c) => (
          <li
            key={c.provider}
            className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/50"
          >
            <span className="text-sm font-medium">{PROVIDER_LABELS[c.provider] ?? c.provider}</span>
            <span className="text-sm font-semibold">
              {formatTemperature(c.current.temperatureC, temperatureUnit)}
            </span>
          </li>
        ))}
        {fusion.errors.map((e) => (
          <li
            key={e.provider}
            className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-slate-400 dark:bg-slate-700/30"
          >
            <span className="text-sm">{PROVIDER_LABELS[e.provider] ?? e.provider}</span>
            <span className="text-xs">{t('jury.noData')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

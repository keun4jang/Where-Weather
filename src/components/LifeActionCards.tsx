import { useTranslation } from 'react-i18next';
import StatusBadge from './StatusBadge';
import type { Verdict } from '../weather/types';

interface Props {
  verdicts: Verdict[];
}

const LEVEL_LABEL = {
  good: 'confidence.high',
  caution: 'confidence.medium',
  bad: 'confidence.low',
} as const;

export default function LifeActionCards({ verdicts }: Props) {
  const { t } = useTranslation();
  return (
    <section>
      <h3 className="mb-3 px-1 text-sm font-bold text-slate-200">{t('lifeActions.title')}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {verdicts.map((v) => (
          <article key={v.id} className="ww-card flex items-start gap-3">
            <span className="text-2xl" aria-hidden>
              {v.icon}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold">{t(v.titleKey, v.values)}</h4>
                <StatusBadge level={v.level} label={t(LEVEL_LABEL[v.level])} />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t(v.detailKey, v.values)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

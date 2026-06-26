import { useTranslation } from 'react-i18next';

interface Props {
  /** Confidence in [0,1]. */
  value: number;
}

export default function ConfidenceMeter({ value }: Props) {
  const { t } = useTranslation();
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const levelKey = value >= 0.75 ? 'confidence.high' : value >= 0.5 ? 'confidence.medium' : 'confidence.low';
  const color = value >= 0.75 ? 'bg-green-500' : value >= 0.5 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{t('confidence.label')}</span>
        <span className="font-medium">
          {t(levelKey)} · {pct}%
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('confidence.label')}
      >
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

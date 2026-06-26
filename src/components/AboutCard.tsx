import { useTranslation } from 'react-i18next';

export default function AboutCard() {
  const { t } = useTranslation();
  return (
    <section className="ww-card">
      <h3 className="text-sm font-bold">{t('about.title')}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('about.body')}</p>
      <ul className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <li>📡 {t('about.dataSources')}</li>
        <li>🔒 {t('about.privacy')}</li>
      </ul>
    </section>
  );
}

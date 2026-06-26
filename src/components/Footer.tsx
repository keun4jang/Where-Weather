import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../generated/appVersion';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mx-auto mt-8 max-w-2xl px-4 pb-10 text-center text-xs text-slate-400">
      <p>{t('footer.madeWith')}</p>
      <p className="mt-1">
        {t('footer.openSource')} · {t('footer.version', { version: APP_VERSION })}
      </p>
    </footer>
  );
}

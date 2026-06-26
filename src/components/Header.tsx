import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import UnitSwitcher from './UnitSwitcher';

export default function Header() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            🌦️
          </span>
          <div>
            <h1 className="text-base font-bold leading-tight text-white">{t('app.title')}</h1>
            <p className="text-xs text-slate-400">{t('app.tagline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </div>
      <div className="mx-auto flex max-w-2xl justify-end px-4 pb-3">
        <UnitSwitcher />
      </div>
    </header>
  );
}

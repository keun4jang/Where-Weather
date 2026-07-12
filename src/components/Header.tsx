import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import UnitSwitcher from './UnitSwitcher';
import NotificationSettingsModal from './NotificationSettingsModal';

export default function Header() {
  const { t } = useTranslation();
  const [showNotifSettings, setShowNotifSettings] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>🌦️</span>
            <div>
              <h1 className="text-sm font-bold leading-tight text-white">{t('app.title')}</h1>
              <p className="text-[10px] text-slate-400">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-slate-400 hover:text-white transition-colors p-1"
              onClick={() => setShowNotifSettings(true)}
              title={t('notifSettings.title')}
            >
              🔔
            </button>
            <LanguageSwitcher />
          </div>
        </div>
        <div className="mx-auto flex max-w-2xl justify-end px-3 pb-2">
          <UnitSwitcher />
        </div>
      </header>

      {showNotifSettings && (
        <NotificationSettingsModal onClose={() => setShowNotifSettings(false)} />
      )}
    </>
  );
}

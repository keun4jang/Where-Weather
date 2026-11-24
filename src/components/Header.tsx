import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SettingsScreen from './SettingsScreen';

export default function Header() {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-10 border-b border-white/10 bg-[#1b1440]/70 backdrop-blur"
        // Android insets are applied natively; iOS/PWA use env().
        style={{ paddingTop: 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xl" aria-hidden>🌦️</span>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight text-white">{t('app.title')}</h1>
              <p className="truncate text-[10px] text-violet-200/70">{t('app.tagline')}</p>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full p-2 text-xl text-violet-100 hover:bg-white/10"
            onClick={() => setShowSettings(true)}
            aria-label={t('settingsScreen.title')}
            title={t('settingsScreen.title')}
          >
            ⚙️
          </button>
        </div>
      </header>

      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
    </>
  );
}

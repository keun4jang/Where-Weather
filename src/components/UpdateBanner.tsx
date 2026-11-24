import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkForAppUpdate, installAppUpdate, type UpdateInfo } from '../lib/appUpdate';

type Phase = 'idle' | 'downloading' | 'needsPermission' | 'failed';

/** Android app only: shows when a newer APK is published on GitHub. */
export default function UpdateBanner() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    void checkForAppUpdate().then(setInfo);
    // Re-check when coming back (e.g. after granting the install permission).
    function onVisible() {
      if (document.visibilityState === 'visible') void checkForAppUpdate().then(setInfo);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  if (!info?.available) return null;

  async function update() {
    setPhase('downloading');
    const result = await installAppUpdate();
    setPhase(result === 'installer' ? 'idle' : result);
  }

  return (
    <div className="ww-card-solid !p-4 space-y-2">
      <p className="text-sm font-semibold">⬆️ {t('update.available', { version: info.latestName })}</p>
      {phase === 'needsPermission' && <p className="text-xs text-violet-100/90">{t('update.needsPermission')}</p>}
      {phase === 'failed' && <p className="text-xs text-amber-300">{t('update.failed')}</p>}
      <button
        type="button"
        className="ww-btn w-full !bg-white !text-brand-700"
        disabled={phase === 'downloading'}
        onClick={() => void update()}
      >
        {phase === 'downloading' ? t('update.downloading') : t('update.button')}
      </button>
    </div>
  );
}

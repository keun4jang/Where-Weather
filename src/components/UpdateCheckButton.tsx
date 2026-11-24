import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkForAppUpdate, installAppUpdate, isNativeApp } from '../lib/appUpdate';

type State = 'idle' | 'checking' | 'latest' | 'downloading' | 'needsPermission' | 'failed';

/** Always-visible manual update check (Android app only). */
export default function UpdateCheckButton() {
  const { t } = useTranslation();
  const [native, setNative] = useState(false);
  const [state, setState] = useState<State>('idle');

  useEffect(() => {
    void isNativeApp().then(setNative);
  }, []);

  if (!native) return null;

  async function run() {
    setState('checking');
    const info = await checkForAppUpdate();
    if (!info) { setState('failed'); return; }
    if (!info.available) { setState('latest'); return; }
    setState('downloading');
    const result = await installAppUpdate();
    setState(result === 'installer' ? 'idle' : result);
  }

  const busy = state === 'checking' || state === 'downloading';
  const label =
    state === 'checking' ? t('update.checking')
      : state === 'downloading' ? t('update.downloading')
        : t('update.check');

  return (
    <div className="mt-3 space-y-1">
      <button type="button" className="ww-btn-ghost ring-1 ring-white/15" disabled={busy} onClick={() => void run()}>
        ⬆️ {label}
      </button>
      {state === 'latest' && <p className="text-emerald-400">{t('update.latest')}</p>}
      {state === 'needsPermission' && <p className="text-amber-300">{t('update.needsPermission')}</p>}
      {state === 'failed' && <p className="text-amber-300">{t('update.failed')}</p>}
    </div>
  );
}

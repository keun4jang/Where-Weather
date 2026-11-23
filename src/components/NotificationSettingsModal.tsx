import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getNotifEnabled, setNotifEnabled } from '../lib/scheduledNotifications';
import { getNotifPermission } from '../lib/notifications';
import {
  getBatteryExempt,
  getRainAlertEnabled,
  isNativeRainAlerts,
  requestBatteryExemption,
  setRainAlertEnabled,
} from '../lib/rainAlerts';

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-slate-600'}`}
    >
      <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export default function NotificationSettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const perm = getNotifPermission();
  const [enabled, setEnabled] = useState(getNotifEnabled());
  const [rainOn, setRainOn] = useState(getRainAlertEnabled());
  const [native, setNative] = useState(false);

  const [batteryExempt, setBatteryExempt] = useState<boolean | null>(null);

  useEffect(() => {
    void isNativeRainAlerts().then(setNative);
    const refresh = () => void getBatteryExempt().then(setBatteryExempt);
    refresh();
    // Re-check when returning from the system dialog.
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  function toggleRain() {
    const next = !rainOn;
    setRainOn(next);
    void setRainAlertEnabled(next, t);
  }

  // The Android WebView has no web Notification API, so show the rain toggle there regardless.
  const showRain = native || perm === 'granted';

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setNotifEnabled(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">🔔 {t('notifSettings.title')}</h2>
          <button type="button" className="opacity-50 hover:opacity-100" onClick={onClose}>✕</button>
        </div>

        {perm === 'denied' && (
          <p className="text-sm text-amber-400 bg-amber-400/10 rounded-xl px-3 py-2">
            {t('notifications.denied')}
          </p>
        )}
        {perm === 'unsupported' && (
          <p className="text-sm text-slate-400">{t('notifications.unsupported')}</p>
        )}

        {perm === 'granted' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{t('notifSettings.enableAll')}</p>
                <p className="text-xs text-slate-400">{t('notifSettings.scheduleInfo')}</p>
              </div>
              <button
                type="button"
                onClick={toggle}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-brand-600' : 'bg-slate-600'}`}
              >
                <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">{t('notifSettings.schedule')}</p>
              <p>🌅 06:00 — {t('notifSettings.morning')}</p>
              <p>🌤 09:00, 12:00, 15:00, 18:00 — {t('notifSettings.daily')}</p>
            </div>
          </div>
        )}

        {showRain && (
          <div className="space-y-2 border-t border-slate-700 pt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">☔ {t('rainAlert.settingTitle')}</p>
                <p className="text-xs text-slate-400">{t('rainAlert.settingInfo')}</p>
              </div>
              <Toggle on={rainOn} onClick={toggleRain} label={t('rainAlert.settingTitle')} />
            </div>
            {!native && <p className="text-xs text-amber-400/80">{t('rainAlert.webLimit')}</p>}
            {native && batteryExempt === false && (
              <div className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-300 space-y-2">
                <p>{t('rainAlert.batteryInfo')}</p>
                <button type="button" className="ww-btn w-full" onClick={() => void requestBatteryExemption()}>
                  🔋 {t('rainAlert.batteryButton')}
                </button>
              </div>
            )}
            {native && batteryExempt === true && (
              <p className="text-xs text-emerald-400">✓ {t('rainAlert.batteryOk')}</p>
            )}
          </div>
        )}

        <button type="button" className="ww-btn w-full" onClick={onClose}>
          {t('notifSettings.close')}
        </button>
      </div>
    </div>
  );
}

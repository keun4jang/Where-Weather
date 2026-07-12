import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getNotifEnabled, setNotifEnabled } from '../lib/scheduledNotifications';
import { getNotifPermission } from '../lib/notifications';

export default function NotificationSettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const perm = getNotifPermission();
  const [enabled, setEnabled] = useState(getNotifEnabled());

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

        <button type="button" className="ww-btn w-full" onClick={onClose}>
          {t('notifSettings.close')}
        </button>
      </div>
    </div>
  );
}

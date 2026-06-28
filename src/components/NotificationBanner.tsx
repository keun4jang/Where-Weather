import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getNotifPermission,
  requestPermission,
  showNotification,
  isIos,
  isStandalone,
  type NotifPermission,
} from '../lib/notifications';
import { scheduleWeatherAlerts } from '../lib/scheduledNotifications';

export default function NotificationBanner() {
  const { t } = useTranslation();
  const [perm, setPerm] = useState<NotifPermission>('default');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPerm(getNotifPermission());
  }, []);

  // Already granted or dismissed — nothing to show
  if (perm === 'granted' || perm === 'unsupported' || dismissed) return null;
  // If denied, show brief message once then hide
  if (perm === 'denied') {
    return (
      <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center justify-between gap-2">
        <span>{t('notifications.denied')}</span>
        <button type="button" className="shrink-0 opacity-60 hover:opacity-100" onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  // iOS not yet in standalone — show "add to home screen" hint
  const needsInstall = isIos() && !isStandalone();
  if (needsInstall) {
    return (
      <div className="rounded-xl bg-brand-600/20 border border-brand-500/30 px-4 py-3 text-sm text-slate-300 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white mb-0.5">🔔 {t('notifications.title')}</p>
          <p>{t('notifications.iosHint')}</p>
          <p className="mt-1 text-xs opacity-70">Safari → 공유 버튼 → 홈 화면에 추가</p>
        </div>
        <button type="button" className="shrink-0 mt-0.5 opacity-60 hover:opacity-100" onClick={() => setDismissed(true)}>✕</button>
      </div>
    );
  }

  async function handleEnable() {
    const result = await requestPermission();
    setPerm(result);
    if (result === 'granted') {
      showNotification('Where Weather 🌦️', t('notifications.body'), 'welcome');
      void scheduleWeatherAlerts();
    }
  }

  return (
    <div className="rounded-xl bg-brand-600/20 border border-brand-500/30 px-4 py-3 text-sm flex items-center justify-between gap-3">
      <div>
        <p className="font-medium text-white mb-0.5">🔔 {t('notifications.title')}</p>
        <p className="text-slate-400">{t('notifications.scheduledInfo')}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" className="ww-btn !py-1 !px-3 !text-xs" onClick={() => void handleEnable()}>
          {t('notifications.enable')}
        </button>
        <button type="button" className="opacity-40 hover:opacity-70" onClick={() => setDismissed(true)}>✕</button>
      </div>
    </div>
  );
}

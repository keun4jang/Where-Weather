import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../app/useSettings';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { APP_VERSION } from '../generated/appVersion';
import type { TemperatureUnit, WindUnit } from '../lib/units';
import { getAutoLocate, setAutoLocate } from '../lib/prefs';
import { getNotifPermission, requestPermission, type NotifPermission } from '../lib/notifications';
import {
  HOUR_OPTIONS,
  getNotifEnabled,
  getNotifHours,
  setNotifEnabled,
  setNotifHours,
} from '../lib/scheduledNotifications';
import {
  RAIN_THRESHOLD_OPTIONS,
  getBatteryExempt,
  getNativeNotificationsEnabled,
  getRainAlertEnabled,
  getRainThreshold,
  isNativeRainAlerts,
  openNativeNotificationSettings,
  requestBatteryExemption,
  sendTestNotification,
  setRainAlertEnabled,
  setRainThreshold,
} from '../lib/rainAlerts';
import UpdateCheckButton from './UpdateCheckButton';

// ─── Small building blocks ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-widest text-violet-300/80">{title}</h3>
      <div className="divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/[0.07] ring-1 ring-white/10">
        {children}
      </div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-violet-200/70">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Block({ children }: { children: ReactNode }) {
  return <div className="space-y-2 px-4 py-3">{children}</div>;
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${on ? 'bg-brand-500' : 'bg-white/20'}`}
    >
      <span
        className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function Segment<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 rounded-xl bg-white/10 p-0.5 ring-1 ring-white/15">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
            value === o.value ? 'bg-brand-600 text-white' : 'text-violet-100 hover:bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { temperatureUnit, windUnit, setTemperatureUnit, setWindUnit } = useSettings();

  const [native, setNative] = useState(false);
  const [webPerm, setWebPerm] = useState<NotifPermission>(getNotifPermission());
  const [osNotifOn, setOsNotifOn] = useState<boolean | null>(null);
  const [batteryExempt, setBatteryExempt] = useState<boolean | null>(null);

  const [autoLocate, setAutoLocateState] = useState(getAutoLocate());
  const [dailyOn, setDailyOn] = useState(getNotifEnabled());
  const [hours, setHours] = useState<number[]>(getNotifHours());
  const [rainOn, setRainOn] = useState(getRainAlertEnabled());
  const [threshold, setThresholdState] = useState(getRainThreshold());
  const [testState, setTestState] = useState<'idle' | 'sent' | 'failed'>('idle');

  useEffect(() => {
    void isNativeRainAlerts().then(setNative);
    function refresh() {
      void getBatteryExempt().then(setBatteryExempt);
      void getNativeNotificationsEnabled().then(setOsNotifOn);
      setWebPerm(getNotifPermission());
    }
    refresh();
    // Re-check after returning from a system settings screen.
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  // Close with the Android back gesture / Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ??
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ??
    SUPPORTED_LANGUAGES[0];

  const notificationsUsable = native || webPerm === 'granted';

  function toggleHour(h: number) {
    const next = hours.includes(h) ? hours.filter((x) => x !== h) : [...hours, h].sort((a, b) => a - b);
    setHours(next);
    setNotifHours(next);
  }

  async function runTest() {
    setTestState('idle');
    const ok = await sendTestNotification(t);
    setTestState(ok ? 'sent' : 'failed');
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1b1440]">
      <div
        className="sticky top-0 z-10 border-b border-white/10 bg-[#1b1440]/90 backdrop-blur"
        style={{ paddingTop: 'var(--safe-area-inset-top, env(safe-area-inset-top, 0px))' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold text-white">⚙️ {t('settingsScreen.title')}</h2>
          <button type="button" className="ww-btn-ghost" onClick={onClose} aria-label={t('notifSettings.close')}>
            ✕
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-5 pb-16">
        {/* ── 일반 ── */}
        <Section title={t('settingsScreen.general')}>
          <Row label={t('settings.language')}>
            <select
              className="rounded-xl bg-white/10 px-3 py-1.5 text-sm text-white ring-1 ring-white/15"
              value={currentLang.code}
              onChange={(e) => void i18n.changeLanguage(e.target.value)}
              aria-label={t('settings.language')}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="text-slate-900">{l.label}</option>
              ))}
            </select>
          </Row>
          <Row label={t('settings.temperature')}>
            <Segment<TemperatureUnit>
              label={t('settings.temperature')}
              value={temperatureUnit}
              onChange={setTemperatureUnit}
              options={[{ value: 'celsius', label: '°C' }, { value: 'fahrenheit', label: '°F' }]}
            />
          </Row>
          <Row label={t('settings.wind')}>
            <Segment<WindUnit>
              label={t('settings.wind')}
              value={windUnit}
              onChange={setWindUnit}
              options={[
                { value: 'ms', label: t('settings.ms') },
                { value: 'kmh', label: t('settings.kmh') },
                { value: 'mph', label: t('settings.mph') },
              ]}
            />
          </Row>
        </Section>

        {/* ── 위치 ── */}
        <Section title={t('settingsScreen.location')}>
          <Row label={t('settingsScreen.autoLocate')} hint={t('settingsScreen.autoLocateHint')}>
            <Toggle
              on={autoLocate}
              label={t('settingsScreen.autoLocate')}
              onChange={(v) => { setAutoLocateState(v); setAutoLocate(v); }}
            />
          </Row>
        </Section>

        {/* ── 알림 ── */}
        <Section title={t('settingsScreen.notifications')}>
          {/* 권한 상태 */}
          {native && osNotifOn === false && (
            <Block>
              <p className="text-sm text-amber-300">{t('settingsScreen.osNotifOff')}</p>
              <button type="button" className="ww-btn w-full" onClick={() => void openNativeNotificationSettings()}>
                {t('settingsScreen.openNotifSettings')}
              </button>
            </Block>
          )}
          {!native && webPerm === 'default' && (
            <Block>
              <button
                type="button"
                className="ww-btn w-full"
                onClick={() => void requestPermission().then(setWebPerm)}
              >
                🔔 {t('notifications.enable')}
              </button>
            </Block>
          )}
          {!native && webPerm === 'denied' && (
            <Block><p className="text-sm text-amber-300">{t('notifications.denied')}</p></Block>
          )}
          {!native && webPerm === 'unsupported' && (
            <Block><p className="text-sm text-violet-200/70">{t('notifications.unsupported')}</p></Block>
          )}

          {notificationsUsable && (
            <>
              {/* 정기 날씨 알림 */}
              <Row label={`🌤 ${t('notifSettings.enableAll')}`} hint={t('settingsScreen.dailyHint')}>
                <Toggle
                  on={dailyOn}
                  label={t('notifSettings.enableAll')}
                  onChange={(v) => { setDailyOn(v); setNotifEnabled(v); }}
                />
              </Row>
              {dailyOn && (
                <Block>
                  <p className="text-xs text-violet-200/80">{t('settingsScreen.hours')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {HOUR_OPTIONS.map((h) => {
                      const on = hours.includes(h);
                      return (
                        <button
                          key={h}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleHour(h)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition ${
                            on ? 'bg-brand-600 text-white ring-white/30' : 'bg-white/5 text-violet-200 ring-white/15'
                          }`}
                        >
                          {String(h).padStart(2, '0')}:00
                        </button>
                      );
                    })}
                  </div>
                  {hours.length === 0 && <p className="text-xs text-amber-300">{t('settingsScreen.noHours')}</p>}
                </Block>
              )}

              {/* 비 알림 */}
              <Row label={`☔ ${t('rainAlert.settingTitle')}`} hint={t('rainAlert.settingInfo')}>
                <Toggle
                  on={rainOn}
                  label={t('rainAlert.settingTitle')}
                  onChange={(v) => { setRainOn(v); void setRainAlertEnabled(v, t); }}
                />
              </Row>
              {rainOn && (
                <Row label={t('settingsScreen.sensitivity')} hint={t('settingsScreen.sensitivityHint', { value: threshold })}>
                  <Segment<number>
                    label={t('settingsScreen.sensitivity')}
                    value={threshold}
                    onChange={(v) => { setThresholdState(v); void setRainThreshold(v, t); }}
                    options={RAIN_THRESHOLD_OPTIONS.map((v) => ({
                      value: v,
                      label: v === 40 ? t('settingsScreen.sensHigh') : v === 60 ? t('settingsScreen.sensMid') : t('settingsScreen.sensLow'),
                    }))}
                  />
                </Row>
              )}
              {!native && <Block><p className="text-xs text-amber-400/80">{t('rainAlert.webLimit')}</p></Block>}

              {/* 테스트 */}
              <Block>
                <button type="button" className="ww-btn w-full" onClick={() => void runTest()}>
                  🧪 {t('settingsScreen.test')}
                </button>
                {testState === 'sent' && <p className="text-xs text-emerald-400">{t('settingsScreen.testSent')}</p>}
                {testState === 'failed' && <p className="text-xs text-amber-300">{t('settingsScreen.testFailed')}</p>}
              </Block>
            </>
          )}
        </Section>

        {/* ── 배터리 (Android) ── */}
        {native && (
          <Section title={t('settingsScreen.battery')}>
            {batteryExempt === true ? (
              <Block><p className="text-sm text-emerald-400">✓ {t('rainAlert.batteryOk')}</p></Block>
            ) : (
              <Block>
                <p className="text-xs text-violet-200/80">{t('rainAlert.batteryInfo')}</p>
                <button type="button" className="ww-btn w-full" onClick={() => void requestBatteryExemption()}>
                  🔋 {t('rainAlert.batteryButton')}
                </button>
              </Block>
            )}
            <Block><p className="text-xs text-violet-200/70">{t('settingsScreen.samsungHint')}</p></Block>
          </Section>
        )}

        {/* ── 앱 정보 ── */}
        <Section title={t('settingsScreen.about')}>
          <Row label={t('settingsScreen.version')}>
            <span className="text-sm text-violet-200">v{APP_VERSION}</span>
          </Row>
          {native && (
            <Block>
              <UpdateCheckButton />
            </Block>
          )}
        </Section>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ??
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ??
    SUPPORTED_LANGUAGES[0];

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('settings.language')}</span>
      <select
        className="appearance-none rounded-xl bg-white/10 px-3 py-2 pr-8 text-sm font-medium text-slate-100 ring-1 ring-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        value={current.code}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        aria-label={t('settings.language')}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="text-slate-900">
            {lang.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 text-slate-300" aria-hidden>
        ▾
      </span>
    </label>
  );
}

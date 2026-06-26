import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchLocations } from '../location/geocoding';
import type { NamedLocation } from '../weather/types';

interface Props {
  loading: boolean;
  onUseMyLocation: () => void;
  onPickLocation: (location: NamedLocation) => void;
}

export default function LocationPermissionCard({
  loading,
  onUseMyLocation,
  onPickLocation,
}: Props) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NamedLocation[]>([]);
  const [searching, setSearching] = useState(false);

  async function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchLocations(value, i18n.language));
    } finally {
      setSearching(false);
    }
  }

  return (
    <section className="ww-card mx-auto max-w-md text-center">
      <div className="mb-2 text-4xl" aria-hidden>
        📍
      </div>
      <h2 className="text-lg font-bold">{t('location.permissionTitle')}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {t('location.permissionBody')}
      </p>

      <button type="button" className="ww-btn mt-4 w-full" onClick={onUseMyLocation} disabled={loading}>
        {loading ? t('location.locating') : `📍 ${t('location.useMyLocation')}`}
      </button>

      <div className="mt-4 text-left">
        <input
          type="search"
          value={query}
          onChange={(e) => void runSearch(e.target.value)}
          placeholder={t('location.searchPlaceholder')}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          aria-label={t('location.searchPlaceholder')}
        />
        {searching && <p className="mt-2 text-xs text-slate-400">{t('app.loading')}</p>}
        {results.length > 0 && (
          <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {results.map((r) => (
              <li key={`${r.latitude},${r.longitude}`}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => onPickLocation(r)}
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-slate-400">
                    {' '}
                    {[r.admin1, r.country].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

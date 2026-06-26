import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchLocations } from '../location/geocoding';
import { locationKey } from '../location/locationKey';
import type { NamedLocation } from '../weather/types';

interface Props {
  locations: NamedLocation[];
  activeKey: string;
  onSelect: (key: string) => void;
  onAdd: (location: NamedLocation) => void;
  onRemove: (key: string) => void;
  onUseMyLocation: () => void;
  loadingKey: string | null;
}

function locationLabel(loc: NamedLocation) {
  if (loc.name) return loc.name;
  return `${loc.latitude.toFixed(1)}, ${loc.longitude.toFixed(1)}`;
}

export default function LocationTabs({
  locations,
  activeKey,
  onSelect,
  onAdd,
  onRemove,
  onUseMyLocation,
  loadingKey,
}: Props) {
  const { t, i18n } = useTranslation();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NamedLocation[]>([]);
  const [searching, setSearching] = useState(false);

  async function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      setResults(await searchLocations(value, i18n.language));
    } finally {
      setSearching(false);
    }
  }

  function pickLocation(loc: NamedLocation) {
    onAdd(loc);
    setShowSearch(false);
    setQuery('');
    setResults([]);
  }

  function handleMyLocation() {
    onUseMyLocation();
    setShowSearch(false);
  }

  return (
    <div className="ww-card !p-0 overflow-hidden">
      {/* Tab row */}
      <div className="flex items-center gap-1 overflow-x-auto px-2 pt-2 pb-1 scrollbar-none">
        {locations.map((loc) => {
          const key = locationKey(loc);
          const isActive = key === activeKey;
          const isLoading = loadingKey === key;
          return (
            <div key={key} className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => onSelect(key)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                {isLoading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {locationLabel(loc)}
              </button>
              {locations.length > 1 && (
                <button
                  type="button"
                  aria-label={t('location.removeLocation')}
                  onClick={() => onRemove(key)}
                  className="ml-0.5 rounded-full p-0.5 text-slate-400 hover:text-red-400"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

        {/* Add button */}
        <button
          type="button"
          onClick={() => setShowSearch((s) => !s)}
          className="shrink-0 rounded-full px-3 py-1 text-sm text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          title={t('location.addLocation')}
        >
          +
        </button>
      </div>

      {/* Add location search */}
      {showSearch && (
        <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
          <button
            type="button"
            className="ww-btn mb-2 w-full"
            onClick={handleMyLocation}
          >
            📍 {t('location.useMyLocation')}
          </button>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => void runSearch(e.target.value)}
            placeholder={t('location.addPlaceholder')}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          {searching && <p className="mt-1 text-xs text-slate-400">{t('app.loading')}</p>}
          {results.length > 0 && (
            <ul className="mt-2 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {results.map((r) => (
                <li key={`${r.latitude},${r.longitude}`}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={() => pickLocation(r)}
                  >
                    <span className="font-medium">{r.name}</span>
                    <span className="text-slate-400"> {[r.admin1, r.country].filter(Boolean).join(', ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LocationPermissionCard from '../components/LocationPermissionCard';
import LocationTabs from '../components/LocationTabs';
import { locationKey } from '../location/locationKey';
import MainVerdictCard from '../components/MainVerdictCard';
import LiveTimelineCard from '../components/LiveTimelineCard';
import SourceJuryCard from '../components/SourceJuryCard';
import LifeActionCards from '../components/LifeActionCards';
import AirQualityCard from '../components/AirQualityCard';
import AboutCard from '../components/AboutCard';
import { SettingsProvider } from './settings';
import { requestCurrentPosition } from '../location/geolocation';
import { reverseGeocode } from '../location/geocoding';
import { getWeatherSnapshot } from '../weather/providers';
import { AppError, toMessage } from '../lib/errors';
import { pushWidgetData } from '../lib/widgetBridge';
import { triggerWeatherAlerts } from '../lib/notifications';
import NotificationBanner from '../components/NotificationBanner';
import type { NamedLocation, WeatherSnapshot } from '../weather/types';

const LOCATIONS_KEY = 'savedLocations';

function loadSavedLocations(): NamedLocation[] {
  try {
    const raw = localStorage.getItem(LOCATIONS_KEY);
    return raw ? (JSON.parse(raw) as NamedLocation[]) : [];
  } catch {
    return [];
  }
}

function saveSavedLocations(locs: NamedLocation[]) {
  try {
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locs));
  } catch {
    /* ignore */
  }
}

function AppInner() {
  const { t, i18n } = useTranslation();

  // Saved location list (persisted)
  const [locations, setLocations] = useState<NamedLocation[]>(loadSavedLocations);
  // Snapshots per location key
  const [snapshots, setSnapshots] = useState<Record<string, WeatherSnapshot>>({});
  // Active location key
  const [activeKey, setActiveKey] = useState<string>(() => {
    const saved = loadSavedLocations();
    return saved.length > 0 ? locationKey(saved[0]) : '';
  });
  // Per-location loading/error states
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // GPS coords for language-aware reverse geocoding
  const gpsCoords = useRef<{ latitude: number; longitude: number } | null>(null);
  // Key of the GPS-based location (so we can update its name on language change)
  const gpsKey = useRef<string | null>(null);

  const activeSnapshot = activeKey ? snapshots[activeKey] ?? null : null;
  const activeLocation = locations.find((l) => locationKey(l) === activeKey) ?? null;

  const loadFor = useCallback(async (location: NamedLocation): Promise<void> => {
    const key = locationKey(location);
    setLoadingKey(key);
    setErrors((prev) => ({ ...prev, [key]: '' }));
    try {
      const result = await getWeatherSnapshot(location);
      setSnapshots((prev) => ({ ...prev, [key]: result }));
      // Push to service worker for home screen widget
      void pushWidgetData(result);
      // Trigger weather alerts if permission granted
      const locName = [location.name, location.country].filter(Boolean).join(', ') || '';
      triggerWeatherAlerts(result, locName, t);
    } catch (err) {
      const msg = err instanceof AppError
        ? err.i18nKey
        : err instanceof Error && err.message.startsWith('errors.')
          ? err.message
          : 'errors.generic';
      setErrors((prev) => ({ ...prev, [key]: msg }));
      console.error('Where Weather load failed:', toMessage(err));
    } finally {
      setLoadingKey(null);
    }
  }, [t]);

  const addLocation = useCallback((location: NamedLocation) => {
    const key = locationKey(location);
    setLocations((prev) => {
      if (prev.some((l) => locationKey(l) === key)) {
        // Already saved — just switch to it
        setActiveKey(key);
        return prev;
      }
      const next = [...prev, location];
      saveSavedLocations(next);
      return next;
    });
    setActiveKey(key);
    void loadFor(location);
  }, [loadFor]);

  const removeLocation = useCallback((key: string) => {
    setLocations((prev) => {
      const next = prev.filter((l) => locationKey(l) !== key);
      saveSavedLocations(next);
      if (activeKey === key && next.length > 0) {
        setActiveKey(locationKey(next[0]));
      } else if (next.length === 0) {
        setActiveKey('');
      }
      return next;
    });
    setSnapshots((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }, [activeKey]);

  const handleUseMyLocation = useCallback(async () => {
    setLoadingKey('gps');
    setErrors((prev) => ({ ...prev, gps: '' }));
    try {
      const coords = await requestCurrentPosition();
      gpsCoords.current = coords;
      const named = await reverseGeocode(coords, i18n.language ?? 'en');
      const key = locationKey(named);
      gpsKey.current = key;
      addLocation(named);
    } catch (err) {
      const msg = err instanceof AppError ? err.i18nKey : 'errors.geolocationUnavailable';
      setErrors((prev) => ({ ...prev, gps: msg }));
    } finally {
      setLoadingKey(null);
    }
  }, [addLocation, i18n.language]);

  // On language change, update GPS location name
  useEffect(() => {
    if (!gpsCoords.current || !gpsKey.current) return;
    const oldKey = gpsKey.current;
    const coords = gpsCoords.current;
    reverseGeocode(coords, i18n.language ?? 'en').then((named) => {
      const newKey = locationKey(named);
      gpsKey.current = newKey;
      setLocations((prev) => {
        const next = prev.map((l) => locationKey(l) === oldKey ? named : l);
        saveSavedLocations(next);
        return next;
      });
      if (activeKey === oldKey) setActiveKey(newKey);
      setSnapshots((prev) => {
        const n = { ...prev };
        if (oldKey !== newKey && n[oldKey]) { n[newKey] = n[oldKey]; delete n[oldKey]; }
        return n;
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const handleRefresh = useCallback(() => {
    if (activeLocation) void loadFor(activeLocation);
  }, [activeLocation, loadFor]);

  const activeError = errors[activeKey] || errors['gps'] || null;
  const isActiveLoading = loadingKey === activeKey || loadingKey === 'gps';

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <NotificationBanner />

        {locations.length === 0 ? (
          <>
            <LocationPermissionCard
              loading={loadingKey === 'gps'}
              onUseMyLocation={() => void handleUseMyLocation()}
              onPickLocation={(loc) => addLocation(loc)}
            />
            {activeError && (
              <p className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                {t(activeError)}
              </p>
            )}
          </>
        ) : (
          <>
            <LocationTabs
              locations={locations}
              activeKey={activeKey}
              onSelect={setActiveKey}
              onAdd={addLocation}
              onRemove={removeLocation}
              onUseMyLocation={() => void handleUseMyLocation()}
              loadingKey={loadingKey}
            />

            <div className="flex items-center justify-end">
              <button
                type="button"
                className="ww-btn-ghost"
                onClick={handleRefresh}
                disabled={isActiveLoading}
              >
                🔄 {isActiveLoading ? t('app.loading') : t('app.refresh')}
              </button>
            </div>

            {activeError && (
              <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-300">
                {t(activeError)}
              </p>
            )}

            {isActiveLoading && !activeSnapshot && (
              <p className="py-8 text-center text-slate-400">{t('app.loading')}</p>
            )}

            {activeSnapshot && (
              <>
                <MainVerdictCard location={activeSnapshot.location} fusion={activeSnapshot.fusion} />
                <LiveTimelineCard hourly={activeSnapshot.fusion.hourly} location={activeSnapshot.location} />
                <LifeActionCards verdicts={activeSnapshot.verdicts} />
                <SourceJuryCard fusion={activeSnapshot.fusion} />
                <AirQualityCard airQuality={activeSnapshot.airQuality} />
              </>
            )}

            <AboutCard />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppInner />
    </SettingsProvider>
  );
}

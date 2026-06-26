import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LocationPermissionCard from '../components/LocationPermissionCard';
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
import type { NamedLocation, WeatherSnapshot } from '../weather/types';
import i18n from '../i18n';

function AppInner() {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const loadFor = useCallback(async (location: NamedLocation) => {
    setLoading(true);
    setErrorKey(null);
    try {
      const result = await getWeatherSnapshot(location);
      setSnapshot(result);
    } catch (err) {
      if (err instanceof AppError) setErrorKey(err.i18nKey);
      else if (err instanceof Error && err.message.startsWith('errors.')) {
        setErrorKey(err.message);
      } else {
        setErrorKey('errors.generic');
      }
      console.error('Where Weather load failed:', toMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUseMyLocation = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    try {
      const coords = await requestCurrentPosition();
      const named = await reverseGeocode(coords, i18n.language);
      await loadFor(named);
    } catch (err) {
      setErrorKey(err instanceof AppError ? err.i18nKey : 'errors.geolocationUnavailable');
      setLoading(false);
    }
  }, [loadFor]);

  const handleRefresh = useCallback(() => {
    if (snapshot) void loadFor(snapshot.location);
  }, [snapshot, loadFor]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {!snapshot && (
          <>
            <LocationPermissionCard
              loading={loading}
              onUseMyLocation={() => void handleUseMyLocation()}
              onPickLocation={(loc) => void loadFor(loc)}
            />
            {errorKey && (
              <p className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
                {t(errorKey)}
              </p>
            )}
          </>
        )}

        {snapshot && (
          <>
            <div className="flex items-center justify-end">
              <button type="button" className="ww-btn-ghost" onClick={handleRefresh} disabled={loading}>
                🔄 {loading ? t('app.loading') : t('app.refresh')}
              </button>
            </div>
            {errorKey && (
              <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-300">
                {t(errorKey)}
              </p>
            )}
            <MainVerdictCard location={snapshot.location} fusion={snapshot.fusion} />
            <LiveTimelineCard hourly={snapshot.fusion.hourly} location={snapshot.location} />
            <LifeActionCards verdicts={snapshot.verdicts} />
            <SourceJuryCard fusion={snapshot.fusion} />
            <AirQualityCard airQuality={snapshot.airQuality} />
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

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getCache, setCache, TTL } from '../lib/cache';
import type { TemperatureUnit, WindUnit } from '../lib/units';
import { SettingsContext, type Settings } from './settingsContext';

interface Persisted {
  temperatureUnit: TemperatureUnit;
  windUnit: WindUnit;
}

const KEY = 'settings';

function load(): Persisted {
  return getCache<Persisted>(KEY) ?? { temperatureUnit: 'celsius', windUnit: 'ms' };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>(
    initial.temperatureUnit,
  );
  const [windUnit, setWindUnit] = useState<WindUnit>(initial.windUnit);

  useEffect(() => {
    // TTL is effectively "forever" for preferences (~1 year).
    setCache<Persisted>(KEY, { temperatureUnit, windUnit }, TTL.GEOCODE * 365);
  }, [temperatureUnit, windUnit]);

  const value = useMemo<Settings>(
    () => ({ temperatureUnit, windUnit, setTemperatureUnit, setWindUnit }),
    [temperatureUnit, windUnit],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

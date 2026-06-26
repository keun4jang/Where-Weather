import { createContext } from 'react';
import type { TemperatureUnit, WindUnit } from '../lib/units';

export interface Settings {
  temperatureUnit: TemperatureUnit;
  windUnit: WindUnit;
  setTemperatureUnit: (u: TemperatureUnit) => void;
  setWindUnit: (u: WindUnit) => void;
}

export const SettingsContext = createContext<Settings | null>(null);

import { useContext } from 'react';
import { SettingsContext, type Settings } from './settingsContext';

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

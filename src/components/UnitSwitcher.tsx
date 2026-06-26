import { useTranslation } from 'react-i18next';
import { useSettings } from '../app/settings';
import type { TemperatureUnit, WindUnit } from '../lib/units';

function Segment<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl bg-white/10 p-0.5 ring-1 ring-white/15">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
            value === opt.value ? 'bg-brand-600 text-white' : 'text-slate-200 hover:bg-white/10'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function UnitSwitcher() {
  const { t } = useTranslation();
  const { temperatureUnit, windUnit, setTemperatureUnit, setWindUnit } = useSettings();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segment<TemperatureUnit>
        label={t('settings.temperature')}
        value={temperatureUnit}
        onChange={setTemperatureUnit}
        options={[
          { value: 'celsius', label: '°C' },
          { value: 'fahrenheit', label: '°F' },
        ]}
      />
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
    </div>
  );
}

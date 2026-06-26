export type ProviderId = 'open-meteo' | 'met-no';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NamedLocation extends Coordinates {
  name?: string;
  country?: string;
  admin1?: string;
  timezone?: string;
}

/** A single normalized "current conditions" snapshot from one provider. */
export interface NormalizedCurrent {
  /** ISO timestamp the observation/forecast is valid for. */
  time: string;
  /** Air temperature in Celsius. */
  temperatureC: number;
  /** Apparent (feels-like) temperature in Celsius. */
  apparentTemperatureC?: number;
  /** Relative humidity, 0-100. */
  humidity?: number;
  /** Wind speed in m/s. */
  windSpeedMs?: number;
  /** Wind gust in m/s. */
  windGustMs?: number;
  /** Probability of precipitation, 0-100. */
  precipitationProbability?: number;
  /** Precipitation amount in mm for the current hour. */
  precipitationMm?: number;
  /** UV index. */
  uvIndex?: number;
  /** Cloud cover, 0-100. */
  cloudCover?: number;
  /** WMO weather code. */
  weatherCode?: number;
  /** Whether it is daytime at the location. */
  isDay?: boolean;
}

export interface NormalizedHourly {
  time: string;
  temperatureC: number;
  precipitationProbability?: number;
  precipitationMm?: number;
  weatherCode?: number;
}

export interface ProviderResult {
  provider: ProviderId;
  current: NormalizedCurrent;
  hourly: NormalizedHourly[];
  fetchedAt: number;
}

export interface ProviderError {
  provider: ProviderId;
  message: string;
}

export interface AirQuality {
  time: string;
  pm25?: number;
  pm10?: number;
  ozone?: number;
  /** European AQI. */
  europeanAqi?: number;
  /** US AQI. */
  usAqi?: number;
  fetchedAt: number;
}

/** A fused metric: the agreed value plus a measure of source spread. */
export interface FusedMetric {
  value: number;
  /** Standard deviation across contributing sources (0 when a single source). */
  spread: number;
  /** Number of sources that contributed. */
  sourceCount: number;
}

export interface FusedCurrent {
  time: string;
  temperatureC: FusedMetric;
  apparentTemperatureC?: FusedMetric;
  humidity?: FusedMetric;
  windSpeedMs?: FusedMetric;
  windGustMs?: FusedMetric;
  precipitationProbability?: FusedMetric;
  precipitationMm?: FusedMetric;
  uvIndex?: FusedMetric;
  cloudCover?: FusedMetric;
  weatherCode?: number;
  isDay?: boolean;
}

export interface FusionOutput {
  current: FusedCurrent;
  hourly: NormalizedHourly[];
  /** Overall confidence 0-1 derived from source agreement and count. */
  confidence: number;
  /** Per-provider snapshots that contributed. */
  contributors: ProviderResult[];
  /** Providers that failed. */
  errors: ProviderError[];
}

export type VerdictLevel = 'good' | 'caution' | 'bad';

export interface Verdict {
  id: string;
  level: VerdictLevel;
  /** i18n key for the headline. */
  titleKey: string;
  /** i18n key for the detail line. */
  detailKey: string;
  /** Interpolation values for the i18n strings. */
  values?: Record<string, string | number>;
  icon: string;
}

export interface WeatherSnapshot {
  location: NamedLocation;
  fusion: FusionOutput;
  airQuality?: AirQuality;
  verdicts: Verdict[];
  generatedAt: number;
}

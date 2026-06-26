import type { AirQuality, FusionOutput, Verdict } from './types';
import { isPrecipitationCode } from './wmoCodes';

function metric(value: number | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Umbrella verdict from precipitation probability + amount + code. */
export function umbrellaVerdict(fusion: FusionOutput): Verdict {
  const prob = metric(fusion.current.precipitationProbability?.value);
  const mm = metric(fusion.current.precipitationMm?.value);
  const wet = isPrecipitationCode(fusion.current.weatherCode);

  let level: Verdict['level'] = 'good';
  let titleKey = 'verdict.umbrella.no.title';
  let detailKey = 'verdict.umbrella.no.detail';

  if (prob >= 60 || mm >= 1 || wet) {
    level = 'bad';
    titleKey = 'verdict.umbrella.yes.title';
    detailKey = 'verdict.umbrella.yes.detail';
  } else if (prob >= 30) {
    level = 'caution';
    titleKey = 'verdict.umbrella.maybe.title';
    detailKey = 'verdict.umbrella.maybe.detail';
  }

  return {
    id: 'umbrella',
    level,
    titleKey,
    detailKey,
    values: { probability: Math.round(prob) },
    icon: '☂️',
  };
}

/** Clothing advice based on apparent temperature. */
export function clothingVerdict(fusion: FusionOutput): Verdict {
  const temp = metric(
    fusion.current.apparentTemperatureC?.value ?? fusion.current.temperatureC.value,
  );

  let titleKey: string;
  let level: Verdict['level'] = 'good';
  let icon = '👕';

  if (temp <= 0) {
    titleKey = 'verdict.clothing.freezing.title';
    icon = '🧥';
    level = 'caution';
  } else if (temp <= 10) {
    titleKey = 'verdict.clothing.cold.title';
    icon = '🧥';
  } else if (temp <= 18) {
    titleKey = 'verdict.clothing.mild.title';
    icon = '🧶';
  } else if (temp <= 27) {
    titleKey = 'verdict.clothing.warm.title';
    icon = '👕';
  } else {
    titleKey = 'verdict.clothing.hot.title';
    icon = '🩳';
    level = 'caution';
  }

  return {
    id: 'clothing',
    level,
    titleKey,
    detailKey: 'verdict.clothing.detail',
    values: { temperature: Math.round(temp) },
    icon,
  };
}

/** Laundry / drying outdoors: needs low precip and decent dryness. */
export function laundryVerdict(fusion: FusionOutput): Verdict {
  const prob = metric(fusion.current.precipitationProbability?.value);
  const humidity = metric(fusion.current.humidity?.value, 50);
  const wet = isPrecipitationCode(fusion.current.weatherCode);

  let level: Verdict['level'] = 'good';
  let titleKey = 'verdict.laundry.good.title';

  if (prob >= 50 || wet) {
    level = 'bad';
    titleKey = 'verdict.laundry.bad.title';
  } else if (prob >= 25 || humidity >= 80) {
    level = 'caution';
    titleKey = 'verdict.laundry.fair.title';
  }

  return {
    id: 'laundry',
    level,
    titleKey,
    detailKey: 'verdict.laundry.detail',
    values: { humidity: Math.round(humidity) },
    icon: '🧺',
  };
}

/** Running conditions: temperature comfort + wind + precipitation + UV. */
export function runningVerdict(fusion: FusionOutput): Verdict {
  const temp = metric(
    fusion.current.apparentTemperatureC?.value ?? fusion.current.temperatureC.value,
  );
  const wind = metric(fusion.current.windSpeedMs?.value);
  const prob = metric(fusion.current.precipitationProbability?.value);
  const uv = metric(fusion.current.uvIndex?.value);

  let level: Verdict['level'] = 'good';
  let titleKey = 'verdict.running.good.title';

  const tooHot = temp >= 30;
  const tooCold = temp <= -5;
  const windy = wind >= 10;
  const rainy = prob >= 60;
  const highUv = uv >= 8;

  if (tooHot || tooCold || rainy || wind >= 14) {
    level = 'bad';
    titleKey = 'verdict.running.bad.title';
  } else if (windy || prob >= 30 || highUv || temp >= 27 || temp <= 0) {
    level = 'caution';
    titleKey = 'verdict.running.fair.title';
  }

  return {
    id: 'running',
    level,
    titleKey,
    detailKey: 'verdict.running.detail',
    values: { temperature: Math.round(temp), wind: Math.round(wind) },
    icon: '🏃',
  };
}

/** Commute: combines precipitation, wind gusts and visibility-ish (fog codes). */
export function commuteVerdict(fusion: FusionOutput): Verdict {
  const prob = metric(fusion.current.precipitationProbability?.value);
  const gust = metric(fusion.current.windGustMs?.value, metric(fusion.current.windSpeedMs?.value));
  const code = fusion.current.weatherCode;
  const foggy = code === 45 || code === 48;
  const stormy = code !== undefined && code >= 95;

  let level: Verdict['level'] = 'good';
  let titleKey = 'verdict.commute.good.title';

  if (stormy || gust >= 17 || prob >= 70) {
    level = 'bad';
    titleKey = 'verdict.commute.bad.title';
  } else if (foggy || gust >= 11 || prob >= 40) {
    level = 'caution';
    titleKey = 'verdict.commute.fair.title';
  }

  return {
    id: 'commute',
    level,
    titleKey,
    detailKey: 'verdict.commute.detail',
    icon: '🚗',
  };
}

/** Air quality verdict (European AQI scale). */
export function airQualityVerdict(aq: AirQuality | undefined): Verdict | null {
  if (!aq || (aq.europeanAqi === undefined && aq.usAqi === undefined)) return null;
  const aqi = aq.europeanAqi ?? aq.usAqi ?? 0;

  let level: Verdict['level'] = 'good';
  let titleKey = 'verdict.air.good.title';

  if (aqi > 80) {
    level = 'bad';
    titleKey = 'verdict.air.bad.title';
  } else if (aqi > 40) {
    level = 'caution';
    titleKey = 'verdict.air.fair.title';
  }

  return {
    id: 'air',
    level,
    titleKey,
    detailKey: 'verdict.air.detail',
    values: { aqi: Math.round(aqi) },
    icon: '🌬️',
  };
}

export function buildVerdicts(fusion: FusionOutput, aq?: AirQuality): Verdict[] {
  const verdicts: Verdict[] = [
    umbrellaVerdict(fusion),
    clothingVerdict(fusion),
    laundryVerdict(fusion),
    runningVerdict(fusion),
    commuteVerdict(fusion),
  ];
  const air = airQualityVerdict(aq);
  if (air) verdicts.push(air);
  return verdicts;
}

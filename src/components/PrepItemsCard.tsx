import { useTranslation } from 'react-i18next';
import type { FusionOutput, AirQuality } from '../weather/types';

interface PrepItem {
  emoji: string;
  labelKey: string;
  reason?: string;
}

function buildItems(fusion: FusionOutput, airQuality?: AirQuality): PrepItem[] {
  const c = fusion.current;
  const precip = c.precipitationProbability?.value ?? 0;
  const temp = c.temperatureC.value;
  const feels = c.apparentTemperatureC?.value ?? temp;
  const uv = c.uvIndex?.value ?? 0;
  const pm25 = airQuality?.pm25;
  const pm10 = airQuality?.pm10;
  const items: PrepItem[] = [];

  // 우산 / 양산
  if (precip >= 60) {
    items.push({ emoji: '☂️', labelKey: 'prep.umbrella', reason: `강수확률 ${Math.round(precip)}%` });
  } else if (precip >= 30) {
    items.push({ emoji: '🌂', labelKey: 'prep.umbrellaJustInCase', reason: `강수확률 ${Math.round(precip)}%` });
  } else if (uv >= 7) {
    items.push({ emoji: '☂️', labelKey: 'prep.parasol', reason: `자외선 ${Math.round(uv)}` });
  } else {
    items.push({ emoji: '✅', labelKey: 'prep.noUmbrella' });
  }

  // 자외선 차단제
  if (uv >= 6) {
    items.push({ emoji: '🧴', labelKey: 'prep.sunscreen', reason: `UV ${Math.round(uv)}` });
  }

  // 마스크 (미세먼지)
  if (pm25 !== undefined && pm25 >= 75) {
    items.push({ emoji: '😷', labelKey: 'prep.maskBad', reason: `PM2.5 ${Math.round(pm25)}µg` });
  } else if (pm25 !== undefined && pm25 >= 35) {
    items.push({ emoji: '😷', labelKey: 'prep.maskModerate', reason: `PM2.5 ${Math.round(pm25)}µg` });
  } else if (pm10 !== undefined && pm10 >= 150) {
    items.push({ emoji: '😷', labelKey: 'prep.maskBad', reason: `PM10 ${Math.round(pm10)}µg` });
  }

  // 옷차림
  if (feels < 0) {
    items.push({ emoji: '🧤', labelKey: 'prep.gloves', reason: `체감 ${Math.round(feels)}°` });
    items.push({ emoji: '🧣', labelKey: 'prep.scarf' });
  } else if (feels < 10) {
    items.push({ emoji: '🧥', labelKey: 'prep.heavyCoat', reason: `체감 ${Math.round(feels)}°` });
  } else if (feels < 17) {
    items.push({ emoji: '🧣', labelKey: 'prep.lightJacket', reason: `체감 ${Math.round(feels)}°` });
  } else if (feels >= 30) {
    items.push({ emoji: '🩳', labelKey: 'prep.lightClothes', reason: `체감 ${Math.round(feels)}°` });
    items.push({ emoji: '💧', labelKey: 'prep.water' });
  }

  return items;
}

export default function PrepItemsCard({ fusion, airQuality }: { fusion: FusionOutput; airQuality?: AirQuality }) {
  const { t } = useTranslation();
  const items = buildItems(fusion, airQuality);
  if (items.length === 0) return null;

  return (
    <section className="ww-card">
      <h3 className="mb-2 text-sm font-bold">{t('prep.title')}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1.5 text-xs"
          >
            <span className="text-base">{item.emoji}</span>
            <div>
              <div className="font-medium">{t(item.labelKey)}</div>
              {item.reason && <div className="text-slate-400 text-[10px]">{item.reason}</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

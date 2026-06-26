# Data sources

All sources are free and require no API key for this MVP.

## Open-Meteo — forecast
- Endpoint: `https://api.open-meteo.com/v1/forecast`
- Used for: current conditions + 48 h hourly forecast.
- License: CC BY 4.0. Attribution: "Weather data by Open-Meteo.com".
- No key required. Generous free tier.

## Open-Meteo — air quality
- Endpoint: `https://air-quality-api.open-meteo.com/v1/air-quality`
- Used for: PM2.5, PM10, ozone, European & US AQI.

## Open-Meteo — geocoding
- Endpoint: `https://geocoding-api.open-meteo.com/v1/search`
- Used for: city name → coordinates (forward geocoding).

## BigDataCloud — reverse geocoding
- Endpoint: `https://api.bigdatacloud.net/data/reverse-geocode-client`
- Used for: labeling GPS coordinates with a place name. Free client-side tier.
- Failure is non-fatal; the app falls back to showing coordinates.

## MET Norway (optional) — Locationforecast 2.0
- Endpoint: `https://api.met.no/weatherapi/locationforecast/2.0/compact`
- Requires an identifying `User-Agent`, which browsers cannot set, so it is
  proxied via `functions/api/metno.ts` (Cloudflare Pages) and enabled only when
  `VITE_METNO_PROXY_URL` is configured.
- License: NLOD / CC BY 4.0. Attribution: "Data from MET Norway".

## Normalization

Internally everything is normalized to: temperature °C, wind m/s, precipitation
mm, probabilities and humidity 0–100. Conversions happen only at display time
(`src/lib/units.ts`). Provider weather codes are mapped to WMO codes
(`src/weather/wmoCodes.ts`).

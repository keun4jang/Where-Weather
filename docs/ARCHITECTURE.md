# Architecture

Where Weather is a static, client-only PWA. There is no backend (the optional
MET Norway proxy is a thin serverless function, not application state).

## Data flow

```
User gesture (Use my location / city search)
        │
        ▼
location/geolocation.ts ──► location/geocoding.ts   (coords → named place)
        │
        ▼
weather/providers.ts                 (orchestrator)
        │  parallel fetch, fail-soft per provider
        ├── weather/openMeteoClient.ts ─────────┐
        ├── weather/metNoClient.ts (optional) ──┤ ProviderResult[] (normalized)
        └── weather/openMeteoAirQualityClient.ts┘
        │
        ▼
weather/normalize.ts   (units → Celsius / m·s⁻¹ / mm; build hourly)
        │
        ▼
weather/fusion.ts      (weighted median + spread + confidence)
        │
        ▼
weather/verdict.ts     (umbrella / clothing / laundry / running / commute / air)
        │
        ▼
React components (src/components/*) render WeatherSnapshot
```

## Layers

- **Pure logic** (`weather/fusion.ts`, `weather/verdict.ts`, `weather/wmoCodes.ts`,
  `lib/units.ts`): no I/O, fully unit-tested.
- **I/O** (`weather/*Client.ts`, `location/*`): fetch + normalization, fail-soft.
- **State** (`app/settings.tsx`): React context for unit preferences, persisted
  to localStorage.
- **Presentation** (`components/*`): stateless rendering of a `WeatherSnapshot`.

## Fusion

Each numeric metric is combined with a weighted median (equal weights today, but
the structure supports per-provider weighting). We compute the standard
deviation across sources as a "spread", and an overall `confidence` in `[0,1]`
from source count and normalized agreement. `verification.ts` classifies the
result as `verified` / `disputed` / `single-source`.

## Caching & offline

- `lib/cache.ts` wraps localStorage with TTL (weather 5 min, air quality 30 min,
  geocode 24 h). Stale entries are used as a last-resort fallback when all
  providers fail.
- `vite-plugin-pwa` (Workbox) provides a service worker with `NetworkFirst`
  runtime caching for the weather APIs, enabling offline reloads.

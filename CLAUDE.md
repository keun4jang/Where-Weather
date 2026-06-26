# CLAUDE.md

Guidance for working in this repository.

## What this is

"Where Weather" — a Vite + React + TypeScript PWA that fuses multiple free
weather sources into one honest verdict. No backend, no paid APIs, no tracking.

## Commands

- `npm run dev` — dev server
- `npm run quality` — the gate: typecheck + lint + test + build. Run before committing.
- `npm run test` — Vitest unit tests
- `npm run version:bump [major|minor|patch]` then it auto-syncs generated files

## Architecture map

- `src/weather/` — pure logic. `providers.ts` orchestrates fetch → `fuse()` →
  `buildVerdicts()`. Keep fusion/verdict logic pure and unit-tested.
- `src/location/` — geolocation (explicit gesture only) + geocoding.
- `src/lib/` — units, time, number, cache (localStorage + TTL), errors.
- `src/components/` — presentational React. Settings via `src/app/settings.tsx`.
- `src/i18n/` — i18next; every locale must have identical key coverage to `en.json`.
- `src/generated/appVersion.ts` — AUTO-GENERATED. Never edit by hand; run `version:sync`.

## Conventions

- Strict TypeScript; lint runs with `--max-warnings 0`.
- All user-facing strings go through i18n keys. Add new keys to `en.json` first.
- Weather units are normalized internally (Celsius, m/s, mm) and converted only at display time.
- GPS must only be requested from an explicit user click (privacy requirement).
- Cache TTLs: weather 5 min, air quality 30 min (see `src/lib/cache.ts`).

## Adding a weather provider

1. Add a client in `src/weather/` returning a `ProviderResult` (normalized units).
2. Register it in `providers.ts`.
3. Fusion and verdicts work automatically; add tests in `src/tests/`.

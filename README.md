# Where Weather

A free, multilingual, installable **PWA** that fuses multiple free weather
sources into a single honest verdict for where you are — and tells you when the
sources disagree.

- 🌍 12 languages (incl. RTL Arabic)
- 🤝 Multi-source fusion (Open-Meteo + optional MET Norway) with a confidence meter
- ☂️ Life-action verdicts: umbrella, clothing, laundry, running, commute, air quality
- 🔒 Privacy-first: GPS only on explicit tap, location never stored or sent anywhere but the weather APIs
- 📴 Offline-capable via service worker caching
- 💸 No accounts, no ads, no paid APIs, no backend required

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check then build for production |
| `npm run preview` | Preview the production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | Lint with ESLint (zero warnings allowed) |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | Type-check without emitting |
| `npm run quality` | typecheck + lint + test + build |
| `npm run version:bump` | Bump semver (`patch` default) |
| `npm run version:sync` | Regenerate version files from package.json |
| `npm run setup:hooks` | Point git at `.githooks` |
| `npm run check:name` | Best-effort name availability report |

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). In short:
`location → providers (parallel fetch) → normalize → fuse (weighted median +
confidence) → verdicts → UI`.

## Data sources

Open-Meteo (forecast + air quality) and, optionally, MET Norway via a proxy.
See [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## License

Free and open. Built with open weather data.

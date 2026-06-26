# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-26

### Added

- Initial MVP of Where Weather.
- Vite + React + TypeScript + Tailwind + PWA scaffolding.
- Multi-source weather fusion (Open-Meteo, optional MET Norway) with weighted
  median, source-spread and confidence scoring.
- Life-action verdicts: umbrella, clothing, laundry, running, commute, air quality.
- Live hourly timeline and source jury cards.
- 12 languages with i18next (incl. RTL Arabic).
- Celsius/Fahrenheit and m/s · km/h · mph unit switching, persisted locally.
- Privacy-first geolocation (explicit gesture) and city search.
- localStorage caching with TTLs (weather 5 min, air quality 30 min).
- Versioning scripts, name-availability checker, and pre-commit hook.
- Unit tests for fusion, verdicts, units, and WMO codes.

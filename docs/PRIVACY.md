# Privacy

Where Weather is designed to collect as little as possible.

## Location

- GPS is **only** requested when you explicitly tap "Use my location". The app
  never requests it automatically on load.
- Your coordinates are sent only to the weather and geocoding APIs needed to
  produce a forecast. They are never sent to us (there is no "us" server) and
  never sold or shared.
- Coordinates are cached locally (in your browser's `localStorage`) only to avoid
  refetching and to label the place name. Clearing site data removes them.

## No accounts, no analytics, no ads

- No sign-in, no cookies for tracking, no third-party analytics, no advertising.

## Local storage usage

- `ww:lang` — your chosen language.
- `ww:settings` — your unit preferences.
- `ww:wx:*`, `ww:aq:*`, `ww:geo:*` — short-lived cached API responses (TTL-based).

## Third parties

Requests go directly from your browser to: Open-Meteo, BigDataCloud (reverse
geocoding), and optionally a MET Norway proxy you control. See
[`DATA_SOURCES.md`](DATA_SOURCES.md). Those services receive the request as any
website fetch would (IP + the coordinates you searched/shared).

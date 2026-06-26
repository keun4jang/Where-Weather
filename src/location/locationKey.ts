import type { NamedLocation } from '../weather/types';

export function locationKey(loc: NamedLocation) {
  return `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;
}

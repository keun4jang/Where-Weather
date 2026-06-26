import { GeolocationError } from '../lib/errors';
import type { Coordinates } from '../weather/types';

/**
 * Requests the user's current position. MUST only be called from an explicit
 * user gesture (button click) — never automatically.
 */
export function requestCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new GeolocationError('errors.geolocationUnsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new GeolocationError('errors.geolocationDenied'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new GeolocationError('errors.geolocationUnavailable'));
            break;
          case error.TIMEOUT:
            reject(new GeolocationError('errors.geolocationTimeout'));
            break;
          default:
            reject(new GeolocationError('errors.geolocationUnavailable'));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

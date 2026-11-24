/** Small app-wide preferences stored in localStorage. */

const AUTO_LOCATE_KEY = 'autoLocate';

/** Start on the current GPS location at launch (after permission was granted once). */
export function getAutoLocate(): boolean {
  try { return localStorage.getItem(AUTO_LOCATE_KEY) !== 'false'; } catch { return true; }
}

export function setAutoLocate(on: boolean): void {
  try { localStorage.setItem(AUTO_LOCATE_KEY, on ? 'true' : 'false'); } catch { /* */ }
}

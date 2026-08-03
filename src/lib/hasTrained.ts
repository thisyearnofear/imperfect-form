/**
 * Synchronous "has ever trained" flag.
 *
 * useXpProgress computes XP asynchronously (IndexedDB), so derived chrome
 * (day-0 foyer vs earned tabbed shell) would otherwise flash the day-0 view
 * for returning users on first paint — a screen that lasts a second or two
 * and makes no sense. This flag is written the moment the first workout
 * saves and read synchronously to pick the initial chrome. Async XP stays
 * the source of truth afterward (XP never decreases, so the flag only
 * ever needs to turn on).
 */
export const HAS_TRAINED_KEY = 'imf_hasTrained';

export function getHasTrained(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(HAS_TRAINED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHasTrained(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HAS_TRAINED_KEY, '1');
  } catch {
    // Storage full/blocked — non-fatal; chrome falls back to async XP.
  }
}

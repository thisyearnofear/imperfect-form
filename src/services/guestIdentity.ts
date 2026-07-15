/**
 * Guest identity - the key that makes the core loop wallet-free (Ring 0).
 *
 * Every user gets a stable local ID so PBs, XP, streaks, and ghosts work
 * without any sign-in. When a wallet connects later, guest workouts merge
 * into the address (see migrateGuestWorkouts in WorkoutDataAdapter).
 */

const GUEST_ID_KEY = 'imf_guestId';

export function getGuestId(): string {
  if (typeof window === 'undefined') return 'guest';
  let id = window.localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `guest-${crypto.randomUUID()}`
        : `guest-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

/** Wallet address when connected, stable guest ID otherwise. */
export function getEffectiveUserId(address?: string | null): string {
  return address || getGuestId();
}

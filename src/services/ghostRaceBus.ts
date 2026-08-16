/**
 * One-shot handoff for "race my own ghost" requests that originate outside
 * the workout tab (e.g. the challenges tab's Start ghost race button).
 *
 * The Game component mounts lazily with the workout tab, so a plain window
 * event can fire before its listener exists. The requester parks the intent
 * here and switches tabs; Game consumes it on mount. Live events (e.g. the
 * leaderboard's raceGhost dispatch while Game is mounted) are unaffected.
 */

let pendingSelfRaceMode: string | null = null;

export function requestSelfRace(mode: string): void {
  pendingSelfRaceMode = mode;
}

export function consumePendingSelfRace(): string | null {
  const mode = pendingSelfRaceMode;
  pendingSelfRaceMode = null;
  return mode;
}

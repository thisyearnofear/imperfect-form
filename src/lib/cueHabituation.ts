/**
 * Cue habituation — escalate, then back off.
 *
 * A repeated form cue should not sound identical at rep 12 as at rep 1. The
 * coach names a correction once in full, shortens it the second time, then
 * goes quiet (display-only) while the issue persists. When the issue clears
 * (form improved), the count resets so a genuine recurrence gets a fresh,
 * full-voice cue again.
 *
 * Pure and session-scoped: no storage, no timers. The caller owns the state
 * object for the lifetime of one session and passes it back on every call.
 */

export type CueTier = 'full' | 'short' | 'silent';

export interface CueHabituationEntry {
  /** How many times this issue has been voiced this session. */
  voicedCount: number;
}

export type CueHabituationState = Record<string, CueHabituationEntry>;

export interface CueDelivery {
  /** Whether the cue should be spoken aloud. */
  voice: boolean;
  /** The phrase to surface (full or shortened). */
  phrase: string;
  /** The tier that was applied (useful for tests + instrumentation). */
  tier: CueTier;
  /** Updated state — assign this back to the session state. */
  state: CueHabituationState;
}

/** Number of voiced occurrences before the coach goes quiet on an issue. */
export const SILENCE_AFTER_VOICED = 2;

/**
 * Decide how to deliver a cue for `issueType` right now.
 *
 * - 1st voiced occurrence → full phrase, voice on
 * - 2nd voiced occurrence → short phrase (falls back to full), voice on
 * - 3rd+ occurrence       → display-only, voice off
 *
 * `shortPhrase` is optional; when absent the second occurrence repeats the
 * full phrase (still voiced) rather than inventing copy.
 */
export function decideCueDelivery(
  issueType: string,
  phrase: string,
  state: CueHabituationState,
  shortPhrase?: string
): CueDelivery {
  const entry = state[issueType] ?? { voicedCount: 0 };
  const nextCount = entry.voicedCount + 1;
  const nextState: CueHabituationState = {
    ...state,
    [issueType]: { voicedCount: nextCount },
  };

  if (nextCount === 1) {
    return { voice: true, phrase, tier: 'full', state: nextState };
  }
  if (nextCount === SILENCE_AFTER_VOICED) {
    return {
      voice: true,
      phrase: shortPhrase?.trim() ? shortPhrase : phrase,
      tier: 'short',
      state: nextState,
    };
  }
  // Persisted but not re-voiced: the tray still shows the cue, the voice rests.
  return {
    voice: false,
    phrase: shortPhrase?.trim() ? shortPhrase : phrase,
    tier: 'silent',
    state: nextState,
  };
}

/**
 * Mark an issue as cleared (form improved or the user moved on). Resets its
 * voiced count so a genuine recurrence later is treated as a first occurrence.
 * Call this on frames where the issue is no longer present.
 */
export function clearIssueHabituation(
  issueType: string,
  state: CueHabituationState
): CueHabituationState {
  if (!(issueType in state)) return state;
  const next = { ...state };
  delete next[issueType];
  return next;
}

/** Reset all habituation (new session). */
export function createCueHabituationState(): CueHabituationState {
  return {};
}

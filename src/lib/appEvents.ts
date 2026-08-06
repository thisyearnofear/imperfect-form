/**
 * Application-wide custom events.
 * Keep event names in one place to avoid typos and make them discoverable.
 */
export const SESSION_STARTED_EVENT = 'imf:session-started' as const;
export const COACH_CUE_EVENT = 'imf:coach-cue' as const;
export const TOGGLE_AUTH_DEBUG_EVENT = 'imf:toggle-auth-debug' as const;

export interface CoachCueDetail {
  issue: string;
  phrase: string;
  mode: string;
}

export function emitCoachCue(detail: CoachCueDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CoachCueDetail>(COACH_CUE_EVENT, { detail }));
}

declare global {
  interface WindowEventMap {
    [SESSION_STARTED_EVENT]: CustomEvent;
    [COACH_CUE_EVENT]: CustomEvent<CoachCueDetail>;
    [TOGGLE_AUTH_DEBUG_EVENT]: CustomEvent;
  }
}

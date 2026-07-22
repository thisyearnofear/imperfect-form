/**
 * Application-wide custom events.
 * Keep event names in one place to avoid typos and make them discoverable.
 */
export const SESSION_STARTED_EVENT = 'imf:session-started' as const;
export const TOGGLE_AUTH_DEBUG_EVENT = 'imf:toggle-auth-debug' as const;

declare global {
  interface WindowEventMap {
    [SESSION_STARTED_EVENT]: CustomEvent;
    [TOGGLE_AUTH_DEBUG_EVENT]: CustomEvent;
  }
}

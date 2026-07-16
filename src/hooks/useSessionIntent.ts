'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SESSION_INTENT,
  parseSessionIntent,
  registerForIntent,
  SESSION_INTENT_KEY,
  type AestheticRegister,
  type SessionIntent,
} from '@/lib/brandPositioning';

/**
 * Session intent (Coach / Train / Breathe) — persisted, default Coach (Studio).
 * Day-0 doorway is CoachFoyer; Train/Breathe are earned or post-set paths.
 * Not a gate: START always works. Syncs across tabs via storage + same-tab custom event.
 */
export function useSessionIntent() {
  const [intent, setIntentState] = useState<SessionIntent>(DEFAULT_SESSION_INTENT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIntentState(parseSessionIntent(localStorage.getItem(SESSION_INTENT_KEY)));
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_INTENT_KEY) {
        setIntentState(parseSessionIntent(e.newValue));
      }
    };
    const onLocal = () => {
      setIntentState(parseSessionIntent(localStorage.getItem(SESSION_INTENT_KEY)));
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('imf:session-intent', onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('imf:session-intent', onLocal);
    };
  }, []);

  const setIntent = useCallback((next: SessionIntent) => {
    // No-op when unchanged — avoids localStorage + event thrash on foyer remounts.
    if (typeof window !== 'undefined' && localStorage.getItem(SESSION_INTENT_KEY) === next) {
      setIntentState((prev) => (prev === next ? prev : next));
      return;
    }
    localStorage.setItem(SESSION_INTENT_KEY, next);
    setIntentState(next);
    window.dispatchEvent(new Event('imf:session-intent'));
  }, []);

  const register: Exclude<AestheticRegister, 'lab'> = registerForIntent(intent);

  return { intent, setIntent, register, hydrated };
}

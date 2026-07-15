'use client';

import { useCallback, useEffect, useState } from 'react';
import { CoachPersonality, getDefaultPersonality } from '@/lib/coachPersonalities';

const STORAGE_KEY = 'coachPersonality';
const CHANGE_EVENT = 'coach-personality-change';

function isPersonality(value: string | null): value is CoachPersonality {
  return value === 'SNEL' || value === 'STEDDIE' || value === 'RASTA';
}

/**
 * Persisted coach persona selection. All mounted consumers stay in sync via
 * a window event, so changing the coach in Settings updates live coaching
 * and the post-workout report without a reload.
 */
export function useCoachPersonality(): [CoachPersonality, (p: CoachPersonality) => void] {
  const [personality, setPersonalityState] = useState<CoachPersonality>(getDefaultPersonality());

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPersonality(stored)) {
      setPersonalityState(stored);
    }

    const onChange = (event: Event) => {
      const next = (event as CustomEvent<CoachPersonality>).detail;
      if (isPersonality(next)) {
        setPersonalityState(next);
      }
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  const setPersonality = useCallback((p: CoachPersonality) => {
    setPersonalityState(p);
    window.localStorage.setItem(STORAGE_KEY, p);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: p }));
  }, []);

  return [personality, setPersonality];
}

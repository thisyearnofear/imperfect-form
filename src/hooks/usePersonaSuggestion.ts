'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCoachPersonality } from '@/hooks/useCoachPersonality';
import type { CoachPersonality } from '@/lib/coachPersonalities';
import {
  createPersonaSuggestionState,
  decidePersonaSuggestion,
  sessionTempo,
  type PersonaSuggestionState,
} from '@/lib/personaTempo';

const STORAGE_KEY = 'imf_personaTempo';

function loadState(): PersonaSuggestionState {
  if (typeof window === 'undefined') return createPersonaSuggestionState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createPersonaSuggestionState();
    const parsed = JSON.parse(raw) as Partial<PersonaSuggestionState>;
    return {
      samples: Array.isArray(parsed.samples) ? parsed.samples : [],
      dismissed: Array.isArray(parsed.dismissed) ? parsed.dismissed : [],
    };
  } catch {
    return createPersonaSuggestionState();
  }
}

function saveState(state: PersonaSuggestionState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage blocked — non-fatal
  }
}

/**
 * Tempo-based persona suggestion.
 *
 * Call `recordSession(repTimestamps)` when a session ends; after enough
 * sessions with a consistent tempo that mismatches the current persona,
 * `suggestion` becomes non-null. `dismissSuggestion()` records the persona so
 * it is never suggested again. Everything persists across visits.
 */
export function usePersonaSuggestion() {
  const [personality] = useCoachPersonality();
  const [suggestion, setSuggestion] = useState<CoachPersonality | null>(null);

  // Re-evaluate on mount in case prior sessions already crossed the threshold.
  useEffect(() => {
    const state = loadState();
    const decision = decidePersonaSuggestion(personality, null, state);
    setSuggestion(decision.suggest);
  }, [personality]);

  const recordSession = useCallback(
    (repTimestamps: number[]) => {
      const tempo = sessionTempo(repTimestamps);
      const state = loadState();
      const decision = decidePersonaSuggestion(personality, tempo, state);
      saveState(decision.state);
      setSuggestion(decision.suggest);
    },
    [personality]
  );

  const dismissSuggestion = useCallback(() => {
    if (!suggestion) return;
    const state = loadState();
    saveState({
      ...state,
      dismissed: state.dismissed.includes(suggestion)
        ? state.dismissed
        : [...state.dismissed, suggestion],
    });
    setSuggestion(null);
  }, [suggestion]);

  return { suggestion, recordSession, dismissSuggestion };
}

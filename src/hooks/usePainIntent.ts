'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getPainIntent,
  parsePainIntent,
  PAIN_INTENT_KEY,
  type PainIntent,
  type PainIntentId,
} from '@/lib/painIntents';
import { NIGGLE_KEY, parseStoredNiggle, resolveNiggleIntent } from '@/lib/niggleIntents';

const LOCAL_EVENT = 'imf:pain-intent';
const NIGGLE_EVENT = 'imf:niggle';

/**
 * Pain intent ("What brings you here?") — persisted, default none. Syncs
 * across tabs via storage events and same-tab via a custom event, mirroring
 * useSessionIntent. Selecting a chip never gates START.
 *
 * Resolution order: a stored niggle intake (joint → context, the
 * Niggleometer doorway) wins over a legacy pain-intent chip, so every
 * consumer of this hook — primer, first-rep line, recap — follows the
 * niggle without each needing its own plumbing.
 */
export function usePainIntent() {
  const [painIntentId, setPainIntentId] = useState<PainIntentId | null>(null);
  const [niggleRaw, setNiggleRaw] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPainIntentId(parsePainIntent(localStorage.getItem(PAIN_INTENT_KEY)));
    setNiggleRaw(localStorage.getItem(NIGGLE_KEY));
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === PAIN_INTENT_KEY) {
        setPainIntentId(parsePainIntent(e.newValue));
      } else if (e.key === NIGGLE_KEY) {
        setNiggleRaw(e.newValue);
      }
    };
    const onLocal = () => {
      setPainIntentId(parsePainIntent(localStorage.getItem(PAIN_INTENT_KEY)));
    };
    const onNiggle = () => {
      setNiggleRaw(localStorage.getItem(NIGGLE_KEY));
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal);
    window.addEventListener(NIGGLE_EVENT, onNiggle);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal);
      window.removeEventListener(NIGGLE_EVENT, onNiggle);
    };
  }, []);

  const setPainIntent = useCallback((id: PainIntentId | null) => {
    if (id) localStorage.setItem(PAIN_INTENT_KEY, id);
    else localStorage.removeItem(PAIN_INTENT_KEY);
    setPainIntentId(id);
    window.dispatchEvent(new Event(LOCAL_EVENT));
  }, []);

  const painIntent: PainIntent | null =
    resolveNiggleIntent(parseStoredNiggle(niggleRaw)) ?? getPainIntent(painIntentId);

  return { painIntent, painIntentId, setPainIntent, hydrated };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getPainIntent,
  parsePainIntent,
  PAIN_INTENT_KEY,
  type PainIntent,
  type PainIntentId,
} from '@/lib/painIntents';

const LOCAL_EVENT = 'imf:pain-intent';

/**
 * Pain intent ("What brings you here?") — persisted, default none. Syncs
 * across tabs via storage events and same-tab via a custom event, mirroring
 * useSessionIntent. Selecting a chip never gates START.
 */
export function usePainIntent() {
  const [painIntentId, setPainIntentId] = useState<PainIntentId | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPainIntentId(parsePainIntent(localStorage.getItem(PAIN_INTENT_KEY)));
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === PAIN_INTENT_KEY) {
        setPainIntentId(parsePainIntent(e.newValue));
      }
    };
    const onLocal = () => {
      setPainIntentId(parsePainIntent(localStorage.getItem(PAIN_INTENT_KEY)));
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }, []);

  const setPainIntent = useCallback((id: PainIntentId | null) => {
    if (id) localStorage.setItem(PAIN_INTENT_KEY, id);
    else localStorage.removeItem(PAIN_INTENT_KEY);
    setPainIntentId(id);
    window.dispatchEvent(new Event(LOCAL_EVENT));
  }, []);

  const painIntent: PainIntent | null = getPainIntent(painIntentId);

  return { painIntent, painIntentId, setPainIntent, hydrated };
}

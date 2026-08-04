'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Immersive mode — opt-in "full Sandow" experience, default OFF.
 *
 * Default experience: quiet, implicit, motif-led. The verbose Sandow
 * storytelling (lineage stamps, "Calibrating the gauge," "Graded vs. Sandow
 * 1897," the full provenance scroll) lives behind this toggle for users who
 * want the full heritage experience. Nothing is deleted — the loud version
 * becomes opt-in; the default becomes the whisper.
 *
 * Persisted in localStorage as `imf_immersive`. Syncs across tabs.
 */
const IMMERSIVE_KEY = 'imf_immersive';

export function useImmersive() {
  const [immersive, setImmersiveState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setImmersiveState(localStorage.getItem(IMMERSIVE_KEY) === '1');
    } catch {
      // storage blocked — non-fatal, stays off
    }
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === IMMERSIVE_KEY) {
        setImmersiveState(e.newValue === '1');
      }
    };
    const onLocal = () => {
      try {
        setImmersiveState(localStorage.getItem(IMMERSIVE_KEY) === '1');
      } catch {
        // ignore
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('imf:immersive', onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('imf:immersive', onLocal);
    };
  }, []);

  const setImmersive = useCallback((next: boolean) => {
    try {
      localStorage.setItem(IMMERSIVE_KEY, next ? '1' : '0');
      setImmersiveState(next);
      window.dispatchEvent(new Event('imf:immersive'));
    } catch {
      // storage blocked — non-fatal, state still updates in-memory
      setImmersiveState(next);
    }
  }, []);

  return { immersive, setImmersive, hydrated };
}

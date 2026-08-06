'use client';

import { useState, useCallback, useRef } from 'react';
import { useHapticFeedback } from './useHapticFeedback';
import { shouldCelebrateFirstSignal } from '@/lib/firstSignal';

export interface RepFeedback {
  show: boolean;
  count: number;
}

export interface UseRepCounterReturn {
  repCount: number;
  repFeedback: RepFeedback;
  onRepDetected: (count: number) => void;
  resetReps: () => void;
}

/**
 * Manages rep counting, visual feedback, and haptic feedback.
 * Accepts an optional callback for side-effects (analytics, timer start).
 */
export function useRepCounter(
  onFirstRep?: () => void,
  onRepUpdate?: (count: number, mode: string) => void,
  started?: boolean,
  mode?: string
): UseRepCounterReturn {
  const [repCount, setRepCount] = useState(0);
  const [repFeedback, setRepFeedback] = useState<RepFeedback>({ show: false, count: 0 });
  const { triggerRepFeedback } = useHapticFeedback();
  const prevCountRef = useRef(0);

  const onRepDetected = useCallback(
    (count: number) => {
      const prevCount = prevCountRef.current;
      prevCountRef.current = count;
      setRepCount(count);

      if (count > prevCount && count > 0) {
        triggerRepFeedback();
        setRepFeedback({ show: true, count });
        setTimeout(() => setRepFeedback((prev) => ({ ...prev, show: false })), 1000);
      }

      if (shouldCelebrateFirstSignal(count, prevCount, Boolean(started)) && onFirstRep) {
        onFirstRep();
      }

      if (count > 0 && onRepUpdate) {
        onRepUpdate(count, mode ?? 'pushups');
      }
    },
    [started, triggerRepFeedback, onFirstRep, onRepUpdate, mode]
  );

  const resetReps = useCallback(() => {
    prevCountRef.current = 0;
    setRepCount(0);
    setRepFeedback({ show: false, count: 0 });
  }, []);

  return { repCount, repFeedback, onRepDetected, resetReps };
}

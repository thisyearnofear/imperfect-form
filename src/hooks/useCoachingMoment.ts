'use client';

import { useEffect, useRef, useState } from 'react';
import { deriveCoachingMoment, type CoachingMomentPhase } from '@/lib/coachingMoment';

export function useCoachingMoment(
  tracking: boolean,
  repCount: number,
  warnings: string[] = []
): { phase: CoachingMomentPhase; warning: string | null; focusWarning: string | null } {
  const [latchedWarning, setLatchedWarning] = useState<string | null>(null);
  const [focusWarning, setFocusWarning] = useState<string | null>(null);
  const [repAtWarning, setRepAtWarning] = useState<number | null>(null);
  const activeWarning = warnings[0] ?? null;
  const previousTrackingRef = useRef(tracking);
  const previousRepCountRef = useRef(repCount);
  const dismissedWarningRef = useRef<string | null>(null);

  useEffect(() => {
    const warning = activeWarning;
    if (!warning) {
      dismissedWarningRef.current = null;
      setFocusWarning(null);
    }

    if (warning && warning !== dismissedWarningRef.current && latchedWarning === null) {
      setLatchedWarning(warning);
      setFocusWarning(warning);
      setRepAtWarning(repCount);
    }

    // A completed rep hands the movement back to the user. Suppress the same
    // still-present frame warning until it clears, so the phase does not jump
    // straight back to correction on the very next render.
    if (latchedWarning !== null && repAtWarning !== null && repCount > repAtWarning) {
      dismissedWarningRef.current = warning ?? latchedWarning;
      setLatchedWarning(null);
      setRepAtWarning(null);
    }

    // A fresh loss of framing should not carry a stale correction into the
    // next attempt, but avoid clearing during ordinary frame-level jitter.
    if (previousTrackingRef.current && !tracking && repCount === previousRepCountRef.current) {
      setLatchedWarning(null);
      setRepAtWarning(null);
    }

    previousTrackingRef.current = tracking;
    previousRepCountRef.current = repCount;
  }, [activeWarning, latchedWarning, repAtWarning, repCount, tracking]);

  const effectiveWarning =
    activeWarning && activeWarning !== dismissedWarningRef.current ? activeWarning : null;
  const phase = deriveCoachingMoment({
    tracking,
    repCount,
    warning: effectiveWarning,
    latchedWarning,
    repAtWarning,
  });

  return { phase, warning: latchedWarning ?? effectiveWarning, focusWarning };
}

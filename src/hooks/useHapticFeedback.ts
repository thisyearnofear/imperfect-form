'use client';

import { useCallback } from 'react';
import type { CoachPersonality } from '@/lib/coachPersonalities';

/**
 * Coach-specific haptic patterns that match each personality:
 * - SNEL: Gentle, slow (patient/supportive)
 * - STEDDIE: Smooth, flowing (mindful/zen)
 * - RASTA: Fast, energetic (competitive/dynamic)
 */
const COACH_HAPTIC_PATTERNS: Record<
  CoachPersonality,
  {
    success: number[];
    error: number[];
    rep: number[];
    gradeChange: number[];
  }
> = {
  SNEL: {
    // Gentle, slow vibrations - patient encouragement
    success: [30, 80, 30, 80, 30],
    error: [50, 60, 50],
    rep: [20, 40, 20],
    gradeChange: [25, 50, 25],
  },
  STEDDIE: {
    // Smooth, flowing vibrations - mindful balance
    success: [40, 60, 40, 60, 40],
    error: [60, 40, 60],
    rep: [25, 35, 25],
    gradeChange: [30, 45, 30],
  },
  RASTA: {
    // Fast, energetic vibrations - competitive push
    success: [50, 30, 50, 30, 50, 30, 50],
    error: [80, 30, 80],
    rep: [30, 20, 30],
    gradeChange: [40, 25, 40, 25, 40],
  },
};

/**
 * Custom hook for haptic feedback support
 * Provides vibration feedback for mobile devices with coach-specific patterns
 * ENHANCEMENT FIRST: Enhances UX with tactile feedback
 */
export function useHapticFeedback() {
  /**
   * Trigger haptic feedback if supported
   * @param pattern - Vibration pattern (ms or array of ms)
   */
  const triggerHaptic = useCallback((pattern: number | number[] = 50): void => {
    if (typeof navigator === 'undefined') return;
    if (!navigator.vibrate) return;

    try {
      navigator.vibrate(pattern);
    } catch {
      // Silently fail if vibration is not supported or blocked
    }
  }, []);

  /**
   * Trigger rep completion feedback
   * Short vibration for rep count
   */
  const triggerRepFeedback = useCallback((): void => {
    // Double pulse for rep completion
    triggerHaptic([30, 50, 30]);
  }, [triggerHaptic]);

  /**
   * Trigger success feedback
   * Longer vibration for success states
   */
  const triggerSuccessFeedback = useCallback((): void => {
    triggerHaptic([50, 100, 50, 100, 50]);
  }, [triggerHaptic]);

  /**
   * Trigger error feedback
   * Sharp vibration for errors
   */
  const triggerErrorFeedback = useCallback((): void => {
    triggerHaptic([100, 50, 100]);
  }, [triggerHaptic]);

  /**
   * Trigger coach-specific haptic feedback
   * @param personality - Coach personality to match
   * @param type - Type of feedback (success, error, rep, gradeChange)
   */
  const triggerCoachHaptic = useCallback(
    (personality: CoachPersonality, type: 'success' | 'error' | 'rep' | 'gradeChange'): void => {
      const patterns = COACH_HAPTIC_PATTERNS[personality];
      if (patterns) {
        triggerHaptic(patterns[type]);
      }
    },
    [triggerHaptic]
  );

  /**
   * Check if haptic feedback is supported
   */
  const isSupported = useCallback((): boolean => {
    if (typeof navigator === 'undefined') return false;
    return typeof navigator.vibrate === 'function';
  }, []);

  return {
    triggerHaptic,
    triggerRepFeedback,
    triggerSuccessFeedback,
    triggerErrorFeedback,
    triggerCoachHaptic,
    isSupported,
  };
}

export default useHapticFeedback;

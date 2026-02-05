'use client';

import { useCallback } from 'react';

/**
 * Custom hook for haptic feedback support
 * Provides vibration feedback for mobile devices
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
    isSupported,
  };
}

export default useHapticFeedback;

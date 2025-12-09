import { useEffect, useState } from 'react';

/**
 * Hook for smooth transitions between visibility/state changes
 * Handles both enter and exit animations with configurable duration
 *
 * Usage:
 * const { isVisible, className } = useTransition(isOpen, 300);
 * <div className={className}>Content</div>
 */

interface UseTransitionOptions {
  duration?: number; // milliseconds
  enterClass?: string;
  exitClass?: string;
}

interface UseTransitionReturn {
  isVisible: boolean;
  isAnimating: boolean;
  className: string;
}

export function useTransition(
  isOpen: boolean,
  options: UseTransitionOptions = {}
): UseTransitionReturn {
  const { duration = 300, enterClass = 'opacity-100', exitClass = 'opacity-0' } = options;

  const [isVisible, setIsVisible] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Opening: show immediately, animate in
      setIsVisible(true);
      setIsAnimating(true);
    } else {
      // Closing: animate out, then hide
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

  const className = `transition-all duration-300 ${isAnimating ? enterClass : exitClass}`;

  return { isVisible, isAnimating, className };
}

/**
 * Simplified fade transition for modals/dialogs
 */
export function useFadeTransition(isOpen: boolean, duration: number = 300) {
  return useTransition(isOpen, {
    duration,
    enterClass: 'opacity-100',
    exitClass: 'opacity-0',
  });
}

/**
 * Slide + fade transition (useful for modals sliding in from bottom)
 */
export function useSlideTransition(isOpen: boolean, duration: number = 300) {
  return useTransition(isOpen, {
    duration,
    enterClass: 'opacity-100 translate-y-0',
    exitClass: 'opacity-0 translate-y-4',
  });
}

/**
 * Scale + fade transition (for dialog zoom effect)
 */
export function useScaleTransition(isOpen: boolean, duration: number = 300) {
  return useTransition(isOpen, {
    duration,
    enterClass: 'opacity-100 scale-100',
    exitClass: 'opacity-0 scale-95',
  });
}

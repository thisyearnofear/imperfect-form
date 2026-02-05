import { useRef, useCallback, useEffect } from 'react';
import useDeviceDetect from './useDeviceDetect';

interface SwipeCheckResult {
  isLeftSwipe: boolean;
  isRightSwipe: boolean;
  isUpSwipe: boolean;
  isDownSwipe: boolean;
}

export default function useSwipeGesture(
  modes: string[],
  currentMode: string,
  onModeChange: (newMode: any) => void,
  options: {
    minSwipeDistance?: number;
    maxVerticalSwipe?: number;
    enableNavigation?: boolean; // If true, auto-navigates based on modes list
  } = {}
) {
  const { minSwipeDistance = 80, maxVerticalSwipe = 120, enableNavigation = true } = options;
  const { isMobile } = useDeviceDetect();

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      touchEndRef.current = null;
      touchStartRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    },
    [isMobile]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !touchStartRef.current) return;
      touchEndRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    },
    [isMobile]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !touchStartRef.current || !touchEndRef.current) return;

    const distanceX = touchStartRef.current.x - touchEndRef.current.x;
    const distanceY = touchStartRef.current.y - touchEndRef.current.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > maxVerticalSwipe;

    // Don't trigger horizontal swipe if there's significant vertical movement
    if (isVerticalSwipe) return;

    if (enableNavigation) {
      const currentIndex = modes.indexOf(currentMode);

      if (isLeftSwipe && currentIndex < modes.length - 1) {
        // Swipe left → next mode
        onModeChange(modes[currentIndex + 1]);
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right → previous mode
        onModeChange(modes[currentIndex - 1]);
      }
    }
  }, [
    isMobile,
    touchStartRef,
    touchEndRef,
    minSwipeDistance,
    maxVerticalSwipe,
    enableNavigation,
    modes,
    currentMode,
    onModeChange,
  ]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}

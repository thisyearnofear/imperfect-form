import { useState, useEffect, useCallback } from 'react';

export type Orientation = 'portrait' | 'landscape' | 'unknown';

export interface OrientationState {
  orientation: Orientation;
  isPortrait: boolean;
  isLandscape: boolean;
  isSupported: boolean;
}

function getOrientation(): Orientation {
  if (typeof window === 'undefined') return 'unknown';
  // Prefer screen.orientation.type when available
  const screenType = window.screen?.orientation?.type;
  if (typeof screenType === 'string') {
    return screenType.includes('landscape') ? 'landscape' : 'portrait';
  }
  // Fallback to viewport comparison
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

export function useOrientation(): OrientationState {
  const [orientation, setOrientation] = useState<Orientation>('unknown');
  const [isSupported, setIsSupported] = useState(false);

  const update = useCallback(() => {
    setOrientation(getOrientation());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsSupported(true);
    update();

    const mediaQuery = window.matchMedia('(orientation: landscape)');

    const handleChange = () => update();

    // Modern API
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Legacy API for older Safari
      mediaQuery.addListener(handleChange);
    }

    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);

    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
    };
  }, [update]);

  return {
    orientation,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    isSupported,
  };
}

export default useOrientation;

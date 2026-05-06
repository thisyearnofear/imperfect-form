'use client';

import { useState, useEffect, useCallback } from 'react';
import { cameraManager, stopAllCameras as stopAllCamerasUtil } from '@/utils/cameraManager';

interface ViewportDimensions {
  height: number;
  width: number;
}

interface UseCameraSetupReturn {
  viewportDimensions: ViewportDimensions;
  stopAllCameras: () => void;
}

export function useCameraSetup(
  onProfileSearch?: (identifier: string) => void
): UseCameraSetupReturn {
  const [viewportDimensions, setViewportDimensions] = useState<ViewportDimensions>({
    height: 0,
    width: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setViewportDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const handleProfileSearchEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.identifier && onProfileSearch) {
        console.log('🔍 Profile search event received:', customEvent.detail.identifier);
        onProfileSearch(customEvent.detail.identifier);
      }
    };

    window.addEventListener('profileSearch', handleProfileSearchEvent);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('profileSearch', handleProfileSearchEvent);
    };
  }, [onProfileSearch]);

  const stopAllCameras = useCallback(() => {
    console.log('🛑 Stopping all cameras - using enhanced camera manager');
    const stoppedTracks = stopAllCamerasUtil();

    if (typeof window !== 'undefined') {
      if (window.requestAnimationFrame) {
        const highestId = window.requestAnimationFrame(() => {});
        for (let i = 0; i < highestId; i++) {
          window.cancelAnimationFrame(i);
        }
        console.log('🎬 Cancelled animation frames up to ID:', highestId);
      }

      if (process.env.NODE_ENV === 'development' && 'gc' in window) {
        try {
          (window as typeof window & { gc?: () => void }).gc?.();
          console.log('🗑️ Forced garbage collection');
        } catch {
          console.log('Garbage collection not available');
        }
      }
    }

    const status = cameraManager.getCameraStatus();
    console.log('📊 Camera status after cleanup:', status);
    console.log(`🎯 Camera cleanup complete. Stopped ${stoppedTracks} video tracks.`);
  }, []);

  return { viewportDimensions, stopAllCameras };
}

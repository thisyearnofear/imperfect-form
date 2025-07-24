import { useCallback, useEffect, useState } from "react";

type OrientationLockApi = {
  lockLandscape: () => void;
  unlock: () => void;
  orientationSupported: boolean;
  isLocked: boolean;
};

interface OrientationAPI {
  lock?: (orientation: string) => Promise<void> | void;
  unlock?: () => Promise<void> | void;
}

// Utility to check for support
function getOrientationApi(): OrientationAPI | undefined {
  if (typeof window === "undefined") return undefined;
  const { screen } = window as Window & {
    screen: Screen & {
      mozOrientation?: OrientationAPI;
      msOrientation?: OrientationAPI
    }
  };
  return screen?.orientation || screen?.mozOrientation || screen?.msOrientation;
}

export function useOrientationLock(): OrientationLockApi {
  const [isLocked, setIsLocked] = useState(false);
  const [orientationSupported, setSupported] = useState(false);

  useEffect(() => {
    const api = getOrientationApi();
    setSupported(!!api && typeof api.lock === "function");
  }, []);

  const lockLandscape = useCallback(() => {
    const orientation = getOrientationApi();
    if (orientation && orientation.lock) {
      try {
        const result = orientation.lock("landscape");
        if (result && typeof result.then === "function") {
          result.then(() => setIsLocked(true)).catch(() => setIsLocked(false));
        } else {
          setIsLocked(true);
        }
      } catch {
        setIsLocked(false);
      }
    }
  }, []);

  const unlock = useCallback(() => {
    const orientation = getOrientationApi();
    if (orientation && orientation.unlock) {
      try {
        const result = orientation.unlock();
        if (result && typeof result.then === "function") {
          result.then(() => setIsLocked(false)).catch(() => setIsLocked(false));
        } else {
          setIsLocked(false);
        }
      } catch {
        setIsLocked(false);
      }
    } else {
      // Fallback for some browsers: set to unlocked
      setIsLocked(false);
    }
  }, []);

  return {
    lockLandscape: orientationSupported ? lockLandscape : () => {},
    unlock: orientationSupported ? unlock : () => {},
    orientationSupported,
    isLocked,
  };
}

export default useOrientationLock;
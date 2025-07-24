import { useCallback, useEffect, useState } from "react";

type OrientationLockApi = {
  lockLandscape: () => void;
  unlock: () => void;
  orientationSupported: boolean;
  isLocked: boolean;
};

// Utility to check for support
function getOrientationApi() {
  if (typeof window === "undefined") return undefined;
  const { screen } = window as any;
  return screen?.orientation || screen?.mozOrientation || screen?.msOrientation;
}

export function useOrientationLock(): OrientationLockApi {
  const [isLocked, setIsLocked] = useState(false);
  const [orientationSupported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(!!getOrientationApi() && typeof getOrientationApi().lock === "function");
  }, []);

  const lockLandscape = useCallback(() => {
    const orientation = getOrientationApi();
    if (orientation && typeof orientation.lock === "function") {
      orientation
        .lock("landscape")
        .then(() => setIsLocked(true))
        .catch(() => setIsLocked(false));
    }
  }, []);

  const unlock = useCallback(() => {
    const orientation = getOrientationApi();
    if (orientation && typeof orientation.unlock === "function") {
      orientation.unlock().then(() => setIsLocked(false)).catch(() => setIsLocked(false));
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
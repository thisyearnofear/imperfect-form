import { useCallback, useEffect, useRef, useState } from 'react';

type FullscreenHook = {
  isFullscreen: boolean;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
};

const getDoc = () => (typeof window !== 'undefined' ? window.document : undefined);

export function useFullscreen(targetRef?: React.RefObject<Element | null>): FullscreenHook {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Used to keep the callback up-to-date
  const defaultRef = useRef<Element>(getDoc()?.documentElement || null);
  const ref = targetRef || defaultRef;

  // Cross-browser helpers
  const getCurrentFsElement = () =>
    getDoc()?.fullscreenElement ||
    // @ts-expect-error - webkit fullscreen API not in standard types
    getDoc()?.webkitFullscreenElement ||
    // @ts-expect-error - mozilla fullscreen API not in standard types
    getDoc()?.mozFullScreenElement ||
    // @ts-expect-error - microsoft fullscreen API not in standard types
    getDoc()?.msFullscreenElement ||
    null;

  const requestFullscreen = useCallback(() => {
    const el = ref.current || getDoc()?.documentElement;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (
      // @ts-expect-error - webkit fullscreen API not in standard types
      el.webkitRequestFullscreen
    ) {
      // @ts-expect-error - webkit fullscreen API not in standard types
      el.webkitRequestFullscreen();
    } else if (
      // @ts-expect-error - mozilla fullscreen API not in standard types
      el.mozRequestFullScreen
    ) {
      // @ts-expect-error - mozilla fullscreen API not in standard types
      el.mozRequestFullScreen();
    } else if (
      // @ts-expect-error - microsoft fullscreen API not in standard types
      el.msRequestFullscreen
    ) {
      // @ts-expect-error - microsoft fullscreen API not in standard types
      el.msRequestFullscreen();
    }
  }, [ref]);

  const exitFullscreen = useCallback(() => {
    const doc = getDoc();
    if (!doc) return;
    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (
      // @ts-expect-error - webkit fullscreen API not in standard types
      doc.webkitExitFullscreen
    ) {
      // @ts-expect-error - webkit fullscreen API not in standard types
      doc.webkitExitFullscreen();
    } else if (
      // @ts-expect-error - mozilla fullscreen API not in standard types
      doc.mozCancelFullScreen
    ) {
      // @ts-expect-error - mozilla fullscreen API not in standard types
      doc.mozCancelFullScreen();
    } else if (
      // @ts-expect-error - microsoft fullscreen API not in standard types
      doc.msExitFullscreen
    ) {
      // @ts-expect-error - microsoft fullscreen API not in standard types
      doc.msExitFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
  }, [isFullscreen, requestFullscreen, exitFullscreen]);

  useEffect(() => {
    const doc = getDoc();
    if (!doc) return;

    const handleChange = () => {
      setIsFullscreen(!!getCurrentFsElement());
    };

    doc.addEventListener('fullscreenchange', handleChange);
    doc.addEventListener('webkitfullscreenchange', handleChange);

    // Initial sync
    setIsFullscreen(!!getCurrentFsElement());

    return () => {
      doc.removeEventListener('fullscreenchange', handleChange);
      doc.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  return {
    isFullscreen,
    enterFullscreen: requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}

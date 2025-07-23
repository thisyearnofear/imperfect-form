import { useCallback, useEffect, useRef, useState } from "react";

type FullscreenHook = {
  isFullscreen: boolean;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
};

const getDoc = () => (typeof window !== "undefined" ? window.document : undefined);

export function useFullscreen(targetRef?: React.RefObject<Element>): FullscreenHook {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Used to keep the callback up-to-date
  const ref = targetRef || useRef<Element>(getDoc()?.documentElement || null);

  // Cross-browser helpers
  const getCurrentFsElement = () =>
    getDoc()?.fullscreenElement ||
    // @ts-expect-error webkit
    getDoc()?.webkitFullscreenElement ||
    // @ts-expect-error moz
    getDoc()?.mozFullScreenElement ||
    // @ts-expect-error ms
    getDoc()?.msFullscreenElement ||
    null;

  const requestFullscreen = useCallback(() => {
    const el = ref.current || getDoc()?.documentElement;
    if (!el) return;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (
      // @ts-expect-error webkit
      el.webkitRequestFullscreen
    ) {
      // @ts-expect-error webkit
      el.webkitRequestFullscreen();
    } else if (
      // @ts-expect-error moz
      el.mozRequestFullScreen
    ) {
      // @ts-expect-error moz
      el.mozRequestFullScreen();
    } else if (
      // @ts-expect-error ms
      el.msRequestFullscreen
    ) {
      // @ts-expect-error ms
      el.msRequestFullscreen();
    }
  }, [ref]);

  const exitFullscreen = useCallback(() => {
    const doc = getDoc();
    if (!doc) return;
    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (
      // @ts-expect-error webkit
      doc.webkitExitFullscreen
    ) {
      // @ts-expect-error webkit
      doc.webkitExitFullscreen();
    } else if (
      // @ts-expect-error moz
      doc.mozCancelFullScreen
    ) {
      // @ts-expect-error moz
      doc.mozCancelFullScreen();
    } else if (
      // @ts-expect-error ms
      doc.msExitFullscreen
    ) {
      // @ts-expect-error ms
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

    doc.addEventListener("fullscreenchange", handleChange);
    // @ts-expect-error webkit
    doc.addEventListener("webkitfullscreenchange", handleChange);

    // Initial sync
    setIsFullscreen(!!getCurrentFsElement());

    return () => {
      doc.removeEventListener("fullscreenchange", handleChange);
      // @ts-expect-error webkit
      doc.removeEventListener("webkitfullscreenchange", handleChange);
    };
    // eslint-disable-next-line
  }, []);

  return {
    isFullscreen,
    enterFullscreen: requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}
'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** Final value to count up to. */
  to: number;
  /** Animation duration in ms. */
  duration?: number;
  /** Render with thousands separators. */
  format?: boolean;
  className?: string;
}

/**
 * Ease-out count-up for stat numbers — dynamic without ceremony. Honors
 * prefers-reduced-motion by jumping straight to the final value.
 */
export const CountUp: React.FC<CountUpProps> = ({
  to,
  duration = 700,
  format = false,
  className,
}) => {
  // Reduced-motion: start at the final value so there is no 0→N flash.
  const [value, setValue] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? to
      : 0
  );
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || duration <= 0) {
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic — fast start, gentle landing
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(to * eased);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [to, duration]);

  const display = format ? Math.round(value).toLocaleString() : String(Math.round(value));
  return <span className={className}>{display}</span>;
};

export default CountUp;

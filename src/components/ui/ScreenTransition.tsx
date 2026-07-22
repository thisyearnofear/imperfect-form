'use client';

import React from 'react';
import '@/styles/studio-motion.css';

type TransitionMode = 'fade' | 'slide-up' | 'slide-left' | 'slide-right';

interface ScreenTransitionProps {
  children: React.ReactNode;
  mode?: TransitionMode;
  delay?: number;
  className?: string;
  duration?: number;
}

/**
 * Reusable screen transition wrapper.
 * Provides a consistent, centered focal point with smooth enter/exit motion.
 * Respects prefers-reduced-motion via the studio-motion media query.
 */
export function ScreenTransition({
  children,
  mode = 'fade',
  delay = 0,
  className = '',
  duration = 300,
}: ScreenTransitionProps) {
  const modeClass =
    mode === 'slide-up'
      ? 'screen-transition--slide-up'
      : mode === 'slide-left'
        ? 'screen-transition--slide-left'
        : mode === 'slide-right'
          ? 'screen-transition--slide-right'
          : 'screen-transition--fade';

  return (
    <div
      className={`screen-transition ${modeClass} ${className}`.trim()}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default ScreenTransition;

'use client';

import React from 'react';
import { zIndexClasses } from '@/lib/zTokens';

interface ReachCueLineProps {
  /** The quiet reach-read cue — a near-miss at the line, a mid-band re-arm
      nudge, or a missing arm. Null renders nothing. */
  text: string | null;
  /** Mobile sits above the bottom instrument stack; desktop hugs the stage. */
  elevated?: boolean;
}

/**
 * The reach read's one-line explainer — the silence was the bug. Same calm
 * pill as the framing-readiness hint, but driven by the rep processor's own
 * state, so it can speak mid-set where the readiness window has already
 * closed: why a raise didn't count, which arm fell out of frame, what the
 * hysteresis is waiting for.
 */
export const ReachCueLine: React.FC<ReachCueLineProps> = ({ text, elevated = false }) => {
  if (!text) return null;
  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 ${elevated ? 'bottom-28' : 'bottom-16'} pointer-events-none ${zIndexClasses.overlayFeedback}`}
      role="status"
      aria-live="polite"
      data-reach-cue
    >
      <div className="readiness-hint reach-cue">
        <span className="readiness-hint__dot" aria-hidden="true" />
        <span className="readiness-hint__text">{text}</span>
      </div>
    </div>
  );
};

export default ReachCueLine;

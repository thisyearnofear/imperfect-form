'use client';

import React from 'react';
import type { ReadinessScore } from '@/lib/exercise-engine';
import { zIndexClasses } from '@/lib/zTokens';

interface ReadinessHintProps {
  readiness: ReadinessScore | null;
  /** True once the user has started moving (first rep) — hint yields. */
  repCount: number;
  /** True once pose has locked at least once this session. */
  hasLockedPose: boolean;
  /** Mobile sits above the bottom instrument stack; desktop hugs the stage. */
  elevated?: boolean;
}

/**
 * Progressive framing-readiness hint.
 *
 * Surfaces the single most actionable framing suggestion from the
 * PoseReadinessSystem during the pre-workout settling window — the moment the
 * user is in frame (pose detected) but hasn't started moving yet. It is a
 * calm, studio-register nudge, not a gate: the workout is never blocked on it.
 *
 * Visible only while:
 *  - pose has locked (keypoints exist to score),
 *  - no rep has landed yet (the user is still settling),
 *  - the system has an actionable suggestion and hasn't cleared.
 */
export const ReadinessHint: React.FC<ReadinessHintProps> = ({
  readiness,
  repCount,
  hasLockedPose,
  elevated = false,
}) => {
  if (!readiness) return null;
  if (!hasLockedPose) return null;
  if (repCount > 0) return null;
  if (readiness.canProceed) return null;

  const topIssue = readiness.issues.find((i) => i.fixable) ?? readiness.issues[0];
  const line = topIssue?.suggestion || readiness.feedback;
  if (!line) return null;

  return (
    <div
      className={`absolute left-1/2 -translate-x-1/2 ${elevated ? 'bottom-28' : 'bottom-16'} pointer-events-none ${zIndexClasses.overlayFeedback}`}
      role="status"
      aria-live="polite"
    >
      <div className="readiness-hint">
        <span className="readiness-hint__dot" aria-hidden="true" />
        <span className="readiness-hint__text">{line}</span>
      </div>
    </div>
  );
};

export default ReadinessHint;

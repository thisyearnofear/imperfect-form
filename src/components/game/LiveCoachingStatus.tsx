'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, ScanLine } from 'lucide-react';
import { guidanceFor } from '@/lib/exerciseGuidance';
import { readableFormWarning } from '@/lib/coachingStory';
import type { ExerciseMode } from '@/utils/biomechanics';

interface LiveCoachingStatusProps {
  mode: ExerciseMode;
  tracking: boolean;
  repCount?: number;
  warnings?: string[];
}

export function LiveCoachingStatus({
  mode,
  tracking,
  repCount = 0,
  warnings = [],
}: LiveCoachingStatusProps) {
  const guidance = guidanceFor(mode);
  const activeWarning = warnings[0];

  if (tracking && activeWarning) {
    return (
      <div
        key={`warning-${activeWarning}`}
        className="live-status live-status--adjust motion-cue"
        role="status"
        aria-live="polite"
      >
        <AlertCircle size={16} />
        <span>
          I see your movement. Next rep: {readableFormWarning(activeWarning).toLowerCase()}.
        </span>
      </div>
    );
  }

  if (tracking) {
    return (
      <div
        key="tracking"
        className="live-status live-status--ready motion-cue"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={16} />
        <span>
          {repCount === 0
            ? 'I see your movement. Show me one rep.'
            : 'That line is readable. Keep going and the coach will find the next signal.'}
        </span>
      </div>
    );
  }

  return (
    <div
      key={`framing-${mode}`}
      className="live-status motion-cue"
      role="status"
      aria-live="polite"
    >
      <ScanLine size={16} />
      <span>{guidance.camera}</span>
    </div>
  );
}

export default LiveCoachingStatus;

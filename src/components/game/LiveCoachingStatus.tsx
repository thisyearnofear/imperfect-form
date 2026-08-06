'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, ScanLine } from 'lucide-react';
import { guidanceFor } from '@/lib/exerciseGuidance';
import { readableFormWarning } from '@/lib/coachingStory';
import type { CoachingMomentPhase } from '@/lib/coachingMoment';
import type { ExerciseMode } from '@/utils/biomechanics';

interface LiveCoachingStatusProps {
  mode: ExerciseMode;
  tracking: boolean;
  repCount?: number;
  warnings?: string[];
  phase?: CoachingMomentPhase;
  warning?: string | null;
  focusWarning?: string | null;
}

export function LiveCoachingStatus({
  mode,
  tracking,
  repCount = 0,
  warnings = [],
  phase: suppliedPhase,
  warning: suppliedWarning,
  focusWarning: suppliedFocusWarning,
}: LiveCoachingStatusProps) {
  const guidance = guidanceFor(mode);
  const phase = suppliedPhase ?? (tracking ? (repCount > 0 ? 'your_turn' : 'observed') : 'framing');
  const warning = suppliedWarning ?? warnings[0] ?? null;
  const focusWarning = suppliedFocusWarning ?? null;

  if (phase === 'correction' && warning) {
    return (
      <div
        key={`warning-${warning}`}
        className="live-status live-status--adjust motion-cue"
        role="status"
        aria-live="polite"
      >
        <AlertCircle size={16} />
        <span>I see your movement. Next rep: {readableFormWarning(warning).toLowerCase()}.</span>
      </div>
    );
  }

  if (phase === 'your_turn') {
    return (
      <div
        key="your-turn"
        className="live-status live-status--ready motion-cue"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={16} />
        <span>
          Your turn.{' '}
          {focusWarning
            ? `Keep this in mind: ${readableFormWarning(focusWarning).toLowerCase()}.`
            : 'Match the line and keep going.'}
        </span>
      </div>
    );
  }

  if (phase === 'observed') {
    return (
      <div
        key="observed"
        className="live-status live-status--ready motion-cue"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={16} />
        <span>I see your movement. Show me one rep.</span>
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

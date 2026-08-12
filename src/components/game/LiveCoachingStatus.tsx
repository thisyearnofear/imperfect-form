'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, ScanLine } from 'lucide-react';
import { guidanceFor } from '@/lib/exerciseGuidance';
import { readableFormWarning } from '@/lib/coachingStory';
import { useSessionIntent } from '@/hooks/useSessionIntent';
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
  firstSignal?: boolean;
  retryFocus?: string | null;
}

export function LiveCoachingStatus({
  mode,
  tracking,
  repCount = 0,
  warnings = [],
  phase: suppliedPhase,
  warning: suppliedWarning,
  focusWarning: suppliedFocusWarning,
  firstSignal = false,
  retryFocus = null,
}: LiveCoachingStatusProps) {
  const { register } = useSessionIntent();
  // The full arcade cabinet: an explicit Train session keeps every coachy line
  // in the same gold Press Start voice (uppercased + styled via the arcade
  // register in session-register.css). Studio keeps the spoken coach tone.
  // Copy stays short enough to be pixel-legible.
  const arcade = register === 'arcade';

  const guidance = guidanceFor(mode);
  const phase = suppliedPhase ?? (tracking ? (repCount > 0 ? 'your_turn' : 'observed') : 'framing');
  const warning = suppliedWarning ?? warnings[0] ?? null;
  const focusWarning = suppliedFocusWarning ?? null;

  if (firstSignal && repCount === 1) {
    return (
      <div
        key="first-signal"
        className="live-status live-status--signal motion-cue"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={16} />
        <span>
          {arcade
            ? 'Signal locked — keep your form.'
            : 'First signal captured. Coach is watching your form. Now try the one fix.'}
        </span>
      </div>
    );
  }

  if (phase === 'correction' && warning && mode !== 'curls') {
    return (
      <div
        key={`warning-${warning}`}
        className="live-status live-status--adjust motion-cue"
        role="status"
        aria-live="polite"
      >
        <AlertCircle size={16} />
        {/* The first named correction is the One Fix payoff — the promise the
            foyer makes (ONE REP / ONE FIX), delivered live. The arcade cabinet
            reads it as a brass FIX banner; the studio coach as a spoken cue. */}
        <span>
          {arcade ? 'Fix: ' : 'One fix: '}
          {readableFormWarning(warning).toLowerCase()}.
        </span>
      </div>
    );
  }

  if (phase === 'correction' && mode === 'curls') {
    return (
      <div
        key="curl-instrument"
        className="live-status live-status--ready motion-cue"
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={16} />
        <span>Watch the arm — match the target angle.</span>
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
          {arcade ? 'Your turn — ' : 'Your turn. '}
          {mode === 'curls'
            ? 'Watch the arm — match the target angle.'
            : focusWarning
              ? arcade
                ? `watch: ${readableFormWarning(focusWarning).toLowerCase()}.`
                : `Keep this in mind: ${readableFormWarning(focusWarning).toLowerCase()}.`
              : retryFocus
                ? arcade
                  ? `focus: ${retryFocus.toLowerCase()}`
                  : `Retry focus: ${retryFocus.toLowerCase()}`
                : 'match the line.'}
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
        <span>
          {arcade ? 'Sync locked — ' : 'I see your movement. '}
          {mode === 'curls'
            ? 'Show one curl — the arm will show you the target.'
            : retryFocus
              ? arcade
                ? `next set: ${retryFocus.toLowerCase()}.`
                : `Next set focus: ${retryFocus.toLowerCase()}.`
              : 'Show me one rep.'}
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

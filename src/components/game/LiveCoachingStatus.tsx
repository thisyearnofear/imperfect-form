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
  /** Replay the enter animation (mobile overlays). Desktop rails stay still. */
  animate?: boolean;
}

type StatusTone = 'ready' | 'adjust' | 'signal' | 'framing';

function resolveLiveStatus({
  arcade,
  mode,
  tracking,
  repCount,
  phase,
  warning,
  focusWarning,
  firstSignal,
  retryFocus,
  cameraGuidance,
}: {
  arcade: boolean;
  mode: ExerciseMode;
  tracking: boolean;
  repCount: number;
  phase: CoachingMomentPhase;
  warning: string | null;
  focusWarning: string | null;
  firstSignal: boolean;
  retryFocus: string | null;
  cameraGuidance: string;
}): { tone: StatusTone; text: string } {
  if (firstSignal && repCount === 1) {
    return {
      tone: 'signal',
      text: arcade
        ? 'Signal locked — keep your form.'
        : 'First signal captured. Coach is watching your form. Now try the one fix.',
    };
  }

  if (phase === 'correction' && mode === 'curls') {
    return {
      tone: 'adjust',
      text: arcade
        ? 'Fix: pin your elbows — watch the arm sweep, then match it.'
        : 'One fix: pin your elbows — watch the arm sweep, then match it.',
    };
  }

  if (phase === 'correction' && warning) {
    return {
      tone: 'adjust',
      text: `${arcade ? 'Fix: ' : 'One fix: '}${readableFormWarning(warning).toLowerCase()}.`,
    };
  }

  if (phase === 'your_turn') {
    const curlLine = arcade
      ? 'Your turn — watch the arm — close the gap.'
      : 'Your turn. Watch the arm — close the gap. That is the one fix.';
    const focused = focusWarning
      ? arcade
        ? `Your turn — watch: ${readableFormWarning(focusWarning).toLowerCase()}.`
        : `Your turn. Keep this in mind: ${readableFormWarning(focusWarning).toLowerCase()}.`
      : retryFocus
        ? arcade
          ? `Your turn — focus: ${retryFocus.toLowerCase()}`
          : `Your turn. Retry focus: ${retryFocus.toLowerCase()}`
        : arcade
          ? 'Your turn — match the line.'
          : 'Your turn. Match the line.';
    return { tone: 'ready', text: mode === 'curls' ? curlLine : focused };
  }

  if (phase === 'observed') {
    const curlLine = arcade
      ? 'Sync locked — Show one curl — the arm will show you the target.'
      : 'I see your movement. Show one curl — the arm will show you the target.';
    const next = retryFocus
      ? arcade
        ? `Sync locked — next set: ${retryFocus.toLowerCase()}.`
        : `I see your movement. Next set focus: ${retryFocus.toLowerCase()}.`
      : arcade
        ? 'Sync locked — Show me one rep.'
        : 'I see your movement. Show me one rep.';
    return { tone: 'ready', text: mode === 'curls' ? curlLine : next };
  }

  if (!tracking && repCount > 0) {
    return {
      tone: 'framing',
      text: arcade
        ? 'Re-frame — step back into view.'
        : 'Step back into frame — I lost your landmarks.',
    };
  }

  return { tone: 'framing', text: cameraGuidance };
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
  animate = true,
}: LiveCoachingStatusProps) {
  const { register } = useSessionIntent();
  const arcade = register === 'arcade';
  const guidance = guidanceFor(mode);
  const phase = suppliedPhase ?? (tracking ? (repCount > 0 ? 'your_turn' : 'observed') : 'framing');
  const warning = suppliedWarning ?? warnings[0] ?? null;
  const focusWarning = suppliedFocusWarning ?? null;
  const { tone, text } = resolveLiveStatus({
    arcade,
    mode,
    tracking,
    repCount,
    phase,
    warning,
    focusWarning,
    firstSignal,
    retryFocus,
    cameraGuidance: guidance.camera,
  });
  const Icon = tone === 'adjust' ? AlertCircle : tone === 'framing' ? ScanLine : CheckCircle2;

  return (
    <div
      className={`live-status live-status--${tone}${animate ? ' motion-cue' : ''}`}
      role="status"
      aria-live="polite"
    >
      <Icon size={16} />
      <span>{text}</span>
    </div>
  );
}

export default LiveCoachingStatus;

'use client';

import React from 'react';
import { CheckCircle2, ScanLine } from 'lucide-react';
import { guidanceFor } from '@/lib/exerciseGuidance';
import type { ExerciseMode } from '@/utils/biomechanics';

interface LiveCoachingStatusProps {
  mode: ExerciseMode;
  tracking: boolean;
}

export function LiveCoachingStatus({ mode, tracking }: LiveCoachingStatusProps) {
  const guidance = guidanceFor(mode);

  if (tracking) {
    return (
      <div key="tracking" className="live-status live-status--ready motion-cue">
        <CheckCircle2 size={16} />
        <span>Tracking well. Your first rep starts the set.</span>
      </div>
    );
  }

  return (
    <div key={`framing-${mode}`} className="live-status motion-cue">
      <ScanLine size={16} />
      <span>{guidance.camera}</span>
    </div>
  );
}

export default LiveCoachingStatus;

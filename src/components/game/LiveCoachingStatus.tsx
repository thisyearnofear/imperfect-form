'use client';

import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, ScanLine } from 'lucide-react';
import {
  coachStation,
  type StationDemonstrationEvent,
  type StationStatus,
} from '@/services/coachStation';
import { guidanceFor } from '@/lib/exerciseGuidance';
import type { ExerciseMode } from '@/utils/biomechanics';

interface LiveCoachingStatusProps {
  mode: ExerciseMode;
  tracking: boolean;
}

export function LiveCoachingStatus({ mode, tracking }: LiveCoachingStatusProps) {
  const [stationStatus, setStationStatus] = useState<StationStatus>(coachStation.status);
  const [demonstration, setDemonstration] = useState<StationDemonstrationEvent | null>(null);
  const guidance = guidanceFor(mode);

  useEffect(() => coachStation.onStatus(setStationStatus), []);
  useEffect(
    () =>
      coachStation.onDemonstration((event) => {
        setDemonstration(event);
        const timeout = window.setTimeout(
          () => setDemonstration(null),
          Math.max(2500, event.duration_s * 1000)
        );
        return () => window.clearTimeout(timeout);
      }),
    []
  );

  if (demonstration) {
    return (
      <div
        key={`demo-${demonstration.name}`}
        className="live-status live-status--demo motion-cue motion-demo"
      >
        <Bot size={16} />
        <span>Coach demonstrating: {demonstration.narration}</span>
      </div>
    );
  }

  if (coachStation.enabled && stationStatus === 'connected') {
    return (
      <div key="coach-ready" className="live-status motion-cue">
        <Bot size={16} />
        <span>Physical coach ready to demonstrate corrections</span>
      </div>
    );
  }

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

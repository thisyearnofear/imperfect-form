'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Focus, TriangleAlert } from 'lucide-react';
import { analyzeForm } from '@/lib/coachingEngine';
import { speakCoachLine } from '@/lib/tts';
import { coachStation } from '@/services/coachStation';
import { useCoachPersonality } from '@/hooks/useCoachPersonality';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import {
  createCueHabituationState,
  decideCueDelivery,
  type CueHabituationState,
} from '@/lib/cueHabituation';
import type { BiomechanicalState } from '@/types/mediapipe';
import type { ExerciseMode } from '@/utils/biomechanics';

interface AgentInsightTrayProps {
  metrics: BiomechanicalState | null;
  mode: ExerciseMode;
  voiceEnabled: boolean;
  repCount: number;
  userId?: string;
}

type CueState = 'ready' | 'adjust' | 'good';

const DEFAULT_CUES: Record<ExerciseMode, string> = {
  pushups: 'Settle into a strong plank.',
  squats: 'Stay tall and move with control.',
  curls: 'Keep your elbows close to your sides.',
  pullups: 'Start from a controlled hang.',
  jumps: 'Land softly with knees tracking forward.',
};

export function AgentInsightTray({ metrics, mode, voiceEnabled, repCount }: AgentInsightTrayProps) {
  const [cue, setCue] = useState({ state: 'ready' as CueState, message: DEFAULT_CUES[mode] });
  const lastHash = useRef('');
  const lastVoice = useRef(0);
  // Session-scoped habituation: a repeated issue is voiced once in full, once
  // shortened, then display-only until the form clears and it recurs fresh.
  const habituationRef = useRef<CueHabituationState>(createCueHabituationState());
  const [personality] = useCoachPersonality();

  const metricsHash = useMemo(() => {
    if (!metrics) return '';
    return JSON.stringify({
      depth: Math.round(metrics.depth * 10),
      lean: Math.round(metrics.trunkLean / 5),
      knees: Math.round(metrics.kneeValgus / 5),
      stable: metrics.isStable,
      warnings: metrics.warnings.join(','),
    });
  }, [metrics]);

  useEffect(() => {
    if (!metrics || !metricsHash || metricsHash === lastHash.current) return;
    lastHash.current = metricsHash;

    const analysis = analyzeForm(metrics, mode);
    // Curls have their own angle + drift instrument in the camera stage. Keep
    // this tray quiet so it cannot issue a second, generic depth instruction.
    const issue = mode === 'curls' ? null : analysis.primaryIssue;
    const state: CueState = issue ? (issue.severity === 'info' ? 'good' : 'adjust') : 'good';
    const message =
      issue?.cue ?? (repCount > 0 ? 'Good control. Keep that rhythm.' : DEFAULT_CUES[mode]);
    setCue({ state, message });

    if (issue) {
      coachStation.sendFormEvent({
        mode,
        issue: issue.type,
        severity: issue.severity,
        current: issue.current,
        target: issue.target,
        cue: issue.cue,
        personality,
        repCount,
      });
      // Habituation: full voice once, shortened once, then display-only while
      // the same issue persists. The tray keeps showing the cue either way.
      const delivery = decideCueDelivery(issue.type, issue.cue, habituationRef.current);
      habituationRef.current = delivery.state;
      if (
        delivery.voice &&
        voiceEnabled &&
        issue.severity === 'critical' &&
        Date.now() - lastVoice.current > 3000
      ) {
        lastVoice.current = Date.now();
        void speakCoachLine(delivery.phrase, { voiceEnabled, personality });
      }
    } else if (Object.keys(habituationRef.current).length > 0) {
      // Form cleared — reset habituation so a genuine recurrence later gets a
      // fresh first-voice cue instead of staying silent.
      habituationRef.current = createCueHabituationState();
    }
  }, [metrics, metricsHash, mode, personality, repCount, voiceEnabled]);

  const { register } = useSessionIntent();
  // Arcade cabinet: the tray keeps the same form cues (coaching content must
  // not degrade) but reads them as brass pixel labels — FIX / NICE / GET READY
  // (styling via the arcade register in session-register.css).
  const arcade = register === 'arcade';

  const Icon = cue.state === 'adjust' ? TriangleAlert : cue.state === 'good' ? Check : Focus;
  const label = arcade
    ? cue.state === 'adjust'
      ? 'Fix'
      : cue.state === 'good'
        ? 'Nice'
        : 'Get ready'
    : cue.state === 'adjust'
      ? 'Adjust'
      : cue.state === 'good'
        ? 'Looking good'
        : 'Get ready';

  return (
    <section
      key={cue.message}
      className={`coach-cue coach-cue--${cue.state} motion-cue`}
      role="status"
      aria-live="polite"
    >
      <Icon size={17} aria-hidden="true" />
      <div>
        <p>{label}</p>
        <strong>{mode === 'curls' ? 'Follow the angle + drift readout.' : cue.message}</strong>
      </div>
    </section>
  );
}

export default AgentInsightTray;

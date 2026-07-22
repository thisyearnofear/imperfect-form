'use client';

import React from 'react';
import { ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import type { ExerciseMode } from '@/utils/biomechanics';
import type { SessionSummary } from '@/services/sessionLogger';

type SessionRecapProps = {
  mode: ExerciseMode;
  reps: number;
  summary: SessionSummary | null;
  onTryAgain?: () => void;
};

const NEXT_FOCUS: Record<ExerciseMode, string> = {
  pushups: 'Keep one long line from shoulders through hips as you lower.',
  squats: 'Keep your knees tracking over your toes on the way down.',
  curls: 'Pin your elbows to your sides and avoid swinging.',
  pullups: 'Finish each rep with a controlled extension at the bottom.',
  jumps: 'Land softly and keep your knees tracking forward.',
};

function coachingTakeaway(summary: SessionSummary | null, mode: ExerciseMode) {
  if (!summary) return { strength: 'Your session is saved locally.', next: NEXT_FOCUS[mode] };
  if (summary.warningCount === 0) {
    return { strength: 'No major form issues were detected in this set.', next: NEXT_FOCUS[mode] };
  }
  if (summary.avgDepth >= 0.7) {
    return { strength: 'You kept a consistent range through the set.', next: NEXT_FOCUS[mode] };
  }
  return {
    strength: 'You completed the set and gave the coach a useful baseline.',
    next: NEXT_FOCUS[mode],
  };
}

export function SessionRecap({ mode, reps, summary, onTryAgain }: SessionRecapProps) {
  const takeaway = coachingTakeaway(summary, mode);
  return (
    <section
      className="session-recap studio-card studio-card__body motion-enter"
      aria-labelledby="session-recap-title"
    >
      <div className="session-recap__headline">
        <div>
          <p>Coaching recap</p>
          <h2 id="session-recap-title">
            {reps} {mode}
          </h2>
        </div>
        <span>{summary ? `${Math.round(summary.duration)}s` : 'Saved'}</span>
      </div>
      <div className="session-recap__item studio-card__item session-recap__item--good motion-enter motion-delay-1">
        <CheckCircle2 size={17} />
        <div>
          <p>What went well</p>
          <strong>{takeaway.strength}</strong>
        </div>
      </div>
      <div className="session-recap__item studio-card__item motion-enter motion-delay-2">
        <ArrowRight size={17} />
        <div>
          <p>Next set focus</p>
          <strong>{takeaway.next}</strong>
        </div>
      </div>
      {onTryAgain && (
        <button type="button" className="studio-card__button" onClick={onTryAgain}>
          <RotateCcw size={16} /> Try another set
        </button>
      )}
    </section>
  );
}

export default SessionRecap;

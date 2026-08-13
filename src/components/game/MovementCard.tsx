'use client';

import React from 'react';
import { Activity, AlertTriangle, Gauge, Move, Scale } from 'lucide-react';
import type { MovementAssessment } from '@/types/movementAssessment';

type MovementCardProps = {
  assessment?: MovementAssessment | null;
};

const INCONCLUSIVE_COPY: Record<string, string> = {
  invalid_protocol: 'This capture did not match the selected baseline protocol.',
  insufficient_reps: 'Complete the exact five-rep baseline to create a movement card.',
  insufficient_trace: 'The coach needs a little more movement data before creating a card.',
  low_visibility: 'Keep both arms in frame with steady lighting, then try the baseline again.',
  unstable_tracking: 'The camera lost a steady read. Try again with a clearer, calmer setup.',
  high_noise: 'The movement signal was too noisy to summarize this time.',
};

function percent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

function confidenceLabel(value: number): string {
  if (value >= 0.8) return 'Clear read';
  if (value >= 0.65) return 'Usable read';
  return 'Early read';
}

export function MovementCard({ assessment }: MovementCardProps) {
  if (!assessment) return null;

  if (assessment.status === 'inconclusive') {
    return (
      <section
        className="movement-card movement-card--inconclusive"
        aria-labelledby="movement-card-title"
      >
        <div className="movement-card__header">
          <div className="movement-card__icon" aria-hidden="true">
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="movement-card__eyebrow">MOVEMENT BASELINE</p>
            <h3 id="movement-card-title">No card yet</h3>
          </div>
        </div>
        <p className="movement-card__copy">
          {INCONCLUSIVE_COPY[assessment.inconclusiveReason ?? 'insufficient_trace']}
        </p>
        <div className="movement-card__quality">
          <span>{assessment.quality.repCount}/5 reps</span>
          <span>{assessment.quality.traceFrames} frames observed</span>
          <span>{confidenceLabel(assessment.confidence)}</span>
        </div>
      </section>
    );
  }

  const measurements = assessment.measurements;
  if (!measurements) return null;

  const dimensions = [
    { label: 'Range signal', value: measurements.range, icon: Move },
    { label: 'Control', value: measurements.control, icon: Gauge },
    { label: 'Trace stability', value: measurements.traceStability, icon: Activity },
    { label: 'Symmetry', value: measurements.symmetry, icon: Scale },
  ];
  const insight = dimensions
    .filter((dimension) => dimension.value !== null && dimension.value !== undefined)
    .sort((a, b) => (a.value ?? 1) - (b.value ?? 1))[0];
  const insightCopy = insight
    ? `${insight.label} is the signal to watch this set — ${percent(insight.value)}.`
    : 'A private baseline from this five-rep curl protocol.';

  return (
    <section className="movement-card" aria-labelledby="movement-card-title">
      <div className="movement-card__header">
        <div className="movement-card__icon" aria-hidden="true">
          <Move size={16} />
        </div>
        <div>
          <p className="movement-card__eyebrow">MOVEMENT BASELINE · {assessment.protocolId}</p>
          <h3 id="movement-card-title">Your first movement card</h3>
        </div>
        <span className="movement-card__confidence">{confidenceLabel(assessment.confidence)}</span>
      </div>
      <p className="movement-card__copy">
        <strong className="movement-card__insight">{insightCopy}</strong> Curls show what the robot
        can mirror — a movement signal, not a medical assessment.
      </p>
      <div className="movement-card__dimensions">
        {dimensions.map(({ label, value, icon: Icon }) => (
          <div key={label} className="movement-card__dimension">
            <div className="movement-card__dimension-top">
              <span>{label}</span>
              <Icon size={13} aria-hidden="true" />
            </div>
            <strong>{percent(value)}</strong>
            {value !== null && (
              <span className="movement-card__bar">
                <span style={{ width: percent(value) }} />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="movement-card__next">
        <span className="movement-card__next-label">NEXT TIME</span>
        <strong>Repeat the same setup to see what changes.</strong>
      </div>
    </section>
  );
}

export default MovementCard;

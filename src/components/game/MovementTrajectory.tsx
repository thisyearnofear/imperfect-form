'use client';

import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Compass,
  Minus,
  Sparkles,
} from 'lucide-react';
import { buildMovementTrajectory } from '@/lib/movementTrajectory';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';
import type { MovementTrajectory as MovementTrajectoryModel } from '@/types/movementTrajectory';

const CONFIDENCE_COPY: Record<MovementTrajectoryModel['confidence'], string> = {
  'insufficient-data': 'No trajectory yet',
  'early-estimate': 'Early estimate',
  'emerging-trend': 'Emerging trend',
  'reliable-trend': 'Reliable local trend',
};

function percent(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

function trendCopy(trajectory: MovementTrajectoryModel): string {
  if (trajectory.latestStatus === 'inconclusive') {
    return 'The latest read was inconclusive, so it stays out of the line. Repeat the same setup when you are ready.';
  }
  if (trajectory.latestStatus === 'low-confidence') {
    return 'The latest read was too unclear to move the line. Keep it as context, not a result.';
  }
  if (trajectory.confidence === 'insufficient-data') {
    return 'One clear read creates a starting line. A second read in about 7 days shows whether anything is changing.';
  }
  if (trajectory.direction === 'up') {
    return 'Your recent local reads are moving upward on the selected signal. Keep the setup consistent before drawing a bigger conclusion.';
  }
  if (trajectory.direction === 'down') {
    return 'The latest local read is lower on the selected signal. Treat it as information, not a verdict, and repeat the setup before changing course.';
  }
  return 'Your recent local reads are holding roughly steady. That is useful information; keep practicing and retest under the same conditions.';
}

function TrendMark({ direction }: { direction: MovementTrajectoryModel['direction'] }) {
  if (direction === 'up') return <ArrowUpRight size={15} aria-hidden="true" />;
  if (direction === 'down') return <ArrowDownRight size={15} aria-hidden="true" />;
  if (direction === 'flat') return <Minus size={15} aria-hidden="true" />;
  return <Compass size={15} aria-hidden="true" />;
}

export function MovementTrajectory({
  records,
  protocolId = 'curls-baseline',
}: {
  records: StoredMovementAssessment[];
  protocolId?: string;
}) {
  const trajectory = buildMovementTrajectory(records, protocolId);
  const hasEvidence = trajectory.qualifyingReads > 0 || trajectory.latestStatus !== 'none';
  if (!hasEvidence) return null;

  return (
    <section className="movement-trajectory" aria-labelledby="movement-trajectory-title">
      <div className="movement-trajectory__header">
        <div className="movement-trajectory__title">
          <div className="movement-trajectory__icon" aria-hidden="true">
            <Compass size={15} />
          </div>
          <div>
            <p className="movement-trajectory__eyebrow">LOCAL LINE</p>
            <h3 id="movement-trajectory-title">Your next unlock</h3>
          </div>
        </div>
        <span className="movement-trajectory__confidence">
          {CONFIDENCE_COPY[trajectory.confidence]}
        </span>
      </div>

      <div
        className="movement-trajectory__signal"
        role="status"
        aria-label="Movement trajectory summary"
      >
        <div className="movement-trajectory__signal-mark">
          <TrendMark direction={trajectory.direction} />
        </div>
        <div>
          <strong>
            {trajectory.trendDimension === 'range'
              ? 'Range signal'
              : trajectory.trendDimension === 'control'
                ? 'Control signal'
                : 'Starting line'}
          </strong>
          <span>{trendCopy(trajectory)}</span>
        </div>
      </div>

      <div className="movement-trajectory__stats">
        <div>
          <span>Current</span>
          <strong>{percent(trajectory.currentValue)}</strong>
        </div>
        <div>
          <span>Reads in line</span>
          <strong>{trajectory.qualifyingReads}</strong>
        </div>
        <div>
          <span>Weekly direction</span>
          <strong>
            {trajectory.trendPerWeek === null
              ? '—'
              : `${trajectory.trendPerWeek > 0 ? '+' : ''}${Math.round(trajectory.trendPerWeek * 100)}%`}
          </strong>
        </div>
      </div>

      {/* Sparkline visualization */}
      {trajectory.qualifyingReads > 1 && (
        <div className="movement-trajectory__sparkline" aria-hidden="true">
          {Array.from({ length: Math.min(trajectory.qualifyingReads, 10) }).map((_, i) => {
            const height =
              trajectory.direction === 'up'
                ? 20 + (i * 80) / Math.min(trajectory.qualifyingReads, 10)
                : trajectory.direction === 'down'
                  ? 100 - (i * 80) / Math.min(trajectory.qualifyingReads, 10)
                  : 50 + (Math.random() - 0.5) * 20;
            return (
              <div
                key={i}
                className="movement-trajectory__sparkline-bar"
                style={{
                  height: `${Math.max(10, Math.min(100, height))}%`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            );
          })}
        </div>
      )}

      <div className="movement-trajectory__unlock">
        <div className="movement-trajectory__unlock-heading">
          <Sparkles size={14} aria-hidden="true" />
          <span>{trajectory.nextUnlock.label}</span>
        </div>
        <strong>{trajectory.nextUnlock.practiceFocus}</strong>
        <div className="movement-trajectory__unlock-meta">
          <span>
            {trajectory.nextUnlock.targetValue === null
              ? trajectory.qualifyingReads < 2
                ? 'Build the comparison first'
                : 'Keep building the local line'
              : `Next signal target · ${percent(trajectory.nextUnlock.targetValue)}`}
          </span>
          <span>
            <CalendarClock size={12} aria-hidden="true" /> Retest in about {trajectory.retestDays}{' '}
            days
          </span>
        </div>
      </div>

      <p className="movement-trajectory__note">
        Self-comparison only · no population norm or prediction. Confidence rises with clear,
        repeatable reads.
      </p>
    </section>
  );
}

export default MovementTrajectory;

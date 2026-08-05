'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Ghost, Play, TrendingDown, TrendingUp } from 'lucide-react';
import type { SessionSummary } from '@/services/sessionLogger';
import { getLocalWorkouts } from '@/services/integrations/WorkoutDataAdapter';
import {
  appendCurrentSignature,
  buildFormSignature,
  buildFormSignatureHistory,
  chooseSelfGhostWorkout,
  type FormSignaturePoint,
} from '@/lib/progress/formSignature';
import type { ExerciseMode } from '@/utils/biomechanics';
import type { LocalWorkout } from '@/types/workout';
import { getEffectiveUserId } from '@/services/guestIdentity';

type FormSignatureHistoryProps = {
  mode: ExerciseMode;
  reps: number;
  summary: SessionSummary | null;
  userAddress?: string;
  onStartSelfGhost?: (workoutId: string) => void;
};

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function trend(points: FormSignaturePoint[]) {
  if (points.length < 2) return null;
  const first = points[0].signature.averageDepth;
  const last = points[points.length - 1].signature.averageDepth;
  if (Math.abs(last - first) < 0.03) return 'steady';
  return last > first ? 'up' : 'down';
}

export function FormSignatureHistory({
  mode,
  reps,
  summary,
  userAddress,
  onStartSelfGhost,
}: FormSignatureHistoryProps) {
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [expanded, setExpanded] = useState(false);
  const effectiveUserId = useMemo(() => getEffectiveUserId(userAddress), [userAddress]);

  useEffect(() => {
    let active = true;
    void getLocalWorkouts().then((stored) => {
      if (active) setWorkouts(stored);
    });
    return () => {
      active = false;
    };
  }, [effectiveUserId, mode, summary?.startTime]);

  const current = useMemo(
    () =>
      summary
        ? {
            timestamp: summary.startTime,
            reps,
            signature: buildFormSignature(summary),
          }
        : null,
    [reps, summary]
  );

  const points = useMemo(
    () =>
      appendCurrentSignature(
        buildFormSignatureHistory(workouts, mode, 6, effectiveUserId),
        current
      ),
    [current, effectiveUserId, mode, workouts]
  );

  const ghostWorkout = useMemo(
    () => chooseSelfGhostWorkout(workouts, mode, summary?.startTime, effectiveUserId),
    [effectiveUserId, mode, summary?.startTime, workouts]
  );
  const latest = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const depthDelta =
    latest && previous ? latest.signature.averageDepth - previous.signature.averageDepth : 0;
  const currentSignature = current?.signature || latest?.signature;
  const currentModeLabel = mode.replace(/s$/, '');
  const currentTrend = trend(points);
  const visiblePoints = expanded ? points : points.slice(-2);

  if (!currentSignature && points.length === 0) return null;

  return (
    <section className="form-signature" aria-labelledby="form-signature-title">
      <div className="form-signature__header">
        <div>
          <p className="form-signature__eyebrow">Personal record</p>
          <h3 id="form-signature-title">Your form signature</h3>
        </div>
        {currentTrend === 'up' && <TrendingUp size={17} aria-label="Depth trending up" />}
        {currentTrend === 'down' && <TrendingDown size={17} aria-label="Depth trending down" />}
      </div>

      {currentSignature && (
        <div className="form-signature__metrics">
          <div>
            <strong>{percent(currentSignature.averageDepth)}</strong>
            <span>depth</span>
          </div>
          <div>
            <strong>{percent(currentSignature.depthConsistency)}</strong>
            <span>consistency</span>
          </div>
          <div>
            <strong>{percent(1 - currentSignature.observationRate)}</strong>
            <span>quiet reps</span>
          </div>
        </div>
      )}

      {points.length > 1 && (
        <div
          className="form-signature__history"
          role="list"
          aria-label={`${points.length} ${currentModeLabel} form signatures`}
        >
          {visiblePoints.map((point) => (
            <div
              key={point.timestamp}
              className="form-signature__history-point"
              role="listitem"
              aria-label={`${point.label}: ${percent(point.signature.averageDepth)} depth, ${point.reps} reps`}
            >
              <span
                className="form-signature__history-bar"
                style={{ height: `${Math.max(18, point.signature.averageDepth * 100)}%` }}
                title={`${point.label}: ${percent(point.signature.averageDepth)} depth`}
                aria-hidden="true"
              />
              <span aria-hidden="true">{point.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="form-signature__note" aria-live="polite">
        {depthDelta > 0.03
          ? `Deeper than your last ${currentModeLabel}. Keep this line.`
          : depthDelta < -0.03
            ? `A little shallower than last time. Your next set has a clear target.`
            : points.length > 1
              ? `Holding steady across ${points.length} sessions.`
              : 'This is your first recorded signature.'}
      </div>

      {ghostWorkout && onStartSelfGhost && (
        <div className="form-signature__ghost">
          <div className="form-signature__ghost-copy">
            <Ghost size={16} aria-hidden="true" />
            <div>
              <strong>Race your best line</strong>
              <span>{ghostWorkout.reps} reps · your own trace</span>
            </div>
          </div>
          <button
            type="button"
            className="form-signature__ghost-button"
            onClick={() => onStartSelfGhost(ghostWorkout.id)}
          >
            <Play size={13} aria-hidden="true" /> Run it back
          </button>
        </div>
      )}

      {points.length > 2 && (
        <button
          type="button"
          className="form-signature__toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Hide history' : `View ${points.length}-session history`}
        </button>
      )}
    </section>
  );
}

export default FormSignatureHistory;

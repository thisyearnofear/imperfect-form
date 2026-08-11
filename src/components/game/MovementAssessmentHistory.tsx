'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, Clock3, History, Minus } from 'lucide-react';
import { getEffectiveUserId } from '@/services/guestIdentity';
import {
  getLocalMovementAssessments,
  type StoredMovementAssessment,
} from '@/services/integrations/MovementAssessmentDataAdapter';
import {
  buildMovementAssessmentHistory,
  formatSignedPercent,
  measurementDelta,
} from '@/lib/movementAssessmentHistory';
import type { MovementAssessment } from '@/types/movementAssessment';

const INCONCLUSIVE_COPY: Record<string, string> = {
  invalid_protocol: 'This capture belongs to a different baseline protocol.',
  insufficient_reps: 'The exact five-rep baseline was not completed.',
  insufficient_trace: 'The trace was too short to compare.',
  low_visibility: 'The camera read was too incomplete to compare.',
  unstable_tracking: 'The camera read was not steady enough to compare.',
  high_noise: 'The movement signal was too noisy to compare.',
};

type MovementAssessmentHistoryProps = {
  userAddress?: string;
  currentAssessment?: MovementAssessment | null;
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function Delta({ value }: { value: number | null }) {
  const formatted = formatSignedPercent(value);
  if (!formatted) return <Minus size={13} aria-label="No comparison" />;
  const isPositive = value !== null && value > 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={
        isPositive
          ? 'movement-history__delta movement-history__delta--up'
          : 'movement-history__delta'
      }
    >
      <Icon size={13} aria-hidden="true" /> {formatted}
    </span>
  );
}

export function MovementAssessmentHistory({
  userAddress,
  currentAssessment,
}: MovementAssessmentHistoryProps) {
  const [stored, setStored] = useState<StoredMovementAssessment[]>([]);
  const effectiveUserId = useMemo(() => getEffectiveUserId(userAddress), [userAddress]);

  useEffect(() => {
    let active = true;
    void getLocalMovementAssessments(effectiveUserId)
      .then((records) => {
        if (active) setStored(records);
      })
      .catch(() => {
        if (active) setStored([]);
      });
    return () => {
      active = false;
    };
  }, [effectiveUserId, currentAssessment?.capturedAt]);

  const records = useMemo(() => {
    const currentRecord = currentAssessment
      ? {
          id: `current-${currentAssessment.capturedAt}`,
          userId: effectiveUserId,
          sourceSessionId: `current-${currentAssessment.capturedAt}`,
          savedAt: currentAssessment.capturedAt,
          assessment: currentAssessment,
        }
      : null;
    const all = currentRecord
      ? [
          currentRecord,
          ...stored.filter(
            (record) => record.assessment.capturedAt !== currentAssessment?.capturedAt
          ),
        ]
      : stored;
    return buildMovementAssessmentHistory(all, 'curls-baseline');
  }, [currentAssessment, effectiveUserId, stored]);

  if (records.records.length === 0) return null;

  const latest = records.latest?.assessment ?? null;
  const comparison = records.comparison;
  const rangeDelta = measurementDelta(comparison, 'range');
  const stabilityDelta = measurementDelta(comparison, 'traceStability');
  const currentIsInconclusive = latest?.status === 'inconclusive';

  return (
    <section className="movement-history" aria-labelledby="movement-history-title">
      <div className="movement-history__header">
        <div className="movement-history__title">
          <div className="movement-history__icon" aria-hidden="true">
            <History size={15} />
          </div>
          <div>
            <p className="movement-history__eyebrow">YOU VS. YOU</p>
            <h3 id="movement-history-title">Movement history</h3>
          </div>
        </div>
        <span className="movement-history__count">
          {records.records.length} read{records.records.length === 1 ? '' : 's'}
        </span>
      </div>

      {currentIsInconclusive ? (
        <div className="movement-history__notice movement-history__notice--quiet">
          <Activity size={14} aria-hidden="true" />
          <span>{INCONCLUSIVE_COPY[latest?.inconclusiveReason ?? 'insufficient_trace']}</span>
        </div>
      ) : comparison?.comparable ? (
        <div
          className="movement-history__comparison"
          aria-label="Change from the previous valid baseline"
        >
          <div>
            <span>Range signal</span>
            <strong>
              <Delta value={rangeDelta} />
            </strong>
          </div>
          <div>
            <span>Trace stability</span>
            <strong>
              <Delta value={stabilityDelta} />
            </strong>
          </div>
          <p>
            {comparison.repeatable
              ? 'The two captures are comparable.'
              : 'The captures differ; repeat the same setup for a clearer line.'}
          </p>
        </div>
      ) : (
        <div className="movement-history__notice">
          <Clock3 size={14} aria-hidden="true" />
          <span>First recorded baseline. Repeat the same setup to build your history.</span>
        </div>
      )}

      <div className="movement-history__list" role="list" aria-label="Movement baseline history">
        {records.records.slice(0, 4).map((record) => (
          <div className="movement-history__row" key={record.id} role="listitem">
            <span className="movement-history__date">
              {formatDate(record.assessment.capturedAt)}
            </span>
            <span className="movement-history__status">
              {record.assessment.status === 'valid' ? 'Valid baseline' : 'Inconclusive read'}
            </span>
            {record.assessment.status === 'valid' && record.assessment.measurements ? (
              <span className="movement-history__signal">
                {Math.round(record.assessment.measurements.range * 100)}% range
              </span>
            ) : (
              <span className="movement-history__signal">Not compared</span>
            )}
          </div>
        ))}
      </div>
      {records.records.length > 4 && (
        <p className="movement-history__footer">Showing the latest four local reads.</p>
      )}
    </section>
  );
}

export default MovementAssessmentHistory;

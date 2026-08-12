'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Download,
  History,
  LockKeyhole,
  Minus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { getEffectiveUserId } from '@/services/guestIdentity';
import {
  clearLocalMovementAssessments,
  createMovementAssessmentExport,
  exportLocalMovementAssessments,
  getLocalMovementAssessments,
  type StoredMovementAssessment,
} from '@/services/integrations/MovementAssessmentDataAdapter';
import {
  buildMovementAssessmentHistory,
  formatSignedPercent,
  measurementDelta,
} from '@/lib/movementAssessmentHistory';
import type { MovementAssessment } from '@/types/movementAssessment';
import MovementTrajectoryView from './MovementTrajectory';

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

type DataAction = 'idle' | 'exported' | 'reset' | 'error';

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

function downloadExport(payload: ReturnType<typeof createMovementAssessmentExport>): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `imperfect-form-movement-${date}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give WebKit and other browsers time to begin the download before cleanup.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function MovementAssessmentHistory({
  userAddress,
  currentAssessment,
}: MovementAssessmentHistoryProps) {
  const [stored, setStored] = useState<StoredMovementAssessment[]>([]);
  const [dataAction, setDataAction] = useState<DataAction>('idle');
  const [confirmReset, setConfirmReset] = useState(false);
  const [hiddenCurrentCapturedAt, setHiddenCurrentCapturedAt] = useState<number | null>(null);
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

  useEffect(() => {
    if (currentAssessment?.capturedAt !== hiddenCurrentCapturedAt) {
      setDataAction('idle');
    }
  }, [currentAssessment?.capturedAt, hiddenCurrentCapturedAt]);

  const records = useMemo(() => {
    const currentRecord =
      currentAssessment && currentAssessment.capturedAt !== hiddenCurrentCapturedAt
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
  }, [currentAssessment, effectiveUserId, hiddenCurrentCapturedAt, stored]);

  const handleExport = async () => {
    try {
      const storedExport = await exportLocalMovementAssessments(effectiveUserId);
      const currentIsStored = currentAssessment
        ? storedExport.records.some(
            (record) => record.assessment.capturedAt === currentAssessment.capturedAt
          )
        : true;
      const recordsForExport =
        currentAssessment &&
        !currentIsStored &&
        currentAssessment.capturedAt !== hiddenCurrentCapturedAt
          ? [
              {
                id: `current-${currentAssessment.capturedAt}`,
                userId: effectiveUserId,
                sourceSessionId: `current-${currentAssessment.capturedAt}`,
                savedAt: currentAssessment.capturedAt,
                assessment: currentAssessment,
              },
              ...storedExport.records,
            ]
          : storedExport.records;
      downloadExport(createMovementAssessmentExport(recordsForExport, effectiveUserId));
      setDataAction('exported');
    } catch {
      setDataAction('error');
    }
  };

  const handleReset = async () => {
    try {
      await clearLocalMovementAssessments(effectiveUserId);
      setStored([]);
      setHiddenCurrentCapturedAt(currentAssessment?.capturedAt ?? null);
      setConfirmReset(false);
      setDataAction('reset');
    } catch {
      setDataAction('error');
    }
  };

  const hasRecords = records.records.length > 0;
  if (!hasRecords && dataAction === 'idle') return null;

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
        <div className="movement-history__header-actions">
          <span className="movement-history__count">
            {records.records.length} read{records.records.length === 1 ? '' : 's'}
          </span>
          {hasRecords && (
            <button
              type="button"
              className="movement-history__data-button"
              onClick={handleExport}
              aria-label="Export local movement history"
            >
              <Download size={12} aria-hidden="true" /> Export
            </button>
          )}
        </div>
      </div>

      <details className="movement-history__privacy">
        <summary>
          <ShieldCheck size={13} aria-hidden="true" />
          <span>Local data controls</span>
        </summary>
        <div className="movement-history__privacy-copy">
          <p>
            Your movement reads are kept in this browser&apos;s private IndexedDB storage. No video,
            camera frames, or movement-history payload is uploaded by this card. The app may still
            send coarse product analytics such as a read&apos;s start or completion; those events do
            not include video, frames, or the saved assessment history. Connecting a wallet only
            re-keys this local history; it does not make this assessment an on-chain record.
          </p>
          <div className="movement-history__privacy-actions">
            {hasRecords && (
              <button
                type="button"
                className="movement-history__data-button movement-history__data-button--danger"
                onClick={() => setConfirmReset((value) => !value)}
              >
                <Trash2 size={12} aria-hidden="true" /> Reset local history
              </button>
            )}
            {confirmReset && (
              <div className="movement-history__reset-confirm" role="alert">
                <span>This removes only this local profile&apos;s movement reads.</span>
                <div>
                  <button type="button" onClick={() => setConfirmReset(false)}>
                    Keep history
                  </button>
                  <button type="button" onClick={() => void handleReset()}>
                    Reset reads
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </details>

      {dataAction !== 'idle' && (
        <p className="movement-history__data-status" role="status" aria-live="polite">
          {dataAction === 'exported' && 'Local movement history exported. Nothing was uploaded.'}
          {dataAction === 'reset' && 'Local movement history reset for this profile.'}
          {dataAction === 'error' && 'That local data action could not be completed.'}
        </p>
      )}

      {!hasRecords ? (
        <div className="movement-history__notice">
          <LockKeyhole size={14} aria-hidden="true" />
          <span>No local movement reads remain on this profile.</span>
        </div>
      ) : (
        <>
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

          <div className="movement-history__setup-reminder">
            <Clock3 size={13} aria-hidden="true" />
            <span>
              For a meaningful self-comparison, keep camera height, distance, angle, lighting, and
              warm-up similar. The local line does not yet correct for changed setup conditions.
            </span>
          </div>

          <div
            className="movement-history__list"
            role="list"
            aria-label="Movement baseline history"
          >
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
          <MovementTrajectoryView records={records.records} protocolId="curls-baseline" />
        </>
      )}
    </section>
  );
}

export default MovementAssessmentHistory;

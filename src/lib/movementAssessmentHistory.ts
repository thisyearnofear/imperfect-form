import { compareMovementAssessments } from '@/lib/movementAssessment';
import type { MovementAssessmentComparison } from '@/types/movementAssessment';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';

export type MovementAssessmentHistoryState = {
  records: StoredMovementAssessment[];
  latest: StoredMovementAssessment | null;
  previousValid: StoredMovementAssessment | null;
  comparison: MovementAssessmentComparison | null;
};

/**
 * Keep history newest-first and only compare protocol-matched M0 records.
 * Inconclusive records remain visible as capture history but never produce
 * deltas or implied performance claims.
 */
export function buildMovementAssessmentHistory(
  records: StoredMovementAssessment[],
  protocolId?: string
): MovementAssessmentHistoryState {
  const filtered = [...records]
    .filter((record) => isMovementAssessment(record.assessment))
    .filter((record) => !protocolId || record.assessment.protocolId === protocolId)
    .sort((a, b) => {
      const aTime = a.assessment.capturedAt || a.savedAt;
      const bTime = b.assessment.capturedAt || b.savedAt;
      return bTime - aTime;
    });
  const latest = filtered[0] ?? null;
  const previousValid =
    latest && latest.assessment.status === 'valid'
      ? (filtered.find(
          (record) => record.id !== latest.id && record.assessment.status === 'valid'
        ) ?? null)
      : (filtered.find((record) => record.assessment.status === 'valid') ?? null);
  const comparison =
    latest && previousValid && latest.id !== previousValid.id
      ? compareMovementAssessments(previousValid.assessment, latest.assessment)
      : null;

  return { records: filtered, latest, previousValid, comparison };
}

export function measurementDelta(
  comparison: MovementAssessmentComparison | null,
  dimension: 'range' | 'traceStability'
): number | null {
  if (!comparison?.comparable) return null;
  return dimension === 'range' ? comparison.rangeDelta : comparison.traceStabilityDelta;
}

export function formatSignedPercent(value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  const percent = Math.round(value * 100);
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

export function isMovementAssessment(value: unknown): value is MovementAssessment {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MovementAssessment>;
  if (
    candidate.version !== '1.0' ||
    candidate.protocolVersion !== '1.0' ||
    typeof candidate.protocolId !== 'string' ||
    typeof candidate.mode !== 'string' ||
    !Number.isFinite(candidate.capturedAt) ||
    !Number.isFinite(candidate.confidence) ||
    (candidate.status !== 'valid' && candidate.status !== 'inconclusive')
  ) {
    return false;
  }

  const quality = candidate.quality;
  if (
    !quality ||
    !Number.isFinite(quality.poseConfidence) ||
    !Number.isFinite(quality.observedFrameRatio) ||
    !Number.isFinite(quality.bilateralFrameRatio) ||
    !Number.isFinite(quality.stableFrameRatio) ||
    !Number.isFinite(quality.traceFrames) ||
    !Number.isFinite(quality.repCount)
  ) {
    return false;
  }

  if (candidate.status === 'inconclusive') return candidate.measurements === null;
  const measurements = candidate.measurements;
  return Boolean(
    measurements &&
    Number.isFinite(measurements.range) &&
    Number.isFinite(measurements.control) &&
    Number.isFinite(measurements.traceStability) &&
    (measurements.symmetry === null || Number.isFinite(measurements.symmetry))
  );
}

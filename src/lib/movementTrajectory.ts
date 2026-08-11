import { compareMovementAssessments } from '@/lib/movementAssessment';
import { isMovementAssessment } from '@/lib/movementAssessmentHistory';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';
import type {
  MovementNextUnlock,
  MovementTrajectory,
  MovementTrajectoryDimension,
} from '@/types/movementTrajectory';

const MIN_CONFIDENCE = 0.65;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_MEANINGFUL_DELTA = 0.03;
function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function sortNewestFirst(records: StoredMovementAssessment[]): StoredMovementAssessment[] {
  return [...records].sort((a, b) => {
    const aTime = a.assessment.capturedAt || a.savedAt;
    const bTime = b.assessment.capturedAt || b.savedAt;
    return bTime - aTime;
  });
}

function valueFor(
  record: StoredMovementAssessment,
  dimension: MovementTrajectoryDimension
): number {
  return record.assessment.measurements?.[dimension] ?? 0;
}

function chooseDimension(record: StoredMovementAssessment): MovementTrajectoryDimension {
  const measurements = record.assessment.measurements;
  if (!measurements) return 'range';
  return measurements.range <= measurements.control ? 'range' : 'control';
}

function confidenceFor(
  qualifyingReads: number,
  comparablePairs: number,
  repeatability: number | null
): MovementTrajectory['confidence'] {
  if (qualifyingReads === 0) return 'insufficient-data';
  if (qualifyingReads === 1) return 'early-estimate';
  if (
    qualifyingReads < 4 ||
    comparablePairs < 3 ||
    repeatability === null ||
    repeatability < 0.67
  ) {
    return 'emerging-trend';
  }
  return 'reliable-trend';
}

function directionFor(
  currentValue: number | null,
  previousValue: number | null
): MovementTrajectory['direction'] {
  if (currentValue === null || previousValue === null) return 'unknown';
  const delta = currentValue - previousValue;
  if (Math.abs(delta) < MIN_MEANINGFUL_DELTA) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

function nextUnlockFor(
  current: StoredMovementAssessment | null,
  qualifyingReads: number,
  dimension: MovementTrajectoryDimension | null
): MovementNextUnlock {
  if (!current || !dimension) {
    return {
      dimension: null,
      label: 'Find your starting line',
      practiceFocus:
        'Complete one clear five-rep read, then repeat the same setup in about 7 days.',
      currentValue: null,
      targetValue: null,
    };
  }

  const currentValue = clamp(valueFor(current, dimension));
  // Keep the unlock qualitative until protocol validation establishes a
  // defensible numeric milestone. A fixed percentage step would imply false
  // precision from an uncalibrated signal.
  const targetValue = null;
  const isRange = dimension === 'range';

  return {
    dimension,
    label:
      qualifyingReads < 2
        ? 'Repeat the baseline'
        : isRange
          ? 'Carry more range with control'
          : 'Make the range steadier',
    practiceFocus: isRange
      ? 'Use a calm, comfortable range and keep the same camera setup for the next read.'
      : 'Move smoothly through the same range and keep the elbow path quiet on the next read.',
    currentValue,
    targetValue,
  };
}

function repeatabilityFor(records: StoredMovementAssessment[]): {
  score: number | null;
  comparablePairs: number;
} {
  if (records.length < 2) return { score: null, comparablePairs: 0 };
  let repeatable = 0;
  let comparablePairs = 0;

  for (let index = records.length - 1; index > 0; index -= 1) {
    const older = records[index];
    const newer = records[index - 1];
    const comparison = compareMovementAssessments(older.assessment, newer.assessment);
    if (!comparison.comparable) continue;
    comparablePairs += 1;
    if (comparison.repeatable) repeatable += 1;
  }

  return {
    score: comparablePairs > 0 ? repeatable / comparablePairs : null,
    comparablePairs,
  };
}

function trendPerWeekFor(
  records: StoredMovementAssessment[],
  dimension: MovementTrajectoryDimension
): number | null {
  if (records.length < 2) return null;
  const oldest = records[records.length - 1];
  const newest = records[0];
  const oldestTime = oldest.assessment.capturedAt || oldest.savedAt;
  const newestTime = newest.assessment.capturedAt || newest.savedAt;
  const elapsedMs = newestTime - oldestTime;
  if (elapsedMs < WEEK_MS) return null;
  const elapsedWeeks = elapsedMs / WEEK_MS;
  return (valueFor(newest, dimension) - valueFor(oldest, dimension)) / elapsedWeeks;
}

/**
 * Build a self-versus-self trajectory from valid, protocol-matched local reads.
 * Low-confidence and inconclusive captures stay visible in history but never
 * become evidence for a trend.
 */
export function buildMovementTrajectory(
  records: StoredMovementAssessment[],
  protocolId = 'curls-baseline'
): MovementTrajectory {
  const sorted = sortNewestFirst(
    records.filter(
      (record) =>
        isMovementAssessment(record.assessment) && record.assessment.protocolId === protocolId
    )
  );
  const valid = sorted.filter((record) => record.assessment.status === 'valid');
  const qualifying = valid.filter((record) => record.assessment.confidence >= MIN_CONFIDENCE);
  const current = qualifying[0] ?? null;
  const dimension = current ? chooseDimension(current) : null;
  const previous = current && qualifying[1] ? qualifying[1] : null;
  const currentValue = current && dimension ? clamp(valueFor(current, dimension)) : null;
  const previousValue = previous && dimension ? clamp(valueFor(previous, dimension)) : null;
  const repeatability = repeatabilityFor(qualifying);
  const elapsedTrajectoryMs =
    qualifying.length > 1
      ? (qualifying[0].assessment.capturedAt || qualifying[0].savedAt) -
        (qualifying[qualifying.length - 1].assessment.capturedAt ||
          qualifying[qualifying.length - 1].savedAt)
      : 0;
  const hasMinimumSpan = elapsedTrajectoryMs >= WEEK_MS;
  const latest = sorted[0];
  const latestStatus: MovementTrajectory['latestStatus'] = !latest
    ? 'none'
    : latest.assessment.status === 'inconclusive'
      ? 'inconclusive'
      : latest.assessment.confidence < MIN_CONFIDENCE
        ? 'low-confidence'
        : 'included';

  return {
    protocolId,
    qualifyingReads: qualifying.length,
    totalValidReads: valid.length,
    confidence: confidenceFor(
      qualifying.length,
      hasMinimumSpan ? repeatability.comparablePairs : 0,
      repeatability.score
    ),
    direction: directionFor(currentValue, previousValue),
    trendDimension: dimension,
    trendPerWeek: dimension ? trendPerWeekFor(qualifying, dimension) : null,
    currentValue,
    previousValue,
    repeatability: repeatability.score,
    latestStatus,
    nextUnlock: nextUnlockFor(current, qualifying.length, dimension),
    retestDays: 7,
  };
}

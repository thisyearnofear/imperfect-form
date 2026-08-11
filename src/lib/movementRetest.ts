import { compareMovementAssessments } from '@/lib/movementAssessment';
import { isMovementAssessment } from '@/lib/movementAssessmentHistory';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';

export const RETEST_CONFIDENCE_FLOOR = 0.65;
export const RETEST_SIMILARITY_FLOOR = 0.7;
export const RETEST_REPEATABLE_PAIR_RATE_FLOOR = 0.7;
export const RETEST_MINIMUM_PAIRS = 2;
export const RETEST_MAX_INCONCLUSIVE_RATE = 0.25;
export const RETEST_MAX_LOW_CONFIDENCE_RATE = 0.25;

export type RetestEvidenceStatus = 'insufficient-data' | 'reviewable' | 'passes-screen';

export type RetestEvidenceReport = {
  schema: 'imperfect-form.movement-retest.v1';
  protocolId: string;
  capturedAt: string;
  totalRecords: number;
  protocolRecords: number;
  malformedRecords: number;
  validReads: number;
  inconclusiveReads: number;
  lowConfidenceValidReads: number;
  inconclusiveRate: number | null;
  lowConfidenceRate: number | null;
  qualifyingReads: number;
  comparablePairs: number;
  averageConfidence: number | null;
  averageSimilarity: number | null;
  repeatablePairRate: number | null;
  averageAbsoluteRangeDelta: number | null;
  averageAbsoluteControlDelta: number | null;
  averageAbsoluteTraceStabilityDelta: number | null;
  spanDays: number | null;
  status: RetestEvidenceStatus;
  gates: {
    enoughPairs: boolean;
    confidenceFloor: boolean | null;
    similarityFloor: boolean | null;
    repeatablePairRateFloor: boolean | null;
    inconclusiveRate: boolean | null;
    lowConfidenceRate: boolean | null;
  };
  notes: string[];
};

type ComparablePair = {
  similarity: number;
  repeatable: boolean;
  rangeDelta: number;
  controlDelta: number;
  traceStabilityDelta: number;
};

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function assessmentTime(record: StoredMovementAssessment): number {
  return record.assessment.capturedAt || record.savedAt;
}

function sortChronologically(records: StoredMovementAssessment[]): StoredMovementAssessment[] {
  return [...records].sort((a, b) => assessmentTime(a) - assessmentTime(b));
}

function round(value: number | null, decimals = 4): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

function buildPairs(records: StoredMovementAssessment[]): ComparablePair[] {
  const pairs: ComparablePair[] = [];
  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1].assessment;
    const current = records[index].assessment;
    const comparison = compareMovementAssessments(previous, current);
    if (
      !comparison.comparable ||
      comparison.similarity === null ||
      comparison.rangeDelta === null ||
      comparison.traceStabilityDelta === null ||
      !previous.measurements ||
      !current.measurements
    ) {
      continue;
    }

    pairs.push({
      similarity: comparison.similarity,
      repeatable: comparison.repeatable,
      rangeDelta: comparison.rangeDelta,
      controlDelta: current.measurements.control - previous.measurements.control,
      traceStabilityDelta: comparison.traceStabilityDelta,
    });
  }
  return pairs;
}

/**
 * Summarize exported local assessment records for a descriptive test–retest
 * study. This is evidence about the capture protocol under observed setups,
 * not clinical validation or a population norm.
 */
export function buildMovementRetestReport(
  records: StoredMovementAssessment[],
  protocolId = 'curls-baseline',
  capturedAt = new Date().toISOString()
): RetestEvidenceReport {
  const protocolRecords = records.filter(
    (record) =>
      Boolean(record) &&
      isMovementAssessment(record.assessment) &&
      record.assessment.protocolId === protocolId
  );
  const malformedRecords = records.length - protocolRecords.length;
  const validReads = protocolRecords.filter((record) => record.assessment.status === 'valid');
  const inconclusiveReads = protocolRecords.length - validReads.length;
  const inconclusiveRate =
    protocolRecords.length > 0 ? inconclusiveReads / protocolRecords.length : null;
  const lowConfidenceValidReads = validReads.filter(
    (record) => record.assessment.confidence < RETEST_CONFIDENCE_FLOOR
  );
  const lowConfidenceRate =
    validReads.length > 0 ? lowConfidenceValidReads.length / validReads.length : null;
  const qualifyingReads = validReads.filter(
    (record) => record.assessment.confidence >= RETEST_CONFIDENCE_FLOOR
  );
  const sorted = sortChronologically(qualifyingReads);
  const pairs = buildPairs(sorted);
  const averageConfidence = round(
    average(qualifyingReads.map((record) => record.assessment.confidence))
  );
  const averageSimilarity = round(average(pairs.map((pair) => pair.similarity)));
  const repeatablePairRate = round(average(pairs.map((pair) => (pair.repeatable ? 1 : 0))));
  const averageAbsoluteRangeDelta = round(average(pairs.map((pair) => Math.abs(pair.rangeDelta))));
  const averageAbsoluteControlDelta = round(
    average(pairs.map((pair) => Math.abs(pair.controlDelta)))
  );
  const averageAbsoluteTraceStabilityDelta = round(
    average(pairs.map((pair) => Math.abs(pair.traceStabilityDelta)))
  );
  const spanDays =
    sorted.length > 1
      ? round(
          (assessmentTime(sorted[sorted.length - 1]) - assessmentTime(sorted[0])) / 86_400_000,
          2
        )
      : null;
  const enoughPairs = pairs.length >= RETEST_MINIMUM_PAIRS;
  const confidenceFloor =
    averageConfidence === null ? null : averageConfidence >= RETEST_CONFIDENCE_FLOOR;
  const similarityFloor =
    averageSimilarity === null ? null : averageSimilarity >= RETEST_SIMILARITY_FLOOR;
  const repeatablePairRateFloor =
    repeatablePairRate === null ? null : repeatablePairRate >= RETEST_REPEATABLE_PAIR_RATE_FLOOR;
  const inconclusiveRateGate =
    inconclusiveRate === null ? null : inconclusiveRate <= RETEST_MAX_INCONCLUSIVE_RATE;
  const lowConfidenceRateGate =
    lowConfidenceRate === null ? null : lowConfidenceRate <= RETEST_MAX_LOW_CONFIDENCE_RATE;
  const status: RetestEvidenceStatus = !enoughPairs
    ? 'insufficient-data'
    : confidenceFloor &&
        similarityFloor &&
        repeatablePairRateFloor &&
        inconclusiveRateGate &&
        lowConfidenceRateGate
      ? 'passes-screen'
      : 'reviewable';

  return {
    schema: 'imperfect-form.movement-retest.v1',
    protocolId,
    capturedAt,
    totalRecords: records.length,
    protocolRecords: protocolRecords.length,
    malformedRecords,
    validReads: validReads.length,
    inconclusiveReads,
    lowConfidenceValidReads: lowConfidenceValidReads.length,
    inconclusiveRate: round(inconclusiveRate),
    lowConfidenceRate: round(lowConfidenceRate),
    qualifyingReads: qualifyingReads.length,
    comparablePairs: pairs.length,
    averageConfidence,
    averageSimilarity,
    repeatablePairRate,
    averageAbsoluteRangeDelta,
    averageAbsoluteControlDelta,
    averageAbsoluteTraceStabilityDelta,
    spanDays,
    status,
    gates: {
      enoughPairs,
      confidenceFloor,
      similarityFloor,
      repeatablePairRateFloor,
      inconclusiveRate: inconclusiveRateGate,
      lowConfidenceRate: lowConfidenceRateGate,
    },
    notes: [
      'Descriptive local protocol evidence only; this report is not clinical validation or a population norm.',
      'Only valid, protocol-matched reads at or above the confidence floor contribute to comparable pairs.',
      'Review setup, device, lighting, camera angle, and warm-up conditions alongside these aggregates.',
    ],
  };
}

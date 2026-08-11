import { describe, expect, it } from 'vitest';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';
import type { MovementAssessment } from '@/types/movementAssessment';
import { buildMovementRetestReport } from '@/lib/movementRetest';

const DAY = 24 * 60 * 60 * 1000;

function assessment(partial: Partial<MovementAssessment> = {}): MovementAssessment {
  return {
    version: '1.0',
    protocolId: 'curls-baseline',
    protocolVersion: '1.0',
    mode: 'curls',
    capturedAt: 1_000,
    status: 'valid',
    confidence: 0.9,
    quality: {
      poseConfidence: 0.9,
      observedFrameRatio: 1,
      bilateralFrameRatio: 1,
      stableFrameRatio: 1,
      traceFrames: 12,
      repCount: 5,
    },
    measurements: {
      range: 0.5,
      control: 0.8,
      symmetry: 0.9,
      traceStability: 0.85,
    },
    ...partial,
  };
}

function record(
  id: string,
  capturedAt: number,
  partial: Partial<MovementAssessment> = {}
): StoredMovementAssessment {
  return {
    id,
    userId: 'guest-1',
    sourceSessionId: id,
    savedAt: capturedAt,
    assessment: assessment({ capturedAt, ...partial }),
  };
}

describe('movement retest evidence', () => {
  it('passes the screening gates for repeated comparable reads', () => {
    const report = buildMovementRetestReport(
      [
        record('one', DAY, {
          measurements: { range: 0.5, control: 0.8, symmetry: 0.9, traceStability: 0.85 },
        }),
        record('two', DAY * 8, {
          measurements: { range: 0.51, control: 0.8, symmetry: 0.9, traceStability: 0.85 },
        }),
        record('three', DAY * 15, {
          measurements: { range: 0.52, control: 0.79, symmetry: 0.9, traceStability: 0.84 },
        }),
      ],
      'curls-baseline',
      '2026-08-11T00:00:00.000Z'
    );

    expect(report.status).toBe('passes-screen');
    expect(report.comparablePairs).toBe(2);
    expect(report.inconclusiveReads).toBe(0);
    expect(report.averageSimilarity).toBeGreaterThanOrEqual(0.7);
    expect(report.gates).toEqual({
      enoughPairs: true,
      confidenceFloor: true,
      similarityFloor: true,
      repeatablePairRateFloor: true,
      inconclusiveRate: true,
      lowConfidenceRate: true,
    });
    expect(report.spanDays).toBe(14);
  });

  it('keeps malformed, other-protocol, inconclusive, and low-confidence reads out of pairs', () => {
    const report = buildMovementRetestReport([
      record('valid', DAY),
      record('inconclusive', DAY * 2, {
        status: 'inconclusive',
        measurements: null,
        inconclusiveReason: 'low_visibility',
      }),
      record('unclear', DAY * 3, { confidence: 0.5 }),
      record('other-protocol', DAY * 4, { protocolId: 'future-squat-baseline' }),
      { ...record('malformed', DAY * 5), assessment: { status: 'valid' } as never },
    ]);

    expect(report.protocolRecords).toBe(3);
    expect(report.malformedRecords).toBe(2);
    expect(report.validReads).toBe(2);
    expect(report.inconclusiveReads).toBe(1);
    expect(report.lowConfidenceValidReads).toBe(1);
    expect(report.lowConfidenceRate).toBe(0.5);
    expect(report.gates.lowConfidenceRate).toBe(false);
    expect(report.qualifyingReads).toBe(1);
    expect(report.comparablePairs).toBe(0);
    expect(report.status).toBe('insufficient-data');
  });

  it('keeps a high inconclusive rate reviewable even when valid pairs are stable', () => {
    const stable = [record('one', DAY), record('two', DAY * 8), record('three', DAY * 15)];
    const inconclusive = Array.from({ length: 10 }, (_, index) =>
      record(`bad-${index}`, DAY * (20 + index), {
        status: 'inconclusive',
        measurements: null,
        inconclusiveReason: 'low_visibility',
      })
    );
    const report = buildMovementRetestReport([...stable, ...inconclusive]);

    expect(report.inconclusiveRate).toBeGreaterThan(0.25);
    expect(report.gates.inconclusiveRate).toBe(false);
    expect(report.status).toBe('reviewable');
  });

  it('marks noisy pairs reviewable rather than passing them', () => {
    const report = buildMovementRetestReport([
      record('one', DAY, {
        measurements: { range: 0.1, control: 0.1, symmetry: 0.2, traceStability: 0.1 },
      }),
      record('two', DAY * 8, {
        measurements: { range: 0.9, control: 0.9, symmetry: 0.9, traceStability: 0.9 },
      }),
      record('three', DAY * 15, {
        measurements: { range: 0.1, control: 0.1, symmetry: 0.2, traceStability: 0.1 },
      }),
    ]);

    expect(report.comparablePairs).toBe(2);
    expect(report.status).toBe('reviewable');
    expect(report.gates.similarityFloor).toBe(false);
  });
});

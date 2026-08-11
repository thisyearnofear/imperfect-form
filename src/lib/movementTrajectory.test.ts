import { describe, expect, it } from 'vitest';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';
import type { MovementAssessment } from '@/types/movementAssessment';
import { buildMovementTrajectory } from '@/lib/movementTrajectory';

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
      range: 0.4,
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

describe('movement trajectory', () => {
  it('keeps a single read as an early estimate with a repeat-baseline unlock', () => {
    const trajectory = buildMovementTrajectory([record('first', DAY)]);

    expect(trajectory.confidence).toBe('early-estimate');
    expect(trajectory.direction).toBe('unknown');
    expect(trajectory.trendPerWeek).toBeNull();
    expect(trajectory.nextUnlock.label).toBe('Repeat the baseline');
    expect(trajectory.nextUnlock.targetValue).toBeNull();
  });

  it('reports an emerging upward direction and a dimension-specific unlock', () => {
    const trajectory = buildMovementTrajectory([
      record('new', DAY * 15, {
        measurements: {
          range: 0.58,
          control: 0.82,
          symmetry: 0.9,
          traceStability: 0.86,
        },
      }),
      record('old', DAY),
    ]);

    expect(trajectory.confidence).toBe('emerging-trend');
    expect(trajectory.direction).toBe('up');
    expect(trajectory.trendDimension).toBe('range');
    expect(trajectory.trendPerWeek).toBeGreaterThan(0);
    expect(trajectory.nextUnlock.targetValue).toBeNull();
  });

  it('requires repeated comparable reads before calling a trend reliable', () => {
    const trajectory = buildMovementTrajectory([
      record('four', DAY * 29, {
        measurements: { range: 0.7, control: 0.8, symmetry: 0.9, traceStability: 0.85 },
      }),
      record('three', DAY * 22, {
        measurements: { range: 0.65, control: 0.8, symmetry: 0.9, traceStability: 0.85 },
      }),
      record('two', DAY * 15, {
        measurements: { range: 0.58, control: 0.8, symmetry: 0.9, traceStability: 0.85 },
      }),
      record('one', DAY * 8, {
        measurements: { range: 0.5, control: 0.8, symmetry: 0.9, traceStability: 0.85 },
      }),
    ]);

    expect(trajectory.confidence).toBe('reliable-trend');
    expect(trajectory.repeatability).toBe(1);
  });

  it('excludes low-confidence and inconclusive reads from the trajectory', () => {
    const trajectory = buildMovementTrajectory([
      record('bad', DAY * 15, {
        status: 'inconclusive',
        confidence: 0.95,
        measurements: null,
        inconclusiveReason: 'low_visibility',
      }),
      record('unclear', DAY * 8, { confidence: 0.5 }),
      record('clear', DAY),
    ]);

    expect(trajectory.qualifyingReads).toBe(1);
    expect(trajectory.totalValidReads).toBe(2);
    expect(trajectory.latestStatus).toBe('inconclusive');
    expect(trajectory.confidence).toBe('early-estimate');
    expect(trajectory.direction).toBe('unknown');
  });
});

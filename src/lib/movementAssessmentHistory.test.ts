import { describe, expect, it } from 'vitest';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';
import type { MovementAssessment } from '@/types/movementAssessment';
import {
  buildMovementAssessmentHistory,
  formatSignedPercent,
  measurementDelta,
} from '@/lib/movementAssessmentHistory';

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
      control: 0.9,
      symmetry: 0.9,
      traceStability: 0.8,
    },
    ...partial,
  };
}

function record(id: string, value: Partial<MovementAssessment>): StoredMovementAssessment {
  return {
    id,
    userId: 'guest-1',
    sourceSessionId: id,
    savedAt: 1_000,
    assessment: assessment(value),
  };
}

describe('movement assessment history', () => {
  it('orders newest first and compares the latest valid records', () => {
    const history = buildMovementAssessmentHistory([
      record('old', { capturedAt: 1_000 }),
      record('new', {
        capturedAt: 2_000,
        measurements: {
          range: 0.6,
          control: 0.9,
          symmetry: 0.9,
          traceStability: 0.85,
        },
      }),
    ]);

    expect(history.records.map((item) => item.id)).toEqual(['new', 'old']);
    expect(history.previousValid?.id).toBe('old');
    expect(history.comparison?.comparable).toBe(true);
    expect(measurementDelta(history.comparison, 'range')).toBeCloseTo(0.2);
    expect(formatSignedPercent(0.2)).toBe('+20%');
  });

  it('does not compare an inconclusive latest read', () => {
    const history = buildMovementAssessmentHistory([
      record('old', { capturedAt: 1_000 }),
      record('bad', {
        capturedAt: 2_000,
        status: 'inconclusive',
        measurements: null,
        inconclusiveReason: 'low_visibility',
      }),
    ]);

    expect(history.latest?.id).toBe('bad');
    expect(history.previousValid?.id).toBe('old');
    expect(history.comparison?.comparable).toBe(false);
    expect(history.comparison?.reason).toBe('invalid_assessment');
    expect(measurementDelta(history.comparison, 'range')).toBeNull();
  });

  it('ignores records from another protocol and malformed legacy records', () => {
    const history = buildMovementAssessmentHistory(
      [
        record('curl', { capturedAt: 1_000 }),
        record('other', { capturedAt: 3_000, protocolId: 'future-squat-baseline' }),
        {
          ...record('legacy', { capturedAt: 4_000 }),
          assessment: { status: 'valid' } as never,
        },
      ],
      'curls-baseline'
    );

    expect(history.records.map((item) => item.id)).toEqual(['curl']);
    expect(history.comparison).toBeNull();
  });
});

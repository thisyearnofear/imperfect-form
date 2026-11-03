import { describe, expect, it } from 'vitest';
import type { SessionSummary } from '@/services/sessionLogger';
import { CURL_BASELINE_PROTOCOL } from '@/types/movementAssessment';
import {
  compareMovementAssessments,
  countedReadingReps,
  evaluateMovementAssessment,
  READING_REHEARSAL_REPS,
  shouldEndReading,
} from '@/lib/movementAssessment';

const keypointNames = [
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
];

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    startTime: 1_000,
    endTime: 3_000,
    duration: 2,
    mode: 'curls',
    repCount: 5,
    avgDepth: 0.7,
    maxTrunkLean: 10,
    maxKneeValgus: 0,
    warningCount: 0,
    anomalies: [],
    trace: Array.from({ length: 12 }, (_, index) => ({
      timestamp: index * 200,
      metrics: {
        trunkLean: 10,
        kneeValgus: 0,
        ankleFlexion: 0,
        depth: index % 2 === 0 ? 0.68 : 0.72,
        symmetry: 0.92,
        isStable: true,
        warnings: [],
      },
      keypoints: keypointNames.map((name) => ({
        name,
        x: 100,
        y: 100,
        score: 0.9,
      })),
    })),
    ...overrides,
  };
}

describe('movement assessment M0', () => {
  it('returns a valid local assessment from a complete, visible protocol', () => {
    const result = evaluateMovementAssessment(summary());

    expect(result.status).toBe('valid');
    expect(result.inconclusiveReason).toBeUndefined();
    expect(result.protocolId).toBe('curls-baseline');
    expect(result.version).toBe('1.0');
    expect(result.measurements?.range).toBeCloseTo(0.04);
    expect(result.measurements?.control).toBeGreaterThan(0.8);
    expect(result.measurements?.symmetry).toBeCloseTo(0.92);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('marks an incomplete protocol inconclusive instead of inventing a result', () => {
    const result = evaluateMovementAssessment(summary({ repCount: 3 }));

    expect(result.status).toBe('inconclusive');
    expect(result.inconclusiveReason).toBe('insufficient_reps');
    expect(result.measurements).toBeNull();
  });

  it('marks poor visibility inconclusive even when the rep target is met', () => {
    const lowVisibilityTrace = summary().trace.map((frame) => ({
      ...frame,
      keypoints: frame.keypoints.map((keypoint) => ({ ...keypoint, score: 0.2 })),
    }));
    const result = evaluateMovementAssessment(summary({ trace: lowVisibilityTrace }));

    expect(result.status).toBe('inconclusive');
    expect(result.inconclusiveReason).toBe('low_visibility');
    expect(result.quality.poseConfidence).toBeLessThan(0.55);
  });

  it('marks unstable tracking inconclusive', () => {
    const unstableTrace = summary().trace.map((frame) => ({
      ...frame,
      metrics: { ...frame.metrics, isStable: false },
    }));
    const result = evaluateMovementAssessment(summary({ trace: unstableTrace }));

    expect(result.status).toBe('inconclusive');
    expect(result.inconclusiveReason).toBe('unstable_tracking');
  });

  it('does not award perfect symmetry when bilateral evidence is missing', () => {
    const unilateralTrace = summary().trace.map((frame) => ({
      ...frame,
      keypoints: frame.keypoints.filter((keypoint) => !keypoint.name.startsWith('right_')),
    }));
    const result = evaluateMovementAssessment(summary({ trace: unilateralTrace }));

    expect(result.status).toBe('inconclusive');
    expect(result.inconclusiveReason).toBe('low_visibility');
    expect(result.measurements).toBeNull();
  });

  it('requires the exact target rep count', () => {
    const result = evaluateMovementAssessment(summary({ repCount: 6 }));

    expect(result.status).toBe('inconclusive');
    expect(result.inconclusiveReason).toBe('insufficient_reps');
  });

  it('uses only bilateral evidence for symmetry when partial frames are present', () => {
    const partialTrace = summary().trace.map((frame, index) =>
      index < 4
        ? {
            ...frame,
            keypoints: frame.keypoints.filter((keypoint) => !keypoint.name.startsWith('right_')),
            metrics: { ...frame.metrics, symmetry: 1 },
          }
        : frame
    );
    const result = evaluateMovementAssessment(summary({ trace: partialTrace }));

    expect(result.status).toBe('valid');
    expect(result.measurements?.symmetry).toBeCloseTo(0.92);
  });

  it('does not compare assessments created by different protocols', () => {
    const first = evaluateMovementAssessment(summary());
    const second = evaluateMovementAssessment(summary(), {
      ...CURL_BASELINE_PROTOCOL,
      id: 'curls-baseline-v2',
    });

    expect(compareMovementAssessments(first, second).comparable).toBe(false);
    expect(compareMovementAssessments(first, second).reason).toBe('different_protocol');
  });

  it('compares valid protocol-matched assessments and reports deltas', () => {
    const previous = evaluateMovementAssessment(
      summary({
        trace: summary().trace.map((frame) => ({
          ...frame,
          metrics: { ...frame.metrics, depth: frame.timestamp % 400 === 0 ? 0.5 : 0.6 },
        })),
      })
    );
    const current = evaluateMovementAssessment(
      summary({
        trace: summary().trace.map((frame) => ({
          ...frame,
          metrics: { ...frame.metrics, depth: frame.timestamp % 400 === 0 ? 0.6 : 0.9 },
        })),
      })
    );
    const comparison = compareMovementAssessments(previous, current);

    expect(comparison.comparable).toBe(true);
    expect(comparison.rangeDelta).toBeCloseTo(0.2);
    expect(comparison.similarity).not.toBeNull();
    expect(comparison.repeatable).toBe(true);
  });
});

describe('shouldEndReading', () => {
  it('ends exactly on the protocol rep count', () => {
    expect(shouldEndReading(4, CURL_BASELINE_PROTOCOL)).toBe(false);
    expect(shouldEndReading(5, CURL_BASELINE_PROTOCOL)).toBe(true);
    expect(shouldEndReading(6, CURL_BASELINE_PROTOCOL)).toBe(true);
  });

  it('never ends without a protocol', () => {
    expect(shouldEndReading(5, null)).toBe(false);
  });

  it('waits out the warm-up rep before ending a rehearsed reading', () => {
    // The rehearsal rep is rep 1 raw, rep 0 on the meter: five counted reps
    // land at raw count 6 — not a rep earlier.
    expect(shouldEndReading(5, CURL_BASELINE_PROTOCOL, READING_REHEARSAL_REPS)).toBe(false);
    expect(
      shouldEndReading(
        CURL_BASELINE_PROTOCOL.targetReps + READING_REHEARSAL_REPS,
        CURL_BASELINE_PROTOCOL,
        READING_REHEARSAL_REPS
      )
    ).toBe(true);
  });
});

describe('countedReadingReps', () => {
  it('strips the warm-up rep and never goes negative', () => {
    expect(countedReadingReps(0, READING_REHEARSAL_REPS)).toBe(0);
    expect(countedReadingReps(1, READING_REHEARSAL_REPS)).toBe(0);
    expect(countedReadingReps(6, READING_REHEARSAL_REPS)).toBe(5);
    expect(countedReadingReps(3)).toBe(3);
  });
});

describe('rehearsed reading — the meter still sees exactly five reps', () => {
  it('a rehearsal-stripped summary evaluates as a valid protocol read', () => {
    // The rep callback ends the session at raw count 6; Game subtracts the
    // warm-up before anything downstream (assessment, PB check, recap,
    // saved workout) reads repCount. The exact-count protocol gate must
    // still see 5 — otherwise the warm-up poisons every reading.
    const raw = summary({ repCount: CURL_BASELINE_PROTOCOL.targetReps + READING_REHEARSAL_REPS });
    const counted = {
      ...raw,
      repCount: countedReadingReps(raw.repCount, READING_REHEARSAL_REPS),
    };

    const result = evaluateMovementAssessment(counted);
    expect(result.status).toBe('valid');
    expect(result.quality.repCount).toBe(CURL_BASELINE_PROTOCOL.targetReps);
  });

  it('a rehearsal-stripped summary still fails honestly when reps were short', () => {
    // Stopping mid-reading (raw 4 = warm-up + 3 counted) must stay
    // inconclusive — the warm-up rep can never paper over a short set.
    const raw = summary({ repCount: 4 });
    const counted = {
      ...raw,
      repCount: countedReadingReps(raw.repCount, READING_REHEARSAL_REPS),
    };

    const result = evaluateMovementAssessment(counted);
    expect(result.status).toBe('inconclusive');
    expect(result.inconclusiveReason).toBe('insufficient_reps');
  });
});

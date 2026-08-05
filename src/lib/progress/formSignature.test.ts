import { describe, expect, it } from 'vitest';
import {
  appendCurrentSignature,
  buildFormSignature,
  buildFormSignatureHistory,
  chooseSelfGhostWorkout,
} from '@/lib/progress/formSignature';
import type { SessionSummary } from '@/services/sessionLogger';
import type { LocalWorkout } from '@/types/workout';

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    startTime: 1000,
    endTime: 2000,
    duration: 1,
    mode: 'pushups',
    repCount: 8,
    avgDepth: 0.7,
    maxTrunkLean: 0,
    maxKneeValgus: 0,
    warningCount: 1,
    anomalies: [],
    trace: [
      {
        timestamp: 0,
        metrics: {
          depth: 0.6,
          trunkLean: 0,
          kneeValgus: 0,
          ankleFlexion: 0,
          symmetry: 1,
          isStable: true,
          warnings: [],
        },
        keypoints: [],
      },
      {
        timestamp: 200,
        metrics: {
          depth: 0.8,
          trunkLean: 0,
          kneeValgus: 0,
          ankleFlexion: 0,
          symmetry: 1,
          isStable: true,
          warnings: [],
        },
        keypoints: [],
      },
    ],
    ...overrides,
  };
}

function workout(partial: Partial<LocalWorkout> & { id: string; timestamp: number }): LocalWorkout {
  return { reps: 10, synced: false, type: 'pushups', ...partial };
}

describe('form signature helpers', () => {
  it('computes average depth, consistency, and observation rate', () => {
    const signature = buildFormSignature(summary());
    expect(signature.averageDepth).toBe(0.7);
    expect(signature.depthConsistency).toBeGreaterThan(0.4);
    expect(signature.observationRate).toBe(0.5);
  });

  it('orders signature history chronologically and caps the result', () => {
    const signature = buildFormSignature(summary());
    const history = buildFormSignatureHistory(
      [
        workout({ id: 'new', timestamp: 3000, userAddress: 'guest-a', formSignature: signature }),
        workout({ id: 'old', timestamp: 1000, userAddress: 'guest-a', formSignature: signature }),
        workout({ id: 'mid', timestamp: 2000, userAddress: 'guest-a', formSignature: signature }),
      ],
      'pushups',
      2,
      'guest-a'
    );
    expect(history.map((point) => point.timestamp)).toEqual([2000, 3000]);
  });

  it('chooses the highest-rep prior trace and uses recency for ties', () => {
    const best = chooseSelfGhostWorkout(
      [
        workout({
          id: 'older-best',
          timestamp: 1000,
          reps: 12,
          userAddress: 'guest-a',
          hasTrace: true,
        }),
        workout({
          id: 'newer-best',
          timestamp: 2000,
          reps: 12,
          userAddress: 'guest-a',
          hasTrace: true,
        }),
        workout({ id: 'higher-no-trace', timestamp: 3000, reps: 20, hasTrace: false }),
      ],
      'pushups',
      undefined,
      'guest-a'
    );
    expect(best?.id).toBe('newer-best');
  });

  it('isolates history and self-ghost candidates by identity', () => {
    const signature = buildFormSignature(summary());
    const workouts = [
      workout({
        id: 'a-best',
        timestamp: 1000,
        reps: 20,
        userAddress: 'guest-a',
        hasTrace: true,
        formSignature: signature,
      }),
      workout({
        id: 'b-best',
        timestamp: 2000,
        reps: 99,
        userAddress: 'guest-b',
        hasTrace: true,
        formSignature: signature,
      }),
    ];
    expect(buildFormSignatureHistory(workouts, 'pushups', 6, 'guest-a')).toHaveLength(1);
    expect(chooseSelfGhostWorkout(workouts, 'pushups', undefined, 'guest-a')?.id).toBe('a-best');
  });

  it('appends the current signature without duplicating a persisted session', () => {
    const signature = buildFormSignature(summary());
    const history = buildFormSignatureHistory(
      [workout({ id: 'same', timestamp: 1000, userAddress: 'guest-a', formSignature: signature })],
      'pushups',
      6,
      'guest-a'
    );
    expect(appendCurrentSignature(history, { timestamp: 1000, reps: 8, signature })).toHaveLength(
      1
    );
    expect(appendCurrentSignature(history, { timestamp: 2000, reps: 8, signature })).toHaveLength(
      2
    );
  });
});

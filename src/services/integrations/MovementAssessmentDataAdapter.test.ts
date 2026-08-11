import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MovementAssessment } from '@/types/movementAssessment';

const mocks = vi.hoisted(() => {
  const records: unknown[] = [];
  return {
    records,
    store: {
      get: vi.fn(async () => records.slice()),
      set: vi.fn(async (_key: string, next: unknown[]) => {
        records.splice(0, records.length, ...next);
      }),
      remove: vi.fn(async () => {
        records.splice(0, records.length);
      }),
    },
  };
});

vi.mock('@/services/OfflineDataStore', () => ({
  getOfflineDataStore: () => mocks.store,
}));

import {
  clearLocalMovementAssessments,
  getLocalMovementAssessments,
  migrateLocalMovementAssessments,
  saveLocalMovementAssessment,
} from '@/services/integrations/MovementAssessmentDataAdapter';

const assessment: MovementAssessment = {
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
};

describe('MovementAssessmentDataAdapter', () => {
  beforeEach(async () => {
    await clearLocalMovementAssessments();
    vi.clearAllMocks();
  });

  it('upserts repeated writes for the same session without duplicating records', async () => {
    const first = await saveLocalMovementAssessment(assessment, 'guest-1', 'session-1');
    const second = await saveLocalMovementAssessment(
      { ...assessment, capturedAt: 2_000 },
      'guest-1',
      'session-1'
    );

    expect(second.id).toBe(first.id);
    expect(await getLocalMovementAssessments('guest-1')).toEqual([
      expect.objectContaining({
        id: first.id,
        sourceSessionId: 'session-1',
        assessment: expect.objectContaining({ capturedAt: 2_000 }),
      }),
    ]);
    expect(mocks.store.set).toHaveBeenCalledTimes(2);
  });

  it('re-keys migrated guest assessments without touching other users', async () => {
    await saveLocalMovementAssessment(assessment, 'guest-1', 'session-1');
    await saveLocalMovementAssessment(assessment, 'guest-1', 'session-2');
    await saveLocalMovementAssessment(assessment, 'guest-2', 'session-3');

    expect(await migrateLocalMovementAssessments('guest-1', 'wallet-1', ['session-1'])).toBe(1);
    expect(
      (await getLocalMovementAssessments('wallet-1')).map((record) => record.sourceSessionId)
    ).toEqual(['session-1']);
    expect(
      (await getLocalMovementAssessments('guest-1')).map((record) => record.sourceSessionId)
    ).toEqual(['session-2']);
  });

  it('keeps assessments isolated by user when listing local history', async () => {
    await saveLocalMovementAssessment(assessment, 'guest-1', 'session-1');
    await saveLocalMovementAssessment(assessment, 'guest-2', 'session-1');

    expect((await getLocalMovementAssessments('guest-1')).map((record) => record.userId)).toEqual([
      'guest-1',
    ]);
    expect((await getLocalMovementAssessments('guest-2')).map((record) => record.userId)).toEqual([
      'guest-2',
    ]);
    expect((await getLocalMovementAssessments()).map((record) => record.userId)).toEqual([
      'guest-2',
      'guest-1',
    ]);
  });
});

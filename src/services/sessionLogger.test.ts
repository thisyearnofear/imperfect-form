import { describe, expect, it } from 'vitest';
import type { BiomechanicalState } from '@/types/mediapipe';
import { SessionLogger } from './sessionLogger';

const cleanMetrics: BiomechanicalState = {
  trunkLean: 0,
  kneeValgus: 0,
  ankleFlexion: 0,
  depth: 0.8,
  symmetry: 1,
  isStable: true,
  warnings: [],
};

describe('SessionLogger observations', () => {
  it('includes engine-level coaching cues in the recap warning count', () => {
    const logger = new SessionLogger('curls');

    logger.logObservation(cleanMetrics, [], 'elbow_swing');

    const summary = logger.getSummary(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.anomalies[0]?.metrics.warnings).toContain('elbow_swing');
  });
});

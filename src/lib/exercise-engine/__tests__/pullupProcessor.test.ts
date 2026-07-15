import { describe, expect, it } from 'vitest';
import { createPullupState, processPullups } from '../pullupProcessor';
import { deadHangPose, kp, pulledUpPose } from './helpers';

const baseParams = {
  internalReps: 0,
  lastRepIssues: [] as string[],
};

describe('processPullups', () => {
  it('returns null when not in a hanging position', () => {
    // Wrists below shoulders = not hanging
    const keypoints = deadHangPose({
      left_wrist: kp('left_wrist', 100, 150),
      right_wrist: kp('right_wrist', 200, 150),
    });
    const result = processPullups({
      ...baseParams,
      keypoints,
      repState: 'DOWN',
      pullupState: createPullupState(),
    });
    expect(result).toBeNull();
  });

  it('returns null when required keypoints are missing entirely', () => {
    const result = processPullups({
      ...baseParams,
      keypoints: [kp('nose', 150, 50)],
      repState: 'DOWN',
      pullupState: createPullupState(),
    });
    expect(result).toBeNull();
  });

  it('reports low-confidence body parts while hanging', () => {
    const keypoints = deadHangPose({
      left_wrist: kp('left_wrist', 100, 0, 0.4),
      right_wrist: kp('right_wrist', 200, 0, 0.4),
    });
    const result = processPullups({
      ...baseParams,
      keypoints,
      repState: 'DOWN',
      pullupState: createPullupState(),
    });
    expect(result?.feedback).toContain('hands');
    expect(result?.isRepCompleted).toBe(false);
  });

  it('transitions DOWN -> UP when pulled up with chin over wrists', () => {
    const result = processPullups({
      ...baseParams,
      keypoints: pulledUpPose(),
      repState: 'DOWN',
      pullupState: createPullupState(),
    });
    expect(result?.newRepState).toBe('UP');
    expect(result?.isRepCompleted).toBe(false);
    expect(result?.aiFeedbackPayload).toBeDefined();
  });

  it('completes a rep when arms fully extend from UP, with perfect score', () => {
    const pullupState = createPullupState();
    const result = processPullups({
      ...baseParams,
      keypoints: deadHangPose(),
      repState: 'UP',
      pullupState,
    });
    expect(result?.isRepCompleted).toBe(true);
    expect(result?.newRepState).toBe('DOWN');
    expect(result?.repCompletionData?.score).toBe(100);
    expect(result?.repCompletionData?.issues).toEqual([]);
    expect(pullupState.repsCompleted).toBe(1);
    expect(result?.feedback).toContain('first pull-up');
  });

  it('computes elbow/shoulder angles into poseData', () => {
    const result = processPullups({
      ...baseParams,
      keypoints: deadHangPose(),
      repState: 'DOWN',
      pullupState: createPullupState(),
    });
    // Dead hang = straight vertical arms
    expect(result?.poseData.leftElbowAngle).toBeCloseTo(180, 0);
    expect(result?.poseData.rightElbowAngle).toBeCloseTo(180, 0);
  });

  describe('asymmetry detection', () => {
    // Left elbow ~100°, right elbow ~140° -> 40° difference (> 30 threshold)
    const asymmetricPose = () =>
      deadHangPose({
        nose: kp('nose', 150, 90),
        left_wrist: kp('left_wrist', 149.2, 41.3),
        right_wrist: kp('right_wrist', 232.1, 11.7),
      });

    it('flags asymmetry after the learning phase', () => {
      const pullupState = { repsCompleted: 5, isFirstRep: false };
      const result = processPullups({
        ...baseParams,
        keypoints: asymmetricPose(),
        repState: 'DOWN',
        pullupState,
      });
      expect(result?.feedback).toBe('Pull evenly with both arms!');
      expect(result?.formCheckSpeak?.issue).toBe('asymmetry');
    });

    it('suppresses form corrections during the learning phase (first 2 reps)', () => {
      const result = processPullups({
        ...baseParams,
        keypoints: asymmetricPose(),
        repState: 'DOWN',
        pullupState: createPullupState(),
      });
      expect(result?.feedback).toBeUndefined();
      expect(result?.formCheckSpeak).toBeUndefined();
    });
  });
});

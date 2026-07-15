import { describe, expect, it } from 'vitest';
import { createJumpState, processJumps, resetJumpState } from '../jumpProcessor';
import { kp, standingPose } from './helpers';

const baseParams = {
  internalReps: 0,
  lastRepIssues: [] as string[],
  now: () => 1000,
};

describe('processJumps', () => {
  it('asks for full body visibility when keypoints are missing', () => {
    const result = processJumps({
      ...baseParams,
      keypoints: [kp('left_hip', 100, 300)],
      repState: 'GROUNDED',
      jumpState: createJumpState(),
    });
    expect(result?.feedback).toContain('full body');
    expect(result?.isRepCompleted).toBe(false);
  });

  it('calibrates ground level when standing with straight legs', () => {
    const jumpState = createJumpState();
    const result = processJumps({
      ...baseParams,
      keypoints: standingPose(500),
      repState: 'GROUNDED',
      jumpState,
    });
    expect(jumpState.isCalibrated).toBe(true);
    expect(jumpState.groundLevel).toBe(500);
    expect(result?.feedback).toContain('Ready to jump');
  });

  it('counts a full jump: calibrate -> airborne -> land', () => {
    const jumpState = createJumpState();

    // Calibrate at ground level 500
    processJumps({
      ...baseParams,
      keypoints: standingPose(500),
      repState: 'GROUNDED',
      jumpState,
    });

    // Takeoff: ankles rise 50px
    const takeoff = processJumps({
      ...baseParams,
      keypoints: standingPose(450),
      repState: 'GROUNDED',
      jumpState,
    });
    expect(takeoff?.newRepState).toBe('AIRBORNE');

    // Peak: 60px above ground, second airborne frame marks the jump valid
    processJumps({
      ...baseParams,
      keypoints: standingPose(440),
      repState: 'AIRBORNE',
      jumpState,
    });
    expect(jumpState.validJumpDetected).toBe(true);
    expect(jumpState.peakHeight).toBe(60);

    // Land: three consecutive grounded frames complete the rep
    let landing = null;
    for (let i = 0; i < 3; i++) {
      landing = processJumps({
        ...baseParams,
        keypoints: standingPose(500),
        repState: 'AIRBORNE',
        jumpState,
      });
    }

    expect(landing?.isRepCompleted).toBe(true);
    expect(landing?.newRepState).toBe('GROUNDED');
    expect(landing?.feedback).toContain('first jump');
    expect(jumpState.repsCompleted).toBe(1);

    // 60px peak = full height score (100); stiff straight-leg landing = 40
    // -> 100 * 0.6 + 40 * 0.4 = 76
    expect(landing?.repCompletionData?.score).toBe(76);
    expect(landing?.repCompletionData?.issues).toContain('stiff_landing');
    const details = landing?.repCompletionData?.details;
    expect(details && 'jumpHeight' in details ? details.jumpHeight : 0).toBe(60);
  });

  it('ignores small hops below the adaptive threshold', () => {
    const jumpState = createJumpState();
    processJumps({
      ...baseParams,
      keypoints: standingPose(500),
      repState: 'GROUNDED',
      jumpState,
    });

    const hop = processJumps({
      ...baseParams,
      keypoints: standingPose(480), // only 20px, below adaptive threshold
      repState: 'GROUNDED',
      jumpState,
    });
    expect(hop?.newRepState).toBeUndefined();
    expect(hop?.isRepCompleted).toBe(false);
  });

  it('resets without counting when landing from an invalid jump', () => {
    const jumpState = createJumpState();
    jumpState.isCalibrated = true;
    jumpState.groundLevel = 500;
    jumpState.lastAnkleY = 500;
    jumpState.validJumpDetected = false;
    jumpState.peakHeight = 10; // below the 14px minimum
    jumpState.consecutiveGroundedFrames = 2;

    const result = processJumps({
      ...baseParams,
      keypoints: standingPose(500),
      repState: 'AIRBORNE',
      jumpState,
    });
    expect(result?.isRepCompleted).toBe(false);
    expect(result?.newRepState).toBe('GROUNDED');
    expect(jumpState.repsCompleted).toBe(0);
  });

  it('resetJumpState clears calibration but keeps the initialization timer', () => {
    const jumpState = createJumpState();
    processJumps({
      ...baseParams,
      keypoints: standingPose(500),
      repState: 'GROUNDED',
      jumpState,
    });
    const initTime = jumpState.initializationStartTime;

    resetJumpState(jumpState);
    expect(jumpState.isCalibrated).toBe(false);
    expect(jumpState.groundLevel).toBeNull();
    expect(jumpState.initializationStartTime).toBe(initTime);
  });
});

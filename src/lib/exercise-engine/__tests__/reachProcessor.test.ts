import { describe, expect, it } from 'vitest';
import { createReachState, processReach, resetReachState } from '../reachProcessor';
import { kp } from './helpers';

const baseParams = {
  repState: 'DOWN' as const,
  internalReps: 0,
  lastRepIssues: [] as string[],
};

/**
 * Arm poses for the elevation read (screen coords, y down).
 * elevation = atan2(|elbow.x - shoulder.x|, elbow.y - shoulder.y):
 * hanging ~0°, horizontal ~90°, overhead ~180°.
 */
function reachPose({
  leftElevation = 0,
  rightElevation = 0,
  leftLean = 0,
  hips = true,
}: {
  leftElevation?: number;
  rightElevation?: number;
  /** Sideways trunk sway in px (shoulder offset from the hip line). */
  leftLean?: number;
  hips?: boolean;
} = {}) {
  const makeArm = (side: string, sideX: number, elevationDeg: number, lean: number) => {
    const rad = (elevationDeg * Math.PI) / 180;
    const shoulder = kp(`${side}_shoulder`, sideX + lean, 100);
    const hip = hips ? kp(`${side}_hip`, sideX, 250) : kp(`${side}_hip`, sideX, 250, 0);
    // Elbow sits along the elevation vector: below shoulder at 0°,
    // horizontal at 90°, above at 180°.
    const elbow = kp(
      `${side}_elbow`,
      shoulder.x + Math.sin(rad) * 75,
      shoulder.y + Math.cos(rad) * 75
    );
    const wrist = kp(`${side}_wrist`, elbow.x + Math.sin(rad) * 70, elbow.y + Math.cos(rad) * 70);
    return [shoulder, hip, elbow, wrist];
  };

  return [
    ...makeArm('left', 100, leftElevation, leftLean),
    ...makeArm('right', 300, rightElevation, 0),
  ];
}

describe('processReach', () => {
  it('returns null when no arm keypoints exist', () => {
    const result = processReach({
      ...baseParams,
      keypoints: [kp('nose', 150, 50)],
      reachState: createReachState(),
    });
    expect(result).toBeNull();
  });

  it('asks for framing when the arm chain is not visible', () => {
    const faint = (name: string, x: number, y: number) => kp(name, x, y, 0.1);
    const keypoints = [
      faint('left_shoulder', 100, 100),
      faint('left_elbow', 100, 175),
      faint('left_wrist', 100, 240),
      faint('right_shoulder', 300, 100),
      faint('right_elbow', 300, 175),
      faint('right_wrist', 300, 240),
    ];
    const result = processReach({
      ...baseParams,
      keypoints,
      reachState: createReachState(),
    });
    expect(result?.isRepCompleted).toBe(false);
    expect(result?.feedback).toMatch(/see your shoulders and arms/i);
  });

  it('counts a rep when the arm rises past the raised threshold after hanging', () => {
    const reachState = createReachState();
    const down = processReach({ ...baseParams, keypoints: reachPose(), reachState });
    expect(down?.isRepCompleted).toBe(false);

    const up = processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 160 }),
      reachState,
    });
    expect(up?.isRepCompleted).toBe(true);
    expect(up?.repCompletionData?.score).toBe(100);
    expect(reachState.repsCompleted).toBe(1);
  });

  it('does not count a reach that was never lowered first', () => {
    const reachState = createReachState();
    const result = processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 160 }),
      reachState,
    });
    expect(result?.isRepCompleted).toBe(false);
    expect(reachState.repsCompleted).toBe(0);
  });

  it('re-arms only after the arm comes back down (two raises, two reps)', () => {
    const reachState = createReachState();
    const frames = [
      reachPose(),
      reachPose({ leftElevation: 160 }),
      reachPose({ leftElevation: 160 }),
      reachPose(),
      reachPose({ leftElevation: 150 }),
    ];
    const reps = frames.map(
      (keypoints) => processReach({ ...baseParams, keypoints, reachState })?.isRepCompleted
    );
    expect(reps).toEqual([false, true, false, false, true]);
    expect(reachState.repsCompleted).toBe(2);
  });

  it('counts each arm independently', () => {
    const reachState = createReachState();
    processReach({ ...baseParams, keypoints: reachPose(), reachState });
    const left = processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 150 }),
      reachState,
    });
    const right = processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 150, rightElevation: 150 }),
      reachState,
    });
    expect(left?.isRepCompleted).toBe(true);
    expect(right?.isRepCompleted).toBe(true);
    expect(reachState.repsCompleted).toBe(2);
  });

  it('flags trunk sway while the arm is up and docks the rep score', () => {
    const reachState = createReachState();
    processReach({ ...baseParams, keypoints: reachPose(), reachState });
    // 40px sideways sway on a 150px torso ≈ 15°... use a bigger sway to pass 30°.
    const leaning = reachPose({ leftElevation: 150, leftLean: 95 });
    const swayed = processReach({ ...baseParams, keypoints: leaning, reachState });
    expect(swayed?.formCheckSpeak?.issue).toBe('trunk_lean');
    expect(swayed?.repCompletionData?.issues).toContain('trunk_lean');
    expect(swayed?.repCompletionData?.score).toBe(75);
  });

  it('makes no lean accusation when the hips are out of frame', () => {
    const reachState = createReachState();
    processReach({ ...baseParams, keypoints: reachPose(), reachState });
    const result = processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 150, hips: false }),
      reachState,
    });
    expect(result?.formCheckSpeak).toBeUndefined();
    expect(result?.repCompletionData?.score).toBe(100);
  });

  it('reset returns the state to a fresh baseline', () => {
    const reachState = createReachState();
    processReach({ ...baseParams, keypoints: reachPose(), reachState });
    processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 160 }),
      reachState,
    });
    resetReachState(reachState);
    expect(reachState.repsCompleted).toBe(0);
    expect(reachState.leftFlag).toBeNull();
    expect(reachState.leanSinceLastRep).toBe(false);
  });
});

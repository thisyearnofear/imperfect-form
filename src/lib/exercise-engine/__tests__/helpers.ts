import type { EngineKeypoint } from '../types';

export const kp = (name: string, x: number, y: number, score = 0.9): EngineKeypoint => ({
  name,
  x,
  y,
  score,
});

/**
 * Full-body keypoint set for a person in a dead-hang pull-up position:
 * straight vertical arms (elbow/shoulder angles 180°), wrists above
 * shoulders, chin below wrists.
 */
export function deadHangPose(overrides: Record<string, EngineKeypoint> = {}) {
  const base: Record<string, EngineKeypoint> = {
    nose: kp('nose', 150, 110),
    left_wrist: kp('left_wrist', 100, 0),
    right_wrist: kp('right_wrist', 200, 0),
    left_elbow: kp('left_elbow', 100, 50),
    right_elbow: kp('right_elbow', 200, 50),
    left_shoulder: kp('left_shoulder', 100, 100),
    right_shoulder: kp('right_shoulder', 200, 100),
    left_hip: kp('left_hip', 100, 200),
    right_hip: kp('right_hip', 200, 200),
    left_knee: kp('left_knee', 100, 300),
    right_knee: kp('right_knee', 200, 300),
    left_ankle: kp('left_ankle', 100, 400),
    right_ankle: kp('right_ankle', 200, 400),
  };
  return Object.values({ ...base, ...overrides });
}

/**
 * Pulled-up position: elbows flexed (~76°), shoulder angles ~76°, chin above
 * wrist line. Satisfies the processor's isPulledUp + chinAboveWrists checks.
 */
export function pulledUpPose() {
  return deadHangPose({
    nose: kp('nose', 150, 50),
    left_elbow: kp('left_elbow', 60, 110),
    right_elbow: kp('right_elbow', 240, 110),
    left_wrist: kp('left_wrist', 60, 60),
    right_wrist: kp('right_wrist', 240, 60),
  });
}

/**
 * Standing pose for jumps: straight legs (knee angle 180°), ankles at the
 * given y (ground level defaults to 500).
 */
export function standingPose(ankleY = 500) {
  const legOffset = ankleY - 500;
  return [
    kp('nose', 150, 60 + legOffset),
    kp('left_shoulder', 100, 100 + legOffset),
    kp('right_shoulder', 200, 100 + legOffset),
    kp('left_hip', 100, 300 + legOffset),
    kp('right_hip', 200, 300 + legOffset),
    kp('left_knee', 100, 400 + legOffset),
    kp('right_knee', 200, 400 + legOffset),
    kp('left_ankle', 100, ankleY),
    kp('right_ankle', 200, ankleY),
  ];
}

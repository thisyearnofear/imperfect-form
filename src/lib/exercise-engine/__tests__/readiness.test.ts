import { describe, expect, it } from 'vitest';
import { PoseReadinessSystem } from '../readiness';
import { kp } from './helpers';

const DIMS = { width: 640, height: 480 };

/** Centered, full-body standing pose with high-confidence keypoints. */
function fullBodyPose(score = 0.9) {
  return [
    kp('nose', 320, 60, score),
    kp('left_shoulder', 280, 100, score),
    kp('right_shoulder', 360, 100, score),
    kp('left_elbow', 270, 180, score),
    kp('right_elbow', 370, 180, score),
    kp('left_wrist', 260, 250, score),
    kp('right_wrist', 380, 250, score),
    kp('left_hip', 290, 280, score),
    kp('right_hip', 350, 280, score),
    kp('left_knee', 290, 370, score),
    kp('right_knee', 350, 370, score),
    kp('left_ankle', 290, 460, score),
    kp('right_ankle', 350, 460, score),
  ];
}

describe('PoseReadinessSystem', () => {
  it('scores a well-positioned full-body jump pose as ready to proceed', () => {
    const system = new PoseReadinessSystem({
      exercise: 'jumps',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });

    const result = system.analyzePoseReadiness(fullBodyPose(), DIMS);

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.overall).toBe('READY');
    expect(result.canProceed).toBe(true);
  });

  it('flags high-severity visibility issues when wrists are invisible for pull-ups', () => {
    const system = new PoseReadinessSystem({
      exercise: 'pullups',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });

    const pose = fullBodyPose().map((k) => (k.name?.includes('wrist') ? { ...k, score: 0.01 } : k));
    const result = system.analyzePoseReadiness(pose, DIMS);

    const visibilityIssues = result.issues.filter((i) => i.type === 'VISIBILITY');
    expect(visibilityIssues.length).toBeGreaterThan(0);
    expect(visibilityIssues.some((i) => i.severity === 'HIGH')).toBe(true);
    expect(result.score).toBeLessThan(70);
  });

  it('suggests re-centering when the body is far off-center', () => {
    const system = new PoseReadinessSystem({
      exercise: 'jumps',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });

    // Shift everything 260px left of center
    const pose = fullBodyPose().map((k) => ({ ...k, x: k.x - 260 }));
    const result = system.analyzePoseReadiness(pose, DIMS);

    const positioning = result.issues.filter((i) => i.type === 'POSITIONING');
    expect(positioning.length).toBeGreaterThan(0);
    expect(positioning[0].suggestion).toContain('right');
  });

  it('reset clears frame history', () => {
    const system = new PoseReadinessSystem({
      exercise: 'jumps',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });

    for (let i = 0; i < 5; i++) {
      system.analyzePoseReadiness(fullBodyPose(), DIMS);
    }
    system.reset();

    // After reset, stability returns the neutral gathering-data score path
    const result = system.analyzePoseReadiness(fullBodyPose(), DIMS);
    expect(result.score).toBeGreaterThan(0);
  });
});

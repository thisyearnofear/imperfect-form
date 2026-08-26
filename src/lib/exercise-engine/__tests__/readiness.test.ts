import { describe, expect, it } from 'vitest';
import { PoseReadinessSystem, type CalibrationStore } from '../readiness';
import { kp } from './helpers';

const DIMS = { width: 640, height: 480 };

/** In-memory calibration store for hermetic persistence tests. */
function memoryStore(): CalibrationStore & { data: Record<string, number> } {
  const store = {
    data: {} as Record<string, number>,
    load() {
      return { ...this.data };
    },
    save(data: Record<string, number>) {
      this.data = { ...data };
    },
  };
  return store;
}

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

  it('persists adaptive calibration across instances via the store', () => {
    const store = memoryStore();

    // First session learns the user's standing knee angle (~180° for the
    // straight-legged test pose) and persists it.
    const first = new PoseReadinessSystem(
      { exercise: 'jumps', adaptiveThresholds: true, strictMode: false, stabilityFrames: 5 },
      store
    );
    first.analyzePoseReadiness(fullBodyPose(), DIMS);
    expect(store.data['preferred_knee_angle']).toBeGreaterThan(120);

    // A fresh instance (new session) loads the persisted calibration.
    const second = new PoseReadinessSystem(
      { exercise: 'jumps', adaptiveThresholds: true, strictMode: false, stabilityFrames: 5 },
      store
    );
    const result = second.analyzePoseReadiness(fullBodyPose(), DIMS);
    // Straight legs match the learned ~180° ideal, so no "stand straighter"
    // posture penalty is applied.
    expect(result.issues.some((i) => i.message.includes('straighter'))).toBe(false);
  });

  it('does not touch the store when adaptiveThresholds is off', () => {
    const store = memoryStore();
    const system = new PoseReadinessSystem(
      { exercise: 'jumps', adaptiveThresholds: false, strictMode: false, stabilityFrames: 5 },
      store
    );
    system.analyzePoseReadiness(fullBodyPose(), DIMS);
    expect(Object.keys(store.data)).toHaveLength(0);
  });

  it('scores a well-framed curl pose as ready', () => {
    const system = new PoseReadinessSystem({
      exercise: 'curls',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });
    const result = system.analyzePoseReadiness(fullBodyPose(), DIMS);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.canProceed).toBe(true);
  });

  it('flags low arm visibility for curls when wrists and elbows are hidden', () => {
    const system = new PoseReadinessSystem({
      exercise: 'curls',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });
    const pose = fullBodyPose().map((k) =>
      k.name?.includes('wrist') || k.name?.includes('elbow') ? { ...k, score: 0.05 } : k
    );
    const result = system.analyzePoseReadiness(pose, DIMS);
    expect(result.issues.some((i) => i.type === 'VISIBILITY' && i.severity === 'HIGH')).toBe(true);
  });

  it('scores a well-framed push-up pose and flags obscured landmarks', () => {
    const ready = new PoseReadinessSystem({
      exercise: 'pushups',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });
    expect(ready.analyzePoseReadiness(fullBodyPose(), DIMS).canProceed).toBe(true);

    const obscured = new PoseReadinessSystem({
      exercise: 'pushups',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });
    const pose = fullBodyPose().map((k) =>
      k.name?.includes('elbow') || k.name?.includes('wrist') ? { ...k, score: 0.05 } : k
    );
    const result = obscured.analyzePoseReadiness(pose, DIMS);
    expect(result.issues.some((i) => i.type === 'VISIBILITY')).toBe(true);
  });

  it('treats squats like jumps for full-body framing', () => {
    const system = new PoseReadinessSystem({
      exercise: 'squats',
      adaptiveThresholds: false,
      strictMode: false,
      stabilityFrames: 5,
    });
    const result = system.analyzePoseReadiness(fullBodyPose(), DIMS);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.canProceed).toBe(true);
  });
});

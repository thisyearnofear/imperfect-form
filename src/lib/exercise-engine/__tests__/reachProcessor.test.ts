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
  leftScore = 0.9,
  rightScore = 0.9,
}: {
  leftElevation?: number;
  rightElevation?: number;
  /** Sideways trunk sway in px (shoulder offset from the hip line). */
  leftLean?: number;
  hips?: boolean;
  /** Per-side keypoint score — below 0.4 the arm reads "out of frame". */
  leftScore?: number;
  rightScore?: number;
} = {}) {
  const makeArm = (
    side: string,
    sideX: number,
    elevationDeg: number,
    lean: number,
    score: number
  ) => {
    const rad = (elevationDeg * Math.PI) / 180;
    const shoulder = kp(`${side}_shoulder`, sideX + lean, 100, score);
    const hip = hips ? kp(`${side}_hip`, sideX, 250) : kp(`${side}_hip`, sideX, 250, 0);
    // Elbow sits along the elevation vector: below shoulder at 0°,
    // horizontal at 90°, above at 180°.
    const elbow = kp(
      `${side}_elbow`,
      shoulder.x + Math.sin(rad) * 75,
      shoulder.y + Math.cos(rad) * 75,
      score
    );
    const wrist = kp(
      `${side}_wrist`,
      elbow.x + Math.sin(rad) * 70,
      elbow.y + Math.cos(rad) * 70,
      score
    );
    return [shoulder, hip, elbow, wrist];
  };

  return [
    ...makeArm('left', 100, leftElevation, leftLean, leftScore),
    ...makeArm('right', 300, rightElevation, 0, rightScore),
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

    // Median-of-3 smoothing: the raise must persist past one frame to count.
    const rise = processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 160 }),
      reachState,
    });
    expect(rise?.isRepCompleted).toBe(false);

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
    const frames = [0, 1, 2].map(
      () =>
        processReach({
          ...baseParams,
          keypoints: reachPose({ leftElevation: 160 }),
          reachState,
        })?.isRepCompleted
    );
    expect(frames).toEqual([false, false, false]);
    expect(reachState.repsCompleted).toBe(0);
  });

  it('re-arms only after the arm comes back down (two raises, two reps)', () => {
    const reachState = createReachState();
    const frames = [
      reachPose(),
      reachPose({ leftElevation: 160 }),
      reachPose({ leftElevation: 160 }),
      reachPose(),
      reachPose(),
      reachPose({ leftElevation: 150 }),
      reachPose({ leftElevation: 150 }),
    ];
    const reps = frames.map(
      (keypoints) => processReach({ ...baseParams, keypoints, reachState })?.isRepCompleted
    );
    expect(reps).toEqual([false, false, true, false, false, false, true]);
    expect(reachState.repsCompleted).toBe(2);
  });

  it('counts each arm independently', () => {
    const reachState = createReachState();
    const reps = [
      reachPose(),
      reachPose({ leftElevation: 150 }),
      reachPose({ leftElevation: 150 }),
      reachPose({ leftElevation: 150, rightElevation: 150 }),
      reachPose({ leftElevation: 150, rightElevation: 150 }),
    ].map((keypoints) => processReach({ ...baseParams, keypoints, reachState })?.isRepCompleted);
    expect(reps).toEqual([false, false, true, false, true]);
    expect(reachState.repsCompleted).toBe(2);
  });

  it('flags trunk sway while the arm is up and docks the rep score', () => {
    const reachState = createReachState();
    processReach({ ...baseParams, keypoints: reachPose(), reachState });
    // 40px sideways sway on a 150px torso ≈ 15°... use a bigger sway to pass 30°.
    const leaning = reachPose({ leftElevation: 150, leftLean: 95 });
    processReach({ ...baseParams, keypoints: leaning, reachState });
    const swayed = processReach({ ...baseParams, keypoints: leaning, reachState });
    expect(swayed?.formCheckSpeak?.issue).toBe('trunk_lean');
    expect(swayed?.repCompletionData?.issues).toContain('trunk_lean');
    expect(swayed?.repCompletionData?.score).toBe(75);
  });

  it('makes no lean accusation when the hips are out of frame', () => {
    const reachState = createReachState();
    processReach({ ...baseParams, keypoints: reachPose(), reachState });
    processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 150, hips: false }),
      reachState,
    });
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
    expect(reachState.cue).toBeNull();
    expect(reachState.leftArm.elevWindow).toHaveLength(0);
  });
});

describe('elevation smoothing (median-of-3)', () => {
  it('publishes the smoothed elevation on the shoulder-angle channels', () => {
    const reachState = createReachState();
    processReach({ ...baseParams, keypoints: reachPose(), reachState });
    const rising = processReach({
      ...baseParams,
      keypoints: reachPose({ leftElevation: 160 }),
      reachState,
    });
    // Window [0, 160] medians to 80 — the instrument shows the same smoothed
    // number the counter compares against the thresholds.
    expect(rising?.poseData.leftShoulderAngle).toBeCloseTo(80, 5);
  });

  it('rejects a one-frame elevation spike — no rep, no re-arm', () => {
    const reachState = createReachState();
    const frames = [reachPose(), reachPose({ leftElevation: 160 }), reachPose(), reachPose()];
    const reps = frames.map(
      (keypoints) => processReach({ ...baseParams, keypoints, reachState })?.isRepCompleted
    );
    expect(reps).toEqual([false, false, false, false]);
    expect(reachState.repsCompleted).toBe(0);
  });

  it('does not count a single frame over the line at the boundary', () => {
    const reachState = createReachState();
    const frames = [
      reachPose(),
      reachPose({ leftElevation: 134 }),
      reachPose({ leftElevation: 136 }),
      reachPose({ leftElevation: 134 }),
    ];
    const reps = frames.map(
      (keypoints) => processReach({ ...baseParams, keypoints, reachState })?.isRepCompleted
    );
    expect(reps).toEqual([false, false, false, false]);
    expect(reachState.repsCompleted).toBe(0);
  });
});

describe('near-miss cue', () => {
  const runAt = (
    reachState: ReturnType<typeof createReachState>,
    keypoints: ReturnType<typeof reachPose>,
    now: number
  ) => processReach({ ...baseParams, keypoints, reachState, nowMs: now });

  it('says "a little higher" when the raise comes down short of the line', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose(), 0); // arm — flag lowered
    runAt(reachState, reachPose({ leftElevation: 120 }), 100);
    runAt(reachState, reachPose({ leftElevation: 120 }), 200);
    runAt(reachState, reachPose(), 300); // median still draining
    const miss = runAt(reachState, reachPose(), 400);
    expect(miss?.isRepCompleted).toBe(false);
    expect(miss?.poseData.reachCue?.kind).toBe('near-miss');
    expect(miss?.poseData.reachCue?.message).toMatch(/a little higher/i);
  });

  it('holds the cue for its dwell window, then lets go', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose(), 0);
    runAt(reachState, reachPose({ leftElevation: 120 }), 100);
    runAt(reachState, reachPose({ leftElevation: 120 }), 200);
    runAt(reachState, reachPose(), 300);
    runAt(reachState, reachPose(), 400); // cue fires here
    const held = runAt(reachState, reachPose(), 500);
    expect(held?.poseData.reachCue?.kind).toBe('near-miss');
    const gone = runAt(reachState, reachPose(), 4000);
    expect(gone?.poseData.reachCue).toBeNull();
  });

  it('is rate-limited — a second miss inside ~4s stays silent', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose(), 0);
    runAt(reachState, reachPose({ leftElevation: 120 }), 100);
    runAt(reachState, reachPose({ leftElevation: 120 }), 200);
    runAt(reachState, reachPose(), 300);
    const first = runAt(reachState, reachPose(), 400);
    expect(first?.poseData.reachCue?.kind).toBe('near-miss');

    // Same excursion again — after the first cue's hold window has ended but
    // still inside the cooldown, so the line falls silent instead of nagging.
    runAt(reachState, reachPose({ leftElevation: 120 }), 3300);
    runAt(reachState, reachPose({ leftElevation: 120 }), 3400);
    runAt(reachState, reachPose(), 3500);
    const second = runAt(reachState, reachPose(), 3600);
    expect(second?.poseData.reachCue).toBeNull();

    // Past the cooldown, the cue may speak again.
    runAt(reachState, reachPose({ leftElevation: 120 }), 4600);
    runAt(reachState, reachPose({ leftElevation: 120 }), 4700);
    runAt(reachState, reachPose(), 4800);
    const third = runAt(reachState, reachPose(), 4900);
    expect(third?.poseData.reachCue?.kind).toBe('near-miss');
  });

  it('stays silent when the excursion never got close (below ~115°)', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose(), 0);
    runAt(reachState, reachPose({ leftElevation: 100 }), 100);
    runAt(reachState, reachPose({ leftElevation: 100 }), 200);
    runAt(reachState, reachPose(), 300);
    const result = runAt(reachState, reachPose(), 400);
    expect(result?.poseData.reachCue).toBeNull();
  });

  it('stays silent when the arm actually crossed the line (the rep counted)', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose(), 0);
    runAt(reachState, reachPose({ leftElevation: 160 }), 100);
    const rep = runAt(reachState, reachPose({ leftElevation: 160 }), 200);
    expect(rep?.isRepCompleted).toBe(true);
    runAt(reachState, reachPose(), 300);
    const after = runAt(reachState, reachPose(), 400);
    expect(after?.poseData.reachCue).toBeNull();
  });
});

describe('re-arm nudge', () => {
  const runAt = (
    reachState: ReturnType<typeof createReachState>,
    keypoints: ReturnType<typeof reachPose>,
    now: number
  ) => processReach({ ...baseParams, keypoints, reachState, nowMs: now });

  it('explains the hysteresis once when the un-armed arm parks mid-band', () => {
    const reachState = createReachState();
    // Arm never went below 50° first — the counter cannot arm.
    runAt(reachState, reachPose({ leftElevation: 100 }), 0);
    const early = runAt(reachState, reachPose({ leftElevation: 100 }), 2000);
    expect(early?.poseData.reachCue).toBeNull();

    const nudge = runAt(reachState, reachPose({ leftElevation: 100 }), 3100);
    expect(nudge?.poseData.reachCue?.kind).toBe('re-arm');
    expect(nudge?.poseData.reachCue?.message).toMatch(/come down, then up again/i);

    // One quiet line — hovering on does not nag.
    const later = runAt(reachState, reachPose({ leftElevation: 100 }), 8000);
    expect(later?.poseData.reachCue).toBeNull();
  });

  it('nudges after a rep when the arm hovers without coming down', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose(), 0);
    runAt(reachState, reachPose({ leftElevation: 160 }), 100);
    const rep = runAt(reachState, reachPose({ leftElevation: 160 }), 200);
    expect(rep?.isRepCompleted).toBe(true);

    // The smoothing window needs a frame to drain below the line; the hover
    // timer starts once the smoothed read is actually in the band.
    runAt(reachState, reachPose({ leftElevation: 100 }), 300);
    runAt(reachState, reachPose({ leftElevation: 100 }), 400);
    const nudge = runAt(reachState, reachPose({ leftElevation: 100 }), 3500);
    expect(nudge?.poseData.reachCue?.kind).toBe('re-arm');
  });

  it('does not nudge an armed arm rising slowly through the band', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose(), 0); // armed
    runAt(reachState, reachPose({ leftElevation: 100 }), 100);
    runAt(reachState, reachPose({ leftElevation: 100 }), 2000);
    const slow = runAt(reachState, reachPose({ leftElevation: 100 }), 5000);
    expect(slow?.poseData.reachCue).toBeNull();
    // And the slow raise still counts when it crosses the line.
    runAt(reachState, reachPose({ leftElevation: 160 }), 5100);
    const rep = runAt(reachState, reachPose({ leftElevation: 160 }), 5200);
    expect(rep?.isRepCompleted).toBe(true);
  });
});

describe('missing-arm guidance', () => {
  const runAt = (
    reachState: ReturnType<typeof createReachState>,
    keypoints: ReturnType<typeof reachPose>,
    now: number
  ) => processReach({ ...baseParams, keypoints, reachState, nowMs: now });

  it('stays quiet through a brief flicker, then names the missing side', () => {
    const reachState = createReachState();
    const early = runAt(reachState, reachPose({ rightScore: 0.1 }), 0);
    expect(early?.poseData.missingArm).toBeNull();

    const flicker = runAt(reachState, reachPose({ rightScore: 0.1 }), 800);
    expect(flicker?.poseData.missingArm).toBeNull();

    const missing = runAt(reachState, reachPose({ rightScore: 0.1 }), 1100);
    expect(missing?.poseData.missingArm).toBe('right');
  });

  it('clears the moment the arm is visible again', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose({ rightScore: 0.1 }), 0);
    runAt(reachState, reachPose({ rightScore: 0.1 }), 1100);
    const back = runAt(reachState, reachPose(), 1200);
    expect(back?.poseData.missingArm).toBeNull();
  });

  it('reports both arms through the framing return when neither reads', () => {
    const reachState = createReachState();
    runAt(reachState, reachPose({ leftScore: 0.1, rightScore: 0.1 }), 0);
    const missing = runAt(reachState, reachPose({ leftScore: 0.1, rightScore: 0.1 }), 1100);
    expect(missing?.isRepCompleted).toBe(false);
    expect(missing?.poseData.missingArm).toBe('both');
  });
});

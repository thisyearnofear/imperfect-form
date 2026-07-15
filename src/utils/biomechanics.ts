import { Keypoint, BiomechanicalState } from '../types/mediapipe';
import {
  createCurlState,
  createJumpState,
  createPullupState,
  processCurls,
  processJumps,
  processPullups,
  type CurlState,
  type JumpState,
  type PullupState,
  type RepState as EngineRepState,
} from '../lib/exercise-engine';

export interface Point {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

export type ExerciseMode = 'pushups' | 'squats' | 'pullups' | 'jumps' | 'curls';

/** Modes counted by the ported exercise engine rather than the local detectors. */
export type EngineMode = 'pullups' | 'jumps' | 'curls';

export function isEngineMode(mode: ExerciseMode): mode is EngineMode {
  return mode === 'pullups' || mode === 'jumps' || mode === 'curls';
}

export function getPoint(keypoints: Keypoint[], name: string): Point | null {
  const kp = keypoints.find((k) => k.name === name);
  return kp && kp.score > 0.3 ? kp : null;
}

export function calculateTrunkLean(shoulder: Point, hip: Point): number {
  return Math.abs(Math.atan2(shoulder.x - hip.x, shoulder.y - hip.y) * (180 / Math.PI));
}

export function calculateKneeValgus(hip: Point, knee: Point, ankle: Point): number {
  const lineX = hip.x + (ankle.x - hip.x) * ((knee.y - hip.y) / (ankle.y - hip.y));
  return Math.abs(knee.x - lineX);
}

export function calculateAngle(a: Point, b: Point, c: Point): number {
  if (!a || !b || !c) return 0;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

const MIN_TIME_BETWEEN_REPS = 800; // ms

export interface RepCounterState {
  repState: 'up' | 'down' | 'middle';
  repCount: number;
  lastRepTime: number;
}

export function createInitialRepCounterState(): RepCounterState {
  return {
    repState: 'middle',
    repCount: 0,
    lastRepTime: 0,
  };
}

export function detectPushup(keypoints: Keypoint[], state: RepCounterState): boolean {
  const ls = getPoint(keypoints, 'left_shoulder');
  const rs = getPoint(keypoints, 'right_shoulder');
  const le = getPoint(keypoints, 'left_elbow');
  const re = getPoint(keypoints, 'right_elbow');
  const lw = getPoint(keypoints, 'left_wrist');
  const rw = getPoint(keypoints, 'right_wrist');

  if (!ls || !rs || !le || !re || !lw || !rw) return false;

  const leftArmAngle = calculateAngle(ls, le, lw);
  const rightArmAngle = calculateAngle(rs, re, rw);
  const avgAngle = (leftArmAngle + rightArmAngle) / 2;

  const isDown = avgAngle < 85;
  const isUp = avgAngle > 155;
  const currentTime = Date.now();

  if (isDown && state.repState !== 'down') {
    state.repState = 'down';
    return false;
  }
  if (
    isUp &&
    state.repState === 'down' &&
    currentTime - state.lastRepTime > MIN_TIME_BETWEEN_REPS
  ) {
    state.repState = 'up';
    state.lastRepTime = currentTime;
    return true;
  }
  return false;
}

export function detectSquat(keypoints: Keypoint[], state: RepCounterState): boolean {
  const lh = getPoint(keypoints, 'left_hip');
  const rh = getPoint(keypoints, 'right_hip');
  const lk = getPoint(keypoints, 'left_knee');
  const rk = getPoint(keypoints, 'right_knee');
  const la = getPoint(keypoints, 'left_ankle');
  const ra = getPoint(keypoints, 'right_ankle');

  if (!lh || !rh || !lk || !rk || !la || !ra) return false;

  const leftAngle = calculateAngle(lh, lk, la);
  const rightAngle = calculateAngle(rh, rk, ra);
  const avgAngle = (leftAngle + rightAngle) / 2;

  const isDown = avgAngle < 115;
  const isUp = avgAngle > 165;
  const currentTime = Date.now();

  if (isDown && state.repState !== 'down') {
    state.repState = 'down';
    return false;
  }
  if (
    isUp &&
    state.repState === 'down' &&
    currentTime - state.lastRepTime > MIN_TIME_BETWEEN_REPS
  ) {
    state.repState = 'up';
    state.lastRepTime = currentTime;
    return true;
  }
  return false;
}

/**
 * Adapter state for the exercise-engine processors (pull-ups / jumps),
 * mirroring RepCounterState's role for the local detectors.
 */
export interface EngineRepDetectorState {
  engineRepState: EngineRepState;
  pullupState: PullupState;
  jumpState: JumpState;
  curlState: CurlState;
  lastFeedback?: string;
  lastRepScore?: number;
}

export function createEngineRepDetectorState(mode: EngineMode): EngineRepDetectorState {
  return {
    engineRepState: mode === 'jumps' ? 'GROUNDED' : 'DOWN',
    pullupState: createPullupState(),
    jumpState: createJumpState(),
    curlState: createCurlState(),
  };
}

/** Returns true when a rep completes, matching detectPushup/detectSquat's contract. */
export function detectEngineRep(
  keypoints: Keypoint[],
  mode: EngineMode,
  state: EngineRepDetectorState
): boolean {
  const params = {
    keypoints,
    repState: state.engineRepState,
    internalReps: 0,
    lastRepIssues: [] as string[],
  };
  const result =
    mode === 'pullups'
      ? processPullups({ ...params, pullupState: state.pullupState })
      : mode === 'jumps'
        ? processJumps({ ...params, jumpState: state.jumpState })
        : processCurls({ ...params, curlState: state.curlState });

  if (!result) return false;
  if (result.newRepState) state.engineRepState = result.newRepState;
  if (result.feedback) state.lastFeedback = result.feedback;
  if (result.isRepCompleted) {
    state.lastRepScore = result.repCompletionData?.score;
    return true;
  }
  return false;
}

/** Maps engine rep state onto the 'up'/'down' display states used by drawFeedback. */
export function engineDisplayRepState(state: EngineRepDetectorState): 'up' | 'down' {
  return state.engineRepState === 'UP' || state.engineRepState === 'AIRBORNE' ? 'up' : 'down';
}

export function analyzeBiomechanics(keypoints: Keypoint[], mode: ExerciseMode): BiomechanicalState {
  const lh = getPoint(keypoints, 'left_hip');
  const ls = getPoint(keypoints, 'left_shoulder');
  const lk = getPoint(keypoints, 'left_knee');
  const la = getPoint(keypoints, 'left_ankle');
  const lw = getPoint(keypoints, 'left_wrist');

  const metrics: BiomechanicalState = {
    trunkLean: 0,
    kneeValgus: 0,
    ankleFlexion: 0,
    depth: 0,
    symmetry: 1,
    isStable: true,
    warnings: [],
  };

  if (ls && lh) metrics.trunkLean = calculateTrunkLean(ls, lh);

  if (mode === 'squats' && lh && lk && la) {
    metrics.kneeValgus = calculateKneeValgus(lh, lk, la);
    metrics.ankleFlexion = calculateAngle(lk, la, { x: la.x + 10, y: la.y });
    const currentAngle = calculateAngle(lh, lk, la);
    metrics.depth = (170 - currentAngle) / (170 - 110);
    if (metrics.kneeValgus > 40) metrics.warnings.push('KNEES IN');
    if (metrics.trunkLean > 45) metrics.warnings.push('LEANING TOO FAR');
  }

  if (mode === 'pushups' && ls && lw) {
    const le = getPoint(keypoints, 'left_elbow');
    if (le) {
      const currentAngle = calculateAngle(ls, le, lw);
      metrics.depth = (160 - currentAngle) / (160 - 85);
    }
  }

  if (mode === 'pullups' && ls && lw) {
    const le = getPoint(keypoints, 'left_elbow');
    const rs = getPoint(keypoints, 'right_shoulder');
    const re = getPoint(keypoints, 'right_elbow');
    const rw = getPoint(keypoints, 'right_wrist');
    if (le) {
      const leftAngle = calculateAngle(ls, le, lw);
      // Pull progress: 180° dead hang -> 60° chin over bar
      metrics.depth = Math.max(0, Math.min(1, (180 - leftAngle) / (180 - 60)));
      if (rs && re && rw) {
        const rightAngle = calculateAngle(rs, re, rw);
        metrics.symmetry = Math.max(0, 1 - Math.abs(leftAngle - rightAngle) / 45);
        if (Math.abs(leftAngle - rightAngle) > 30) metrics.warnings.push('PULL EVENLY');
      }
    }
  }

  if (mode === 'curls' && ls && lw) {
    const le = getPoint(keypoints, 'left_elbow');
    const rs = getPoint(keypoints, 'right_shoulder');
    const re = getPoint(keypoints, 'right_elbow');
    const rw = getPoint(keypoints, 'right_wrist');
    if (le) {
      const leftAngle = calculateAngle(ls, le, lw);
      // Curl progress: 170° extended -> 50° fully curled
      metrics.depth = Math.max(0, Math.min(1, (170 - leftAngle) / (170 - 50)));
      // Upper-arm drift = momentum cheat
      if (lh) {
        const shoulderDrift = calculateAngle(lh, ls, le);
        if (shoulderDrift > 30) metrics.warnings.push('PIN ELBOWS');
      }
      if (rs && re && rw) {
        const rightAngle = calculateAngle(rs, re, rw);
        metrics.symmetry = Math.max(0, 1 - Math.abs(leftAngle - rightAngle) / 90);
      }
    }
  }

  if (mode === 'jumps' && lh && lk && la) {
    metrics.kneeValgus = calculateKneeValgus(lh, lk, la);
    const currentAngle = calculateAngle(lh, lk, la);
    // Crouch loading before takeoff: 180° standing -> 120° loaded
    metrics.depth = Math.max(0, Math.min(1, (180 - currentAngle) / (180 - 120)));
    if (metrics.kneeValgus > 40) metrics.warnings.push('KNEES IN');
  }

  return metrics;
}

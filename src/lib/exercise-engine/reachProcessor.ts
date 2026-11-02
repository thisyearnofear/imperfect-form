import { calculateAngle } from './poseMath';
import type { EngineKeypoint, PoseData, ProcessorResult, RepState } from './types';

/**
 * Overhead reach rep processor (Phase D — first joint-screen protocol after
 * curls, docs/DESIGN_EVOLUTION §D).
 *
 * The screen: a controlled arm raise, side or front view. The primary signal
 * is arm elevation — the shoulder→elbow vector's angle from straight-down —
 * which is honest camera geometry: it reads flexion *and* abduction as
 * "reaching overhead" without claiming a clinical plane, and it needs no hip
 * keypoints (a standing upper-body frame often crops them).
 *
 * A rep counts when the arm crosses RAISED_DEG after having been lowered —
 * reaching the measured position is the event; the trace records the whole
 * excursion either way. Cheat detection: when the hip is in frame, the
 * shoulder–hip line leaning past LEAN_DEG while the arm is up means the back
 * is doing the reach's work.
 */

const LOWERED_DEG = 50; // arm hanging — arms the rep
const RAISED_DEG = 135; // arm elevated overhead — counts the rep
const LEAN_DEG = 30; // trunk sway beyond this while elevated = compensation
const LEAN_CHECK_DEG = 60; // only judge lean once the arm is actually rising
const MIN_SCORE = 0.4;

type ArmFlag = 'lowered' | 'raised' | null;

export interface ReachState {
  leftFlag: ArmFlag;
  rightFlag: ArmFlag;
  repsCompleted: number;
  lastRepScore?: number;
  /** True if trunk lean was observed since the last completed rep. */
  leanSinceLastRep: boolean;
}

export interface ReachProcessorParams {
  keypoints: EngineKeypoint[];
  repState: RepState;
  internalReps: number;
  lastRepIssues: string[];
  reachState: ReachState;
}

export type ReachProcessorResult = ProcessorResult & { reachState?: ReachState };

const score = (k: EngineKeypoint | undefined): number => k?.score ?? 0;

interface ArmReading {
  /** Arm elevation: shoulder→elbow angle from straight-down, 0..180. */
  elevation: number;
  /** Trunk sway from vertical, only when the hip is visible; else null. */
  lean: number | null;
  elbowAngle: number;
  visible: boolean;
}

function readArm(keypoints: EngineKeypoint[], side: 'left' | 'right'): ArmReading | null {
  const find = (name: string) => keypoints.find((k) => k.name === name);
  const shoulder = find(`${side}_shoulder`);
  const elbow = find(`${side}_elbow`);
  const wrist = find(`${side}_wrist`);
  const hip = find(`${side}_hip`);

  if (!shoulder || !elbow || !wrist) return null;

  const visible =
    score(shoulder) > MIN_SCORE && score(elbow) > MIN_SCORE && score(wrist) > MIN_SCORE;

  // Arm elevation from straight-down: arm hanging reads ~0°, horizontal ~90°,
  // overhead ~180°. Image y grows downward, so "elbow above shoulder" is
  // elbow.y < shoulder.y.
  const elevation =
    Math.atan2(Math.abs(elbow.x - shoulder.x), elbow.y - shoulder.y) * (180 / Math.PI);

  const lean =
    hip && score(hip) > MIN_SCORE
      ? Math.abs(Math.atan2(shoulder.x - hip.x, hip.y - shoulder.y) * (180 / Math.PI))
      : null;

  return {
    elevation,
    lean,
    elbowAngle: calculateAngle(shoulder, elbow, wrist),
    visible,
  };
}

export const processReach = ({
  keypoints,
  reachState,
}: ReachProcessorParams): ReachProcessorResult | null => {
  const left = readArm(keypoints, 'left');
  const right = readArm(keypoints, 'right');

  if (!left && !right) return null;

  const leftVisible = !!left && left.visible;
  const rightVisible = !!right && right.visible;

  if (!leftVisible && !rightVisible) {
    return {
      feedback: 'Step back so I can see your shoulders and arms.',
      isRepCompleted: false,
      poseData: { keypoints },
    };
  }

  const poseData: PoseData = {
    keypoints,
    leftElbowAngle: left?.elbowAngle,
    rightElbowAngle: right?.elbowAngle,
    // Shoulder-flexion reads travel on the shoulder-angle channels so the
    // session instrument and telemetry keep their existing shape.
    leftShoulderAngle: left?.elevation,
    rightShoulderAngle: right?.elevation,
  };

  // The instrument follows the arm that is actually reaching.
  const activeArm = [leftVisible ? left : null, rightVisible ? right : null]
    .filter((reading): reading is ArmReading => reading !== null)
    .sort((a, b) => b.elevation - a.elevation)[0];
  if (activeArm) {
    poseData.observedShoulderAngle = activeArm.elevation;
    poseData.activeShoulderAngle = activeArm.elevation;
    poseData.activeElbowAngle = activeArm.elbowAngle;
  }

  let feedback: string | undefined;
  let formCheckSpeak: { issue: string; phrase: string } | undefined;

  // Compensation: the trunk swaying while the arm rises means the back is
  // doing the reach's work. Only judged when the hip is in frame — no
  // keypoints, no accusation.
  const leaning = [left, right].some(
    (reading) =>
      !!reading &&
      reading.visible &&
      reading.lean !== null &&
      reading.lean > LEAN_DEG &&
      reading.elevation > LEAN_CHECK_DEG
  );

  if (leaning) {
    reachState.leanSinceLastRep = true;
    feedback = 'Reach with the arm — keep your trunk still.';
    formCheckSpeak = { issue: 'trunk_lean', phrase: 'Keep your trunk still' };
  }

  // Per-arm hysteresis (each arm counts independently — alternating reaches work).
  let repCompleted = false;

  const advance = (reading: ArmReading | null, flag: ArmFlag): { flag: ArmFlag; rep: boolean } => {
    if (!reading || !reading.visible) return { flag, rep: false };
    if (reading.elevation < LOWERED_DEG) return { flag: 'lowered', rep: false };
    if (reading.elevation > RAISED_DEG && flag === 'lowered') {
      return { flag: 'raised', rep: true };
    }
    return { flag, rep: false };
  };

  const leftResult = advance(left, reachState.leftFlag);
  reachState.leftFlag = leftResult.flag;
  const rightResult = advance(right, reachState.rightFlag);
  reachState.rightFlag = rightResult.flag;

  if (leftResult.rep || rightResult.rep) {
    repCompleted = true;
    reachState.repsCompleted += 1;

    const issues: string[] = [];
    let repScore = 100;
    if (reachState.leanSinceLastRep) {
      issues.push('trunk_lean');
      repScore -= 25;
    }
    reachState.leanSinceLastRep = false;
    reachState.lastRepScore = repScore;

    const isFirstRep = reachState.repsCompleted === 1;
    return {
      isRepCompleted: true,
      poseData,
      repCompletionData: { score: repScore, issues },
      feedback: isFirstRep
        ? 'Good — that is your range today.'
        : repScore === 100
          ? 'Clean rep.'
          : feedback,
      formCheckSpeak: repScore === 100 ? undefined : formCheckSpeak,
    };
  }

  return {
    isRepCompleted: repCompleted,
    poseData,
    feedback,
    formCheckSpeak,
  };
};

export function createReachState(): ReachState {
  return {
    leftFlag: null,
    rightFlag: null,
    repsCompleted: 0,
    lastRepScore: undefined,
    leanSinceLastRep: false,
  };
}

export function resetReachState(reachState: ReachState): void {
  reachState.leftFlag = null;
  reachState.rightFlag = null;
  reachState.repsCompleted = 0;
  reachState.lastRepScore = undefined;
  reachState.leanSinceLastRep = false;
}

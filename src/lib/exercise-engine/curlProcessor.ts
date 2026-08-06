import { calculateAngle } from './poseMath';
import type { EngineKeypoint, PoseData, ProcessorResult, RepState } from './types';

/**
 * Bicep curl rep processor.
 *
 * Thresholds adapted from sneldao/imperfectcurl (proven 160°/50° per-arm
 * hysteresis), rebuilt in the engine architecture with cheat detection the
 * original lacked: elbow swing (upper arm should stay pinned - shoulder
 * angle beyond ~30° during the curl means momentum is doing the work).
 *
 * Curls are the most universal exercise (a water bottle works) and the
 * flagship robot demonstration - elbow flexion is literally what the SO-101
 * does best. See docs/NORTH_STAR.md.
 */

const EXTENDED_DEG = 160; // arm considered extended (arms the rep)
const FLEXED_DEG = 50; // arm considered fully curled (counts the rep)
const SWING_SHOULDER_DEG = 30; // upper-arm drift beyond this = momentum cheat
const MIN_SCORE = 0.4;

type ArmFlag = 'extended' | 'flexed' | null;

export interface CurlState {
  leftFlag: ArmFlag;
  rightFlag: ArmFlag;
  repsCompleted: number;
  lastRepScore?: number;
  /** True if elbow swing was observed since the last completed rep. */
  swingSinceLastRep: boolean;
}

export interface CurlProcessorParams {
  keypoints: EngineKeypoint[];
  repState: RepState;
  internalReps: number;
  lastRepIssues: string[];
  curlState: CurlState;
}

export type CurlProcessorResult = ProcessorResult & { curlState?: CurlState };

const score = (k: EngineKeypoint | undefined): number => k?.score ?? 0;

interface ArmReading {
  elbowAngle: number;
  shoulderAngle: number;
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

  return {
    elbowAngle: calculateAngle(shoulder, elbow, wrist),
    // Upper-arm drift from the torso line; falls back to 0 (no swing signal)
    // when the hip isn't visible rather than false-flagging.
    shoulderAngle: hip && score(hip) > MIN_SCORE ? calculateAngle(hip, shoulder, elbow) : 0,
    visible,
  };
}

export const processCurls = ({
  keypoints,
  curlState,
}: CurlProcessorParams): CurlProcessorResult | null => {
  const left = readArm(keypoints, 'left');
  const right = readArm(keypoints, 'right');

  if (!left && !right) return null;

  const leftVisible = !!left && left.visible;
  const rightVisible = !!right && right.visible;

  if (!leftVisible && !rightVisible) {
    return {
      feedback: 'Step back so I can see your arms.',
      isRepCompleted: false,
      poseData: { keypoints },
    };
  }

  const poseData: PoseData = {
    keypoints,
    leftElbowAngle: left?.elbowAngle,
    rightElbowAngle: right?.elbowAngle,
    leftShoulderAngle: left?.shoulderAngle,
    rightShoulderAngle: right?.shoulderAngle,
  };

  let feedback: string | undefined;
  let formCheckSpeak: { issue: string; phrase: string } | undefined;

  // Pick the most actively curled visible arm for the UI instrument. This keeps
  // alternating curls truthful instead of averaging an extended arm with a
  // curled arm and describing neither one.
  const activeArm = [leftVisible ? left : null, rightVisible ? right : null]
    .filter((reading): reading is ArmReading => reading !== null)
    .sort((a, b) => a.elbowAngle - b.elbowAngle)[0];
  if (activeArm) {
    poseData.observedElbowAngle = activeArm.elbowAngle;
    poseData.observedShoulderAngle = activeArm.shoulderAngle;
    poseData.activeElbowAngle = activeArm.elbowAngle;
    poseData.activeShoulderAngle = activeArm.shoulderAngle;
  }

  // Cheat detection: upper arm should stay pinned while curling
  const leftSwing =
    leftVisible && left.shoulderAngle > SWING_SHOULDER_DEG && left.elbowAngle < EXTENDED_DEG;
  const rightSwing =
    rightVisible && right.shoulderAngle > SWING_SHOULDER_DEG && right.elbowAngle < EXTENDED_DEG;
  const swinging = leftSwing || rightSwing;

  if (swinging) {
    curlState.swingSinceLastRep = true;
    feedback = 'Keep your elbows pinned to your sides!';
    formCheckSpeak = { issue: 'elbow_swing', phrase: 'Pin your elbows' };
    poseData.observedElbowAngle = leftSwing ? left?.elbowAngle : right?.elbowAngle;
    poseData.observedShoulderAngle = leftSwing ? left?.shoulderAngle : right?.shoulderAngle;
  }

  // Per-arm hysteresis (each arm counts independently - alternating curls work)
  let repCompleted = false;

  const advance = (reading: ArmReading | null, flag: ArmFlag): { flag: ArmFlag; rep: boolean } => {
    if (!reading || !reading.visible) return { flag, rep: false };
    if (reading.elbowAngle > EXTENDED_DEG) return { flag: 'extended', rep: false };
    if (reading.elbowAngle < FLEXED_DEG && flag === 'extended') {
      return { flag: 'flexed', rep: true };
    }
    return { flag, rep: false };
  };

  const leftResult = advance(left, curlState.leftFlag);
  curlState.leftFlag = leftResult.flag;
  const rightResult = advance(right, curlState.rightFlag);
  curlState.rightFlag = rightResult.flag;

  if (leftResult.rep || rightResult.rep) {
    repCompleted = true;
    curlState.repsCompleted += 1;

    const issues: string[] = [];
    let repScore = 100;
    if (curlState.swingSinceLastRep) {
      issues.push('elbow_swing');
      repScore -= 30;
    }
    curlState.swingSinceLastRep = false;
    curlState.lastRepScore = repScore;

    const isFirstRep = curlState.repsCompleted === 1;
    return {
      isRepCompleted: true,
      poseData,
      repCompletionData: { score: repScore, issues },
      feedback: isFirstRep
        ? 'Great first curl! Nice and controlled.'
        : repScore === 100
          ? 'Clean rep!'
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

export function createCurlState(): CurlState {
  return {
    leftFlag: null,
    rightFlag: null,
    repsCompleted: 0,
    lastRepScore: undefined,
    swingSinceLastRep: false,
  };
}

export function resetCurlState(curlState: CurlState): void {
  curlState.leftFlag = null;
  curlState.rightFlag = null;
  curlState.repsCompleted = 0;
  curlState.lastRepScore = undefined;
  curlState.swingSinceLastRep = false;
}

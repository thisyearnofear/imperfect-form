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
const NEAR_MISS_DEG = 115; // got most of the way but never crossed the line
const LEAN_DEG = 30; // trunk sway beyond this while elevated = compensation
const LEAN_CHECK_DEG = 60; // only judge lean once the arm is actually rising
const MIN_SCORE = 0.4;
// Reliability, not math changes: the 50/135 lines stay exactly where they
// are — the cues below only explain them.
const ELEVATION_WINDOW = 3; // median-of-N before the thresholds — kills flicker
const HIDDEN_CUE_MS = 1000; // an arm under MIN_SCORE this long = "can't see"
const MID_BAND_NUDGE_MS = 3000; // hovering between the lines this long = nudge
const NEAR_MISS_COOLDOWN_MS = 4000; // one gentle cue, never nagging
const CUE_HOLD_MS = 2800; // a fired cue stays on the live line this long

export type ReachCueKind = 'near-miss' | 're-arm';

const REACH_CUE_MESSAGES: Record<ReachCueKind, string> = {
  'near-miss': 'Close — a little higher for the line.',
  're-arm': 'Let it come down, then up again.',
};

type ArmFlag = 'lowered' | 'raised' | null;

/** Per-arm bookkeeping for the reliability layer: the smoothing window, the
    excursion peak (near-miss detection), and the mid-band hover timer. */
export interface ReachArmMotion {
  /** Last raw elevations — median before the threshold check. */
  elevWindow: number[];
  /** Highest smoothed elevation since the arm last read below LOWERED_DEG. */
  peakSinceLowered: number;
  /** When the un-armed arm entered the 50–135° band; null outside it. */
  midSince: number | null;
  /** The re-arm nudge fires once per band visit, not every frame. */
  midNudged: boolean;
}

export interface ReachState {
  leftFlag: ArmFlag;
  rightFlag: ArmFlag;
  repsCompleted: number;
  lastRepScore?: number;
  /** True if trunk lean was observed since the last completed rep. */
  leanSinceLastRep: boolean;
  leftArm: ReachArmMotion;
  rightArm: ReachArmMotion;
  /** When each side dropped under the visibility floor; null while seen. */
  leftHiddenSince: number | null;
  rightHiddenSince: number | null;
  lastNearMissCueAt: number;
  /** A fired cue is published until `until` so the live line can hold it. */
  cue: { kind: ReachCueKind; until: number } | null;
}

export interface ReachProcessorParams {
  keypoints: EngineKeypoint[];
  repState: RepState;
  internalReps: number;
  lastRepIssues: string[];
  reachState: ReachState;
  /** Frame timestamp for the cue timers; tests pass an explicit clock. */
  nowMs?: number;
}

export type ReachProcessorResult = ProcessorResult & { reachState?: ReachState };

const score = (k: EngineKeypoint | undefined): number => k?.score ?? 0;

/**
 * Arm elevation from straight-down: arm hanging reads ~0°, horizontal ~90°,
 * overhead ~180°. Image y grows downward, so "elbow above shoulder" is
 * elbow.y < shoulder.y. Exported so the session's live joint inset and the
 * rep counter share one definition of "how high the arm is".
 */
export function armElevationDeg(shoulder: EngineKeypoint, elbow: EngineKeypoint): number {
  return Math.atan2(Math.abs(elbow.x - shoulder.x), elbow.y - shoulder.y) * (180 / Math.PI);
}

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

  const elevation = armElevationDeg(shoulder, elbow);

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
  nowMs,
}: ReachProcessorParams): ReachProcessorResult | null => {
  const now = nowMs ?? Date.now();
  const left = readArm(keypoints, 'left');
  const right = readArm(keypoints, 'right');

  if (!left && !right) return null;

  // Missing-limb bookkeeping: the same keypoint scores readArm checks,
  // stretched over time so one flickered frame never claims an arm is gone.
  const markHidden = (reading: ArmReading | null, since: number | null) =>
    !reading || !reading.visible ? (since ?? now) : null;
  reachState.leftHiddenSince = markHidden(left, reachState.leftHiddenSince);
  reachState.rightHiddenSince = markHidden(right, reachState.rightHiddenSince);
  const leftHidden =
    reachState.leftHiddenSince !== null && now - reachState.leftHiddenSince > HIDDEN_CUE_MS;
  const rightHidden =
    reachState.rightHiddenSince !== null && now - reachState.rightHiddenSince > HIDDEN_CUE_MS;
  const missingArm: PoseData['missingArm'] =
    leftHidden && rightHidden ? 'both' : leftHidden ? 'left' : rightHidden ? 'right' : null;

  const leftVisible = !!left && left.visible;
  const rightVisible = !!right && right.visible;

  if (!leftVisible && !rightVisible) {
    return {
      feedback: 'Step back so I can see your shoulders and arms.',
      isRepCompleted: false,
      poseData: { keypoints, missingArm },
    };
  }

  // Median-of-3 before the 50/135 lines: a one-frame spike can no longer arm,
  // count, or un-arm a rep — the boundary jitter that read as "unreliable".
  // The window clears when the arm drops out, so stale frames never blend
  // into the next sighting.
  const smooth = (reading: ArmReading | null, arm: ReachArmMotion): number | null => {
    if (!reading || !reading.visible) {
      arm.elevWindow.length = 0;
      arm.peakSinceLowered = 0;
      arm.midSince = null;
      arm.midNudged = false;
      return null;
    }
    arm.elevWindow.push(reading.elevation);
    if (arm.elevWindow.length > ELEVATION_WINDOW) arm.elevWindow.shift();
    const sorted = [...arm.elevWindow].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const leftElev = smooth(left, reachState.leftArm);
  const rightElev = smooth(right, reachState.rightArm);

  const poseData: PoseData = {
    keypoints,
    leftElbowAngle: left?.elbowAngle,
    rightElbowAngle: right?.elbowAngle,
    // Shoulder-flexion reads travel on the shoulder-angle channels so the
    // session instrument and telemetry keep their existing shape. Smoothed
    // values: the gauge shows the same number the counter uses.
    leftShoulderAngle: leftElev ?? undefined,
    rightShoulderAngle: rightElev ?? undefined,
    missingArm,
  };

  // The instrument follows the arm that is actually reaching.
  const activeEntry = (
    [
      [left, leftElev],
      [right, rightElev],
    ] as const
  )
    .filter(
      (entry): entry is readonly [ArmReading, number] => entry[0] !== null && entry[1] !== null
    )
    .sort((a, b) => b[1] - a[1])[0];
  if (activeEntry) {
    poseData.observedShoulderAngle = activeEntry[1];
    poseData.activeShoulderAngle = activeEntry[1];
    poseData.activeElbowAngle = activeEntry[0].elbowAngle;
  }

  let feedback: string | undefined;
  let formCheckSpeak: { issue: string; phrase: string } | undefined;

  // Compensation: the trunk swaying while the arm rises means the back is
  // doing the reach's work. Only judged when the hip is in frame — no
  // keypoints, no accusation.
  const leaning = (
    [
      [left, leftElev],
      [right, rightElev],
    ] as const
  ).some(
    ([reading, elev]) =>
      reading !== null &&
      reading.visible &&
      reading.lean !== null &&
      reading.lean > LEAN_DEG &&
      elev !== null &&
      elev > LEAN_CHECK_DEG
  );

  if (leaning) {
    reachState.leanSinceLastRep = true;
    feedback = 'Easy — no lean-back.';
    formCheckSpeak = { issue: 'trunk_lean', phrase: 'Easy — no lean-back' };
  }

  // Per-arm hysteresis (each arm counts independently — alternating reaches work).
  // The advance also reports the two explainable non-rep events: the near-miss
  // (peak reached NEAR_MISS but never the line before coming back down) and
  // the mid-band hover while un-armed (the re-arm the counter is waiting for).
  let repCompleted = false;

  const advance = (
    elev: number | null,
    flag: ArmFlag,
    arm: ReachArmMotion
  ): { flag: ArmFlag; rep: boolean; nearMiss: boolean; rearmNudge: boolean } => {
    const none = { flag, rep: false, nearMiss: false, rearmNudge: false };
    if (elev === null) return none;
    if (elev < LOWERED_DEG) {
      // Coming back down: if the excursion got close to the line but never
      // crossed it, that is a near-miss worth one quiet sentence — not a rep.
      const nearMiss = arm.peakSinceLowered >= NEAR_MISS_DEG && arm.peakSinceLowered < RAISED_DEG;
      arm.peakSinceLowered = 0;
      arm.midSince = null;
      arm.midNudged = false;
      return { flag: 'lowered', rep: false, nearMiss, rearmNudge: false };
    }
    arm.peakSinceLowered = Math.max(arm.peakSinceLowered, elev);
    if (elev > RAISED_DEG) {
      arm.midSince = null;
      arm.midNudged = false;
      if (flag === 'lowered') {
        return { flag: 'raised', rep: true, nearMiss: false, rearmNudge: false };
      }
      return none;
    }
    // Mid-band. An armed arm rising slowly through the band is a rep in
    // progress — no nudge. An un-armed arm parked here is the stuck-counter
    // moment the nudge exists for: it must come down to re-arm.
    if (flag === 'lowered') {
      arm.midSince = null;
      return none;
    }
    arm.midSince ??= now;
    const rearmNudge = !arm.midNudged && now - arm.midSince > MID_BAND_NUDGE_MS;
    if (rearmNudge) arm.midNudged = true;
    return { ...none, rearmNudge };
  };

  const leftResult = advance(leftElev, reachState.leftFlag, reachState.leftArm);
  reachState.leftFlag = leftResult.flag;
  const rightResult = advance(rightElev, reachState.rightFlag, reachState.rightArm);
  reachState.rightFlag = rightResult.flag;

  // Cue arbitration: the near-miss is rate-limited so it can never nag; the
  // re-arm nudge is once per band visit by construction. Either way the cue
  // rides poseData for CUE_HOLD_MS so the live line has time to be read.
  if (
    (leftResult.nearMiss || rightResult.nearMiss) &&
    now - reachState.lastNearMissCueAt >= NEAR_MISS_COOLDOWN_MS
  ) {
    reachState.lastNearMissCueAt = now;
    reachState.cue = { kind: 'near-miss', until: now + CUE_HOLD_MS };
  }
  if (leftResult.rearmNudge || rightResult.rearmNudge) {
    reachState.cue = { kind: 're-arm', until: now + CUE_HOLD_MS };
  }
  if (reachState.cue && now >= reachState.cue.until) reachState.cue = null;
  poseData.reachCue = reachState.cue
    ? { kind: reachState.cue.kind, message: REACH_CUE_MESSAGES[reachState.cue.kind] }
    : null;

  if (leftResult.rep || rightResult.rep) {
    repCompleted = true;
    reachState.repsCompleted += 1;
    // A counted rep retires any held cue — the line celebrates, it doesn't coach.
    reachState.cue = null;
    poseData.reachCue = null;

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

const createArmMotion = (): ReachArmMotion => ({
  elevWindow: [],
  peakSinceLowered: 0,
  midSince: null,
  midNudged: false,
});

export function createReachState(): ReachState {
  return {
    leftFlag: null,
    rightFlag: null,
    repsCompleted: 0,
    lastRepScore: undefined,
    leanSinceLastRep: false,
    leftArm: createArmMotion(),
    rightArm: createArmMotion(),
    leftHiddenSince: null,
    rightHiddenSince: null,
    lastNearMissCueAt: -NEAR_MISS_COOLDOWN_MS,
    cue: null,
  };
}

export function resetReachState(reachState: ReachState): void {
  reachState.leftFlag = null;
  reachState.rightFlag = null;
  reachState.repsCompleted = 0;
  reachState.lastRepScore = undefined;
  reachState.leanSinceLastRep = false;
  reachState.leftArm = createArmMotion();
  reachState.rightArm = createArmMotion();
  reachState.leftHiddenSince = null;
  reachState.rightHiddenSince = null;
  reachState.lastNearMissCueAt = -NEAR_MISS_COOLDOWN_MS;
  reachState.cue = null;
}

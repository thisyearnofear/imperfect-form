import { calculateAngle, convertHeight } from './poseMath';
import type { EngineKeypoint, JumpRepDetails, PoseData, ProcessorResult, RepState } from './types';

/**
 * Jump rep processor. Ported from imperfectcoach (thresholds unchanged).
 *
 * Flow: instant calibration (standing, knees straight) -> adaptive-threshold
 * airborne detection -> rep counted on landing after a valid jump.
 * All heights are in pixels relative to the calibrated ground level.
 */

export interface JumpState {
  isCalibrated: boolean;
  groundLevel: number | null;
  lastAnkleY: number | null;
  consecutiveAirborneFrames: number;
  consecutiveGroundedFrames: number;
  peakHeight: number;
  jumpStartTime: number | null;
  initializationStartTime: number | null;
  isInitializing: boolean;
  repsCompleted: number;
  validJumpDetected: boolean;
  movementAnalytics?: {
    takeoffVelocity: number[]; // Explosiveness patterns
    flightTime: number; // Airborne duration
    bodyControl: number[]; // Stability during flight
    powerConsistency: number[]; // Height maintenance across reps
  };
}

export interface JumpProcessorParams {
  keypoints: EngineKeypoint[];
  repState: RepState;
  internalReps: number;
  lastRepIssues: string[];
  jumpState: JumpState;
  /** Injectable clock for deterministic tests; defaults to Date.now. */
  now?: () => number;
}

export type JumpProcessorResult = ProcessorResult & { jumpState?: JumpState };

interface JumpKeypoints {
  leftHip: EngineKeypoint;
  rightHip: EngineKeypoint;
  leftKnee: EngineKeypoint;
  rightKnee: EngineKeypoint;
  leftAnkle: EngineKeypoint;
  rightAnkle: EngineKeypoint;
}

export const processJumps = ({
  keypoints,
  repState,
  internalReps,
  lastRepIssues,
  jumpState,
  now = Date.now,
}: JumpProcessorParams): JumpProcessorResult | null => {
  const requiredPoints = extractJumpKeypoints(keypoints);
  if (!requiredPoints) {
    return {
      feedback: 'Make sure your full body is visible in the frame.',
      isRepCompleted: false,
      poseData: { keypoints },
    };
  }

  const { leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle } = requiredPoints;

  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  const poseData: PoseData = { keypoints, leftKneeAngle, rightKneeAngle };

  if (!jumpState.isCalibrated) {
    return calibrateInstantly(jumpState, avgAnkleY, avgKneeAngle, poseData, now);
  }

  const movementThreshold = calculateAdaptiveThreshold(jumpState, avgAnkleY);
  const isIntentionalJump = detectIntentionalJump(
    jumpState,
    avgAnkleY,
    avgKneeAngle,
    movementThreshold
  );

  return processJumpMovement({
    jumpState,
    avgAnkleY,
    avgKneeAngle,
    isIntentionalJump,
    repState,
    internalReps,
    lastRepIssues,
    poseData,
    now,
  });
};

function extractJumpKeypoints(keypoints: EngineKeypoint[]): JumpKeypoints | null {
  const find = (name: string) => keypoints.find((k) => k.name === name);

  const leftHip = find('left_hip');
  const rightHip = find('right_hip');
  const leftKnee = find('left_knee');
  const rightKnee = find('right_knee');
  const leftAnkle = find('left_ankle');
  const rightAnkle = find('right_ankle');

  const points = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
  const allVisible = points.every((p): p is EngineKeypoint => !!p && (p.score ?? 0) > 0.4);

  if (
    !allVisible ||
    !leftHip ||
    !rightHip ||
    !leftKnee ||
    !rightKnee ||
    !leftAnkle ||
    !rightAnkle
  ) {
    return null;
  }

  return { leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle };
}

// Graceful onboarding: 3s initialization grace period, then calibrate as soon
// as the user stands with legs reasonably straight.
function calibrateInstantly(
  jumpState: JumpState,
  avgAnkleY: number,
  avgKneeAngle: number,
  poseData: PoseData,
  now: () => number
): JumpProcessorResult {
  if (jumpState.initializationStartTime === null) {
    jumpState.initializationStartTime = now();
    jumpState.isInitializing = true;
  }

  const initializationDuration = 3000;
  const timeIntoInitialization = now() - jumpState.initializationStartTime;
  const isStillInitializing = timeIntoInitialization < initializationDuration;

  if (avgKneeAngle > 130) {
    jumpState.isCalibrated = true;
    jumpState.groundLevel = avgAnkleY;
    jumpState.lastAnkleY = avgAnkleY;
    jumpState.isInitializing = isStillInitializing;

    return {
      feedback: isStillInitializing
        ? 'I see you! Ready to jump.'
        : "Perfect! Jump whenever you're ready.",
      isRepCompleted: false,
      poseData,
      jumpState,
    };
  }

  jumpState.isInitializing = isStillInitializing;

  return {
    feedback: isStillInitializing
      ? 'Getting ready... stand naturally with legs straight.'
      : "Stand with legs straight and I'll calibrate.",
    isRepCompleted: false,
    poseData,
    jumpState,
  };
}

// Adaptive thresholds prevent false positives from walking/squats.
function calculateAdaptiveThreshold(jumpState: JumpState, currentAnkleY: number): number {
  if (jumpState.lastAnkleY == null || jumpState.groundLevel == null) {
    jumpState.lastAnkleY = currentAnkleY;
    return 20;
  }

  const recentMovement = Math.abs(currentAnkleY - jumpState.lastAnkleY);
  const baseThreshold = 20;
  const adaptiveThreshold = Math.max(baseThreshold, recentMovement * 1.2);

  jumpState.lastAnkleY = currentAnkleY;
  return Math.min(adaptiveThreshold, 45);
}

function detectIntentionalJump(
  jumpState: JumpState,
  avgAnkleY: number,
  avgKneeAngle: number,
  threshold: number
): boolean {
  if (jumpState.groundLevel == null) return false;

  const heightDifference = jumpState.groundLevel - avgAnkleY;

  // 1. Significant upward movement (ankles above ground level)
  const hasSignificantHeight = heightDifference > threshold;
  // 2. Legs reasonably extended (a squat bends knees <120°)
  const hasJumpingPosture = avgKneeAngle > 120;
  // 3. Clear airborne displacement (not just raised heels)
  const isClearlyAirborne = heightDifference > 16;

  return hasSignificantHeight && hasJumpingPosture && isClearlyAirborne;
}

function processJumpMovement({
  jumpState,
  avgAnkleY,
  avgKneeAngle,
  isIntentionalJump,
  repState,
  poseData,
  now,
}: {
  jumpState: JumpState;
  avgAnkleY: number;
  avgKneeAngle: number;
  isIntentionalJump: boolean;
  repState: RepState;
  internalReps: number;
  lastRepIssues: string[];
  poseData: PoseData;
  now: () => number;
}): JumpProcessorResult {
  const baseResult = { isRepCompleted: false, poseData, jumpState };

  if (isIntentionalJump) {
    jumpState.consecutiveAirborneFrames++;
    jumpState.consecutiveGroundedFrames = 0;

    const currentHeight = (jumpState.groundLevel ?? avgAnkleY) - avgAnkleY;
    jumpState.peakHeight = Math.max(jumpState.peakHeight, currentHeight);

    // Mark as valid jump after sustained airborne state with meaningful height
    if (jumpState.consecutiveAirborneFrames >= 2 && currentHeight >= 16) {
      jumpState.validJumpDetected = true;
    }

    if (!jumpState.movementAnalytics) {
      jumpState.movementAnalytics = {
        takeoffVelocity: [],
        flightTime: 0,
        bodyControl: [],
        powerConsistency: [],
      };
    }

    if (jumpState.lastAnkleY) {
      const velocity = jumpState.lastAnkleY - avgAnkleY; // Upward velocity
      jumpState.movementAnalytics.takeoffVelocity.push(velocity);
    }

    if (jumpState.jumpStartTime === null) {
      jumpState.jumpStartTime = now();
    }

    if (repState === 'GROUNDED') {
      return {
        ...baseResult,
        newRepState: 'AIRBORNE',
        feedback: 'Great jump! Keep going up!',
      };
    }

    return {
      ...baseResult,
      feedback: `Nice height: ${Math.round(convertHeight(currentHeight, 'cm'))}cm!`,
    };
  }

  jumpState.consecutiveGroundedFrames++;
  jumpState.consecutiveAirborneFrames = 0;

  // Re-smooth ground level while stably grounded to adapt to camera drift
  if (
    jumpState.consecutiveGroundedFrames >= 2 &&
    avgKneeAngle > 135 &&
    jumpState.groundLevel != null
  ) {
    jumpState.groundLevel = jumpState.groundLevel * 0.85 + avgAnkleY * 0.15;
  }

  const minPeakHeightForValidJump = 14;

  if (repState === 'AIRBORNE' && jumpState.consecutiveGroundedFrames >= 3) {
    if (jumpState.validJumpDetected && jumpState.peakHeight >= minPeakHeightForValidJump) {
      jumpState.repsCompleted++;
      const repData = generateJumpRepData(jumpState, avgKneeAngle);

      jumpState.peakHeight = 0;
      jumpState.jumpStartTime = null;
      jumpState.validJumpDetected = false;

      const isFirstRep = jumpState.repsCompleted === 1;
      const feedback = isFirstRep
        ? 'Great first jump! Keep it up!'
        : repData.score >= 70
          ? 'Excellent jump!'
          : 'Good jump! Try for more height next time.';

      return {
        ...baseResult,
        newRepState: 'GROUNDED',
        isRepCompleted: true,
        repCompletionData: repData,
        feedback,
      };
    }

    // Movement detected but not a valid jump - reset without counting
    jumpState.peakHeight = 0;
    jumpState.jumpStartTime = null;
    jumpState.validJumpDetected = false;

    return {
      ...baseResult,
      newRepState: 'GROUNDED',
    };
  }

  return baseResult;
}

function generateJumpRepData(jumpState: JumpState, avgKneeAngle: number) {
  const jumpHeight = jumpState.peakHeight;
  const currentIssues: string[] = [];

  // Height scoring (60% of total score)
  let heightScore = 0;
  if (jumpHeight >= 60) heightScore = 100;
  else if (jumpHeight >= 40) heightScore = 80;
  else if (jumpHeight >= 25) heightScore = 60;
  else if (jumpHeight >= 15) heightScore = 40;
  else {
    heightScore = 20;
    currentIssues.push('low_jump');
  }

  // Landing scoring (40% of total score) - deeper knee bend absorbs better
  let landingScore = 100;
  if (avgKneeAngle < 120) landingScore = 100;
  else if (avgKneeAngle < 140) landingScore = 80;
  else if (avgKneeAngle < 160) landingScore = 60;
  else {
    landingScore = 40;
    currentIssues.push('stiff_landing');
  }

  const finalScore = Math.round(heightScore * 0.6 + landingScore * 0.4);

  const details: JumpRepDetails = {
    jumpHeight,
    landingKneeFlexion: avgKneeAngle,
    powerScore: heightScore,
    landingScore,
  };

  return {
    score: finalScore,
    issues: [...new Set(currentIssues)],
    details,
  };
}

export function createJumpState(): JumpState {
  return {
    isCalibrated: false,
    groundLevel: null,
    lastAnkleY: null,
    consecutiveAirborneFrames: 0,
    consecutiveGroundedFrames: 0,
    peakHeight: 0,
    jumpStartTime: null,
    initializationStartTime: null,
    isInitializing: true,
    repsCompleted: 0,
    validJumpDetected: false,
  };
}

export function resetJumpState(jumpState: JumpState): void {
  jumpState.isCalibrated = false;
  jumpState.groundLevel = null;
  jumpState.lastAnkleY = null;
  jumpState.consecutiveAirborneFrames = 0;
  jumpState.consecutiveGroundedFrames = 0;
  jumpState.peakHeight = 0;
  jumpState.jumpStartTime = null;
  // Don't reset the initialization timer - let it persist across sets
  jumpState.repsCompleted = 0;
  jumpState.validJumpDetected = false;
}

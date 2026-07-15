import { calculateAngle } from './poseMath';
import type { EngineKeypoint, PoseData, ProcessorResult, RepState } from './types';

/**
 * Pull-up rep processor. Ported from imperfectcoach (thresholds unchanged).
 *
 * State machine: DOWN -> (pulled up, chin over wrists) -> UP -> (arms
 * extended) -> DOWN + rep counted. First two reps are a "learning phase"
 * with positive-only feedback.
 */

export interface PullupState {
  repsCompleted: number;
  isFirstRep: boolean;
  lastRepScore?: number;
}

export interface PullupProcessorParams {
  keypoints: EngineKeypoint[];
  repState: RepState;
  internalReps: number;
  lastRepIssues: string[];
  pullupState?: PullupState;
}

export type PullupProcessorResult = ProcessorResult & { pullupState?: PullupState };

const score = (k: EngineKeypoint): number => k.score ?? 0;

export const processPullups = ({
  keypoints,
  repState,
  internalReps,
  lastRepIssues,
  pullupState,
}: PullupProcessorParams): PullupProcessorResult | null => {
  const find = (name: string) => keypoints.find((k) => k.name === name);

  const nose = find('nose');
  const leftWrist = find('left_wrist');
  const rightWrist = find('right_wrist');
  const leftShoulder = find('left_shoulder');
  const rightShoulder = find('right_shoulder');
  const leftElbow = find('left_elbow');
  const rightElbow = find('right_elbow');
  const leftHip = find('left_hip');
  const rightHip = find('right_hip');
  const leftKnee = find('left_knee');
  const rightKnee = find('right_knee');
  const leftAnkle = find('left_ankle');
  const rightAnkle = find('right_ankle');

  if (
    !nose ||
    !leftWrist ||
    !rightWrist ||
    !leftShoulder ||
    !rightShoulder ||
    !leftElbow ||
    !rightElbow ||
    !leftHip ||
    !rightHip ||
    !leftKnee ||
    !rightKnee ||
    !leftAnkle ||
    !rightAnkle
  ) {
    return null;
  }

  const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgWristY = (leftWrist.y + rightWrist.y) / 2;

  const isHanging = avgWristY < avgShoulderY;
  if (!isHanging) {
    // Not in a pull-up position; let pre-workout feedback take over.
    return null;
  }

  // Provide specific feedback about which body parts aren't visible
  const lowConfidencePoints: string[] = [];
  if (score(nose) < 0.5) lowConfidencePoints.push('head');
  if (score(leftWrist) < 0.5 || score(rightWrist) < 0.5) lowConfidencePoints.push('hands');
  if (score(leftElbow) < 0.5 || score(rightElbow) < 0.5) lowConfidencePoints.push('elbows');
  if (score(leftShoulder) < 0.5 || score(rightShoulder) < 0.5)
    lowConfidencePoints.push('shoulders');
  if (score(leftHip) < 0.5 || score(rightHip) < 0.5) lowConfidencePoints.push('hips');
  if (score(leftKnee) < 0.5 || score(rightKnee) < 0.5) lowConfidencePoints.push('knees');
  if (score(leftAnkle) < 0.5 || score(rightAnkle) < 0.5) lowConfidencePoints.push('feet');

  if (lowConfidencePoints.length > 0) {
    const feedback =
      lowConfidencePoints.length > 2
        ? 'Step back - need to see full body'
        : `Can't see your ${lowConfidencePoints.join(' & ')}`;

    return {
      feedback,
      isRepCompleted: false,
      poseData: { keypoints },
    };
  }

  const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const leftShoulderAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
  const rightShoulderAngle = calculateAngle(rightHip, rightShoulder, rightElbow);
  const leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
  const rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const poseData: PoseData = {
    keypoints,
    leftElbowAngle,
    rightElbowAngle,
    leftShoulderAngle,
    rightShoulderAngle,
    leftHipAngle,
    rightHipAngle,
    leftKneeAngle,
    rightKneeAngle,
  };

  const baseResult = { isRepCompleted: false, poseData, pullupState };

  const currentIssues: string[] = [];
  let feedback: string | undefined;
  let formCheckSpeak: { issue: string; phrase: string } | undefined;

  // Defer form feedback until rep 3+ (learning phase is positive only)
  const isLearningPhase = !pullupState || pullupState.repsCompleted < 2;

  const angleDifference = Math.abs(leftElbowAngle - rightElbowAngle);
  if (angleDifference > 30) {
    currentIssues.push('asymmetry');
    if (!isLearningPhase) {
      feedback = 'Pull evenly with both arms!';
      formCheckSpeak = { issue: 'asymmetry', phrase: 'Pull evenly' };
    }
  }

  const chinAboveWrists = nose.y < avgWristY;
  const armsFullyExtended = leftElbowAngle > 150 && rightElbowAngle > 150;
  const isPulledUp =
    leftShoulderAngle < 85 &&
    rightShoulderAngle < 85 &&
    leftElbowAngle < 130 &&
    rightElbowAngle < 130;
  const aiFeedbackPayloadBase = {
    reps: internalReps,
    leftElbowAngle,
    rightElbowAngle,
    repState,
    formIssues: lastRepIssues,
    leftShoulderAngle,
    rightShoulderAngle,
    leftHipAngle,
    rightHipAngle,
    leftKneeAngle,
    rightKneeAngle,
  };

  if (repState === 'DOWN' && isPulledUp) {
    if (!chinAboveWrists) {
      // Partial rep: pulling up but chin is not over wrists.
      if (!isLearningPhase) {
        currentIssues.push('partial_top_rom');
        return {
          ...baseResult,
          feedback: 'Get your chin over the bar!',
          formCheckSpeak: { issue: 'partial_top_rom', phrase: 'Higher' },
        };
      }
      // During learning phase, accept the pull as is.
      return {
        ...baseResult,
        newRepState: 'UP',
        aiFeedbackPayload: aiFeedbackPayloadBase,
        feedback: 'Good effort! Keep pulling!',
        formCheckSpeak: undefined,
      };
    }
    // Full rep: chin over wrists. Rep is counted on the way down.
    return {
      ...baseResult,
      newRepState: 'UP',
      aiFeedbackPayload: aiFeedbackPayloadBase,
      feedback: isLearningPhase ? undefined : feedback,
      formCheckSpeak: isLearningPhase ? undefined : formCheckSpeak,
    };
  }

  if (repState === 'UP' && armsFullyExtended) {
    // Count the rep once arms extend beyond 150°; 155°+ is "perfect" extension.
    if (leftElbowAngle < 155 || rightElbowAngle < 155) {
      currentIssues.push('partial_bottom_rom');
      if (!isLearningPhase) {
        feedback = 'Full extension at the bottom!';
        formCheckSpeak = { issue: 'partial_bottom_rom', phrase: 'Full extension' };
      }
    }

    let currentRepScore = 100;
    if (currentIssues.includes('asymmetry')) currentRepScore -= 30;
    if (currentIssues.includes('partial_bottom_rom')) currentRepScore -= 25;

    if (pullupState) {
      pullupState.repsCompleted++;
      pullupState.lastRepScore = Math.max(0, currentRepScore);
    }

    const isFirstRep = !pullupState || pullupState.repsCompleted === 1;
    const repCompletionData = {
      score: Math.max(0, currentRepScore),
      issues: [...new Set(currentIssues)],
    };

    const repCompletionFeedback = isFirstRep
      ? "Great first pull-up! You're building strength!"
      : isLearningPhase
        ? 'Excellent! Nice effort!'
        : feedback;

    return {
      ...baseResult,
      newRepState: 'DOWN',
      isRepCompleted: true,
      repCompletionData,
      aiFeedbackPayload: {
        ...aiFeedbackPayloadBase,
        reps: internalReps + 1,
        formIssues: repCompletionData.issues,
      },
      feedback: repCompletionFeedback,
      formCheckSpeak: isFirstRep ? undefined : formCheckSpeak,
    };
  }

  return { ...baseResult, feedback, formCheckSpeak };
};

export function createPullupState(): PullupState {
  return {
    repsCompleted: 0,
    isFirstRep: true,
    lastRepScore: undefined,
  };
}

export function resetPullupState(pullupState: PullupState): void {
  pullupState.repsCompleted = 0;
  pullupState.isFirstRep = true;
  pullupState.lastRepScore = undefined;
}

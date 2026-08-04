/**
 * Exercise engine types.
 *
 * Ported from imperfectcoach. The engine is pure TS with no framework or
 * TensorFlow imports so it can run in the pose worker and be unit tested.
 * EngineKeypoint is structurally compatible with MoveNet keypoints from
 * @tensorflow-models/pose-detection.
 */

export interface EngineKeypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export type EngineExercise = 'pullups' | 'jumps';

export type RepState = 'DOWN' | 'UP' | 'GROUNDED' | 'AIRBORNE';

export interface PullupRepDetails {
  peakElbowFlexion?: number;
  bottomElbowExtension?: number;
  asymmetry?: number;
}

export interface JumpRepDetails {
  jumpHeight: number; // In pixels, relative to calibrated ground level
  landingKneeFlexion: number; // Average knee angle on landing
  powerScore: number; // Jump height/power score (0-100)
  landingScore: number; // Landing quality score (0-100)
}

export interface PoseAngles {
  leftElbowAngle?: number;
  rightElbowAngle?: number;
  leftKneeAngle?: number;
  rightKneeAngle?: number;
  leftHipAngle?: number;
  rightHipAngle?: number;
  leftShoulderAngle?: number;
  rightShoulderAngle?: number;
  /** Elbow angle from the visible arm that triggered a form cue. */
  observedElbowAngle?: number;
}

export interface PoseData extends PoseAngles {
  keypoints: EngineKeypoint[];
}

export interface RepCompletionData {
  score: number;
  issues: string[];
  details?: PullupRepDetails | JumpRepDetails;
}

export interface ProcessorResult {
  newRepState?: RepState;
  poseData: PoseData;
  feedback?: string;
  formCheckSpeak?: { issue: string; phrase: string };
  isRepCompleted: boolean;
  repCompletionData?: RepCompletionData;
  aiFeedbackPayload?: Record<string, unknown>;
}

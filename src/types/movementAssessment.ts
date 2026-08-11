import type { ExerciseMode } from '@/utils/biomechanics';

export type MovementAssessmentVersion = '1.0';
export type MovementAssessmentStatus = 'valid' | 'inconclusive';

export type MovementAssessmentInconclusiveReason =
  | 'invalid_protocol'
  | 'insufficient_reps'
  | 'insufficient_trace'
  | 'low_visibility'
  | 'unstable_tracking'
  | 'high_noise';

/**
 * The first assessment protocol is deliberately local and protocol-specific.
 * It describes capture requirements, not a universal fitness norm.
 */
export interface MovementAssessmentProtocol {
  id: string;
  version: MovementAssessmentVersion;
  mode: ExerciseMode;
  /** Exact rep count for this fixed baseline protocol. */
  targetReps: number;
  minTraceFrames: number;
  minPoseConfidence: number;
  minObservedFrameRatio: number;
  minBilateralFrameRatio: number;
  minStableFrameRatio: number;
}

export interface MovementAssessmentMeasurements {
  /** Normalized observed range signal, 0–1. */
  range: number;
  /** Normalized control signal from stable, low-warning frames, 0–1. */
  control: number;
  /** Normalized left/right similarity where the engine exposes it, 0–1. */
  symmetry: number | null;
  /** Within-session trace stability; not a cross-session repeatability claim, 0–1. */
  traceStability: number;
}

export interface MovementAssessmentQuality {
  /** Average confidence of relevant pose keypoints, 0–1. */
  poseConfidence: number;
  /** Fraction of trace frames with enough relevant keypoints visible. */
  observedFrameRatio: number;
  /** Fraction of trace frames with both sides visible when the protocol needs them. */
  bilateralFrameRatio: number;
  /** Fraction of assessable trace frames marked stable by the existing engine. */
  stableFrameRatio: number;
  traceFrames: number;
  repCount: number;
}

/**
 * Local-only M0 result. This is not a score, diagnosis, or population rank.
 */
export interface MovementAssessment {
  version: MovementAssessmentVersion;
  protocolId: string;
  protocolVersion: MovementAssessmentVersion;
  mode: ExerciseMode;
  capturedAt: number;
  status: MovementAssessmentStatus;
  confidence: number;
  quality: MovementAssessmentQuality;
  measurements: MovementAssessmentMeasurements | null;
  inconclusiveReason?: MovementAssessmentInconclusiveReason;
}

export interface MovementAssessmentComparison {
  comparable: boolean;
  repeatable: boolean;
  similarity: number | null;
  rangeDelta: number | null;
  traceStabilityDelta: number | null;
  reason?: 'invalid_assessment' | 'different_protocol';
}

export const CURL_BASELINE_PROTOCOL: MovementAssessmentProtocol = {
  id: 'curls-baseline',
  version: '1.0',
  mode: 'curls',
  targetReps: 5,
  minTraceFrames: 10,
  minPoseConfidence: 0.55,
  minObservedFrameRatio: 0.6,
  minBilateralFrameRatio: 0.5,
  minStableFrameRatio: 0.5,
};

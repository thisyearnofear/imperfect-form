import type { SessionSummary } from '@/services/sessionLogger';
import type {
  MovementAssessment,
  MovementAssessmentComparison,
  MovementAssessmentMeasurements,
  MovementAssessmentProtocol,
  MovementAssessmentQuality,
} from '@/types/movementAssessment';
import { CURL_BASELINE_PROTOCOL } from '@/types/movementAssessment';

const CURL_REQUIRED_KEYPOINTS = [
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
] as const;

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function framePoseConfidence(summary: SessionSummary): number {
  const frameConfidences = summary.trace.map((frame) => {
    const scores = frame.keypoints
      .map((keypoint) => keypoint.score)
      .filter((score) => Number.isFinite(score));
    return scores.length > 0 ? average(scores) : 0;
  });

  return clamp(average(frameConfidences));
}

function visibleKeypoints(frame: SessionSummary['trace'][number]): string[] {
  return frame.keypoints
    .filter((keypoint) => keypoint.score >= 0.4)
    .map((keypoint) => keypoint.name);
}

function isObservedFrame(
  frame: SessionSummary['trace'][number],
  protocol: MovementAssessmentProtocol
): boolean {
  const visible = visibleKeypoints(frame);
  if (protocol.mode === 'curls') {
    return CURL_REQUIRED_KEYPOINTS.filter((name) => visible.includes(name)).length >= 4;
  }
  return visible.length > 0;
}

function isBilateralFrame(
  frame: SessionSummary['trace'][number],
  protocol: MovementAssessmentProtocol
): boolean {
  if (protocol.mode !== 'curls') return true;
  const visible = visibleKeypoints(frame);
  const leftVisible = ['left_shoulder', 'left_elbow', 'left_wrist'].every((name) =>
    visible.includes(name)
  );
  const rightVisible = ['right_shoulder', 'right_elbow', 'right_wrist'].every((name) =>
    visible.includes(name)
  );
  return leftVisible && rightVisible;
}

function observedFrameRatio(summary: SessionSummary, protocol: MovementAssessmentProtocol): number {
  if (summary.trace.length === 0) return 0;

  const observedFrames = summary.trace.filter((frame) => isObservedFrame(frame, protocol));

  return observedFrames.length / summary.trace.length;
}

function bilateralFrameRatio(
  summary: SessionSummary,
  protocol: MovementAssessmentProtocol
): number {
  if (summary.trace.length === 0) return 0;
  if (protocol.mode !== 'curls') return 1;

  const bilateralFrames = summary.trace.filter((frame) => isBilateralFrame(frame, protocol));

  return bilateralFrames.length / summary.trace.length;
}

function stableFrameRatio(summary: SessionSummary, protocol: MovementAssessmentProtocol): number {
  if (summary.trace.length === 0) return 0;
  const assessableFrames = summary.trace.filter((frame) => isObservedFrame(frame, protocol));
  if (assessableFrames.length === 0) return 0;
  return (
    assessableFrames.filter((frame) => frame.metrics.isStable).length / assessableFrames.length
  );
}

function buildQuality(
  summary: SessionSummary,
  protocol: MovementAssessmentProtocol
): MovementAssessmentQuality {
  return {
    poseConfidence: framePoseConfidence(summary),
    observedFrameRatio: observedFrameRatio(summary, protocol),
    bilateralFrameRatio: bilateralFrameRatio(summary, protocol),
    stableFrameRatio: stableFrameRatio(summary, protocol),
    traceFrames: summary.trace.length,
    repCount: summary.repCount,
  };
}

function buildMeasurements(
  summary: SessionSummary,
  protocol: MovementAssessmentProtocol,
  quality: MovementAssessmentQuality
): MovementAssessmentMeasurements {
  const assessableFrames = summary.trace.filter((frame) => isObservedFrame(frame, protocol));
  const finiteDepths = assessableFrames
    .map((frame) => frame.metrics.depth)
    .filter((depth) => Number.isFinite(depth))
    .map((depth) => clamp(depth));
  const stableDepths = assessableFrames
    .filter((frame) => frame.metrics.isStable && Number.isFinite(frame.metrics.depth))
    .map((frame) => clamp(frame.metrics.depth));
  const ranges = stableDepths.length > 0 ? stableDepths : finiteDepths;
  const minDepth = ranges.length > 0 ? Math.min(...ranges) : 0;
  const maxDepth = ranges.length > 0 ? Math.max(...ranges) : 0;
  const range = clamp(maxDepth - minDepth);
  const mean = average(ranges);
  const traceStability =
    ranges.length > 1
      ? clamp(1 - Math.sqrt(average(ranges.map((value) => (value - mean) ** 2))) / 0.5)
      : 0;
  const warningsPerFrame = assessableFrames.map((frame) => frame.metrics.warnings.length);
  const control = clamp(
    quality.stableFrameRatio * 0.7 + (1 - clamp(average(warningsPerFrame) / 2)) * 0.3
  );
  const symmetryValues = assessableFrames
    .filter((frame) => isBilateralFrame(frame, protocol))
    .map((frame) => frame.metrics.symmetry)
    .filter((value) => Number.isFinite(value));

  return {
    range,
    control,
    symmetry: quality.bilateralFrameRatio >= 0.5 ? clamp(average(symmetryValues)) : null,
    traceStability,
  };
}

function inconclusiveReason(
  summary: SessionSummary,
  protocol: MovementAssessmentProtocol,
  quality: MovementAssessmentQuality
): MovementAssessment['inconclusiveReason'] {
  if (summary.mode !== protocol.mode) return 'invalid_protocol';
  if (summary.repCount !== protocol.targetReps) return 'insufficient_reps';
  if (quality.traceFrames < protocol.minTraceFrames) return 'insufficient_trace';
  if (quality.poseConfidence < protocol.minPoseConfidence) return 'low_visibility';
  if (quality.observedFrameRatio < protocol.minObservedFrameRatio) return 'low_visibility';
  if (quality.bilateralFrameRatio < protocol.minBilateralFrameRatio) return 'low_visibility';
  if (quality.stableFrameRatio < protocol.minStableFrameRatio) return 'unstable_tracking';
  if (summary.trace.some((frame) => !Number.isFinite(frame.metrics.depth))) return 'high_noise';
  return undefined;
}

/**
 * Evaluate a fixed protocol from existing session telemetry. No new detector,
 * population data, or medical interpretation is introduced here.
 */
export function evaluateMovementAssessment(
  summary: SessionSummary,
  protocol: MovementAssessmentProtocol = CURL_BASELINE_PROTOCOL,
  capturedAt = summary.endTime
): MovementAssessment {
  const quality = buildQuality(summary, protocol);
  const reason = inconclusiveReason(summary, protocol, quality);
  const valid = !reason;

  return {
    version: protocol.version,
    protocolId: protocol.id,
    protocolVersion: protocol.version,
    mode: protocol.mode,
    capturedAt,
    status: valid ? 'valid' : 'inconclusive',
    confidence: clamp(
      quality.poseConfidence * 0.5 +
        quality.observedFrameRatio * 0.2 +
        quality.bilateralFrameRatio * 0.15 +
        quality.stableFrameRatio * 0.15
    ),
    quality,
    measurements: valid ? buildMeasurements(summary, protocol, quality) : null,
    ...(reason ? { inconclusiveReason: reason } : {}),
  };
}

/** Compare only valid assessments generated by the same versioned protocol. */
export function compareMovementAssessments(
  previous: MovementAssessment,
  current: MovementAssessment,
  repeatabilityThreshold = 0.7
): MovementAssessmentComparison {
  if (
    previous.protocolId !== current.protocolId ||
    previous.protocolVersion !== current.protocolVersion
  ) {
    return {
      comparable: false,
      repeatable: false,
      similarity: null,
      rangeDelta: null,
      traceStabilityDelta: null,
      reason: 'different_protocol',
    };
  }

  if (
    previous.status !== 'valid' ||
    current.status !== 'valid' ||
    !previous.measurements ||
    !current.measurements
  ) {
    return {
      comparable: false,
      repeatable: false,
      similarity: null,
      rangeDelta: null,
      traceStabilityDelta: null,
      reason: 'invalid_assessment',
    };
  }

  const rangeDelta = current.measurements.range - previous.measurements.range;
  const traceStabilityDelta =
    current.measurements.traceStability - previous.measurements.traceStability;
  const repeatabilityDimensions = [
    Math.abs(current.measurements.control - previous.measurements.control),
    Math.abs(current.measurements.traceStability - previous.measurements.traceStability),
    ...(current.measurements.symmetry !== null && previous.measurements.symmetry !== null
      ? [Math.abs(current.measurements.symmetry - previous.measurements.symmetry)]
      : []),
  ];
  const repeatabilityDistance = Math.sqrt(
    repeatabilityDimensions.reduce((sum, delta) => sum + delta ** 2, 0)
  );
  const similarity = clamp(
    1 - repeatabilityDistance / Math.sqrt(Math.max(1, repeatabilityDimensions.length))
  );

  return {
    comparable: true,
    repeatable: similarity >= repeatabilityThreshold,
    similarity,
    rangeDelta,
    traceStabilityDelta,
  };
}

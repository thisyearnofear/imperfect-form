import type { BiomechanicalState, CurlPoseData, CurlTelemetry } from '@/types/mediapipe';

const EXTENDED_DEG = 160;
const TARGET_MIN_DEG = 50;
const TARGET_MAX_DEG = 70;
const ELBOW_DRIFT_TARGET_DEG = 30;

const finite = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Convert the pose engine's raw curl angles into the small, user-facing
 * instrument model. This is deliberately not a second detector: it only
 * formats measurements already produced by the curl processor.
 */
export function deriveCurlTelemetry(
  poseData?: CurlPoseData,
  metrics?: BiomechanicalState | null
): CurlTelemetry | null {
  if (!poseData) return null;

  const angles = [poseData.leftElbowAngle, poseData.rightElbowAngle].filter(finite);
  if (angles.length === 0 && !finite(poseData.observedElbowAngle)) return null;

  // The processor marks the most actively curled arm as observed. Prefer that
  // pair so alternating curls never display an average of two different arms.
  const elbowAngle = finite(poseData.activeElbowAngle)
    ? poseData.activeElbowAngle
    : finite(poseData.observedElbowAngle)
      ? poseData.observedElbowAngle
      : Math.min(...angles);

  const drifts = [poseData.leftShoulderAngle, poseData.rightShoulderAngle].filter(finite);
  const elbowDriftDeg = finite(poseData.activeShoulderAngle)
    ? poseData.activeShoulderAngle
    : finite(poseData.observedShoulderAngle)
      ? poseData.observedShoulderAngle
      : drifts.length > 0
        ? Math.max(...drifts)
        : null;

  const phase: CurlTelemetry['phase'] =
    elbowAngle >= EXTENDED_DEG
      ? 'extended'
      : elbowAngle <= TARGET_MAX_DEG
        ? 'curl-range'
        : 'mid-curl';

  return {
    elbowAngle,
    elbowDriftDeg,
    targetMinDeg: TARGET_MIN_DEG,
    targetMaxDeg: TARGET_MAX_DEG,
    elbowDriftTargetDeg: ELBOW_DRIFT_TARGET_DEG,
    phase,
    rangeProgress: Math.max(
      0,
      Math.min(1, (EXTENDED_DEG - elbowAngle) / (EXTENDED_DEG - TARGET_MIN_DEG))
    ),
    depth: metrics?.depth ?? null,
  };
}

/**
 * Exercise engine - pull-up and jump rep counting, form scoring, and pose
 * readiness. Ported from imperfectcoach; pure TS, worker-safe, unit tested.
 */

export * from './types';
export { calculateAngle, convertHeight, formatHeight, type HeightUnit } from './poseMath';
export {
  processPullups,
  createPullupState,
  resetPullupState,
  type PullupState,
  type PullupProcessorParams,
  type PullupProcessorResult,
} from './pullupProcessor';
export {
  processJumps,
  createJumpState,
  resetJumpState,
  type JumpState,
  type JumpProcessorParams,
  type JumpProcessorResult,
} from './jumpProcessor';
export {
  processCurls,
  createCurlState,
  resetCurlState,
  type CurlState,
  type CurlProcessorParams,
  type CurlProcessorResult,
} from './curlProcessor';
export {
  PoseReadinessSystem,
  type ReadinessLevel,
  type ReadinessScore,
  type ReadinessIssue,
  type ReadinessConfig,
} from './readiness';

/**
 * Stub for @mediapipe/pose.
 *
 * @tensorflow-models/pose-detection's ESM bundle statically imports { Pose }
 * for its BlazePose-MediaPipe runtime, which this app never uses (MoveNet
 * only). The real package is a legacy non-module script with no exports, so
 * bundlers hard-error on the import. This stub satisfies the import without
 * shipping the ~3MB MediaPipe runtime.
 */
export const Pose = undefined;
export default {};

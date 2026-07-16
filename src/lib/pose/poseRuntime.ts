/**
 * PoseRuntime contract — session-scoped camera + model ownership.
 *
 * Exercise mode is a strategy (hot-swapped), not a remount trigger.
 * See docs/ARCHITECTURE.md → PoseRuntime.
 */

export type PoseRuntimePath = 'worker' | 'main';

export type PoseRuntimeStatus = {
  path: PoseRuntimePath;
  mode: string;
  /** Wall time when this session's pipeline last started */
  startedAt: number;
};

/** Window key for e2e / debug inspection (never a product UI dependency). */
export const POSE_RUNTIME_WINDOW_KEY = '__IMF_POSE_RUNTIME__';

/** Opt-in: force OffscreenCanvas worker path even in development (smoke tests). */
export const POSE_RUNTIME_FORCE_WORKER_KEY = '__IMF_FORCE_POSE_WORKER__';

export type PoseRuntimeWindow = Window & {
  [POSE_RUNTIME_WINDOW_KEY]?: PoseRuntimeStatus;
  [POSE_RUNTIME_FORCE_WORKER_KEY]?: boolean;
};

export function publishPoseRuntimeStatus(status: PoseRuntimeStatus): void {
  if (typeof window === 'undefined') return;
  (window as PoseRuntimeWindow)[POSE_RUNTIME_WINDOW_KEY] = status;
}

export function clearPoseRuntimeStatus(): void {
  if (typeof window === 'undefined') return;
  delete (window as PoseRuntimeWindow)[POSE_RUNTIME_WINDOW_KEY];
}

export type ShouldUsePoseWorkerArgs = {
  isMobileDevice: boolean;
  supportsOffscreenCanvas: boolean;
  canTransferControl: boolean;
  /** process.env.NODE_ENV */
  nodeEnv: string | undefined;
  /** window.__IMF_FORCE_POSE_WORKER__ (e2e / manual) */
  forceWorker?: boolean;
};

/**
 * Decide worker vs main-thread detection for this session start.
 *
 * - Mobile / no OffscreenCanvas → main thread (always)
 * - forceWorker → worker (smoke tests against the prod path)
 * - development → main thread (avoids Strict Mode OffscreenCanvas races)
 * - production desktop → worker
 */
export function shouldUsePoseWorker({
  isMobileDevice,
  supportsOffscreenCanvas,
  canTransferControl,
  nodeEnv,
  forceWorker = false,
}: ShouldUsePoseWorkerArgs): boolean {
  if (isMobileDevice) return false;
  if (!supportsOffscreenCanvas || !canTransferControl) return false;
  if (forceWorker) return true;
  return nodeEnv === 'production';
}

export function readForcePoseWorkerFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as PoseRuntimeWindow)[POSE_RUNTIME_FORCE_WORKER_KEY] === true;
}

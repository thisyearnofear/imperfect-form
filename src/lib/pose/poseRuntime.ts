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
  /** True when the session adopted a prewarmed detector instead of building cold. */
  detectorWarm?: boolean;
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
  /**
   * Runtime family of the resolved session tracker ('tfjs' | 'tasks-vision').
   * tasks-vision can never run inside this app's module worker: its WASM
   * loader calls importScripts, which module workers don't support, and the
   * failure is a silent hang — the observed cause of the 45s watchdog → cold
   * main-thread fallback on real devices. Routing it straight to the main
   * thread skips the impossible init entirely.
   */
  trackerRuntime?: 'tfjs' | 'tasks-vision';
};

/**
 * Decide worker vs main-thread detection for this session start.
 *
 * - tasks-vision tracker → main thread (always; importScripts is
 *   unavailable in module workers — see trackerRuntime above)
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
  trackerRuntime,
}: ShouldUsePoseWorkerArgs): boolean {
  if (trackerRuntime === 'tasks-vision') return false;
  if (isMobileDevice) return false;
  if (!supportsOffscreenCanvas || !canTransferControl) return false;
  if (forceWorker) return true;
  return nodeEnv === 'production';
}

export function readForcePoseWorkerFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as PoseRuntimeWindow)[POSE_RUNTIME_FORCE_WORKER_KEY] === true;
}

/**
 * Ready-watchdog budget for the worker pipeline, scaled by the resolved
 * session tracker. Thunder and the tasks-vision landmarker boot
 * materially slower than lightning (bigger model + backend compile); a
 * lightning-tight watchdog would convert a legitimate slow boot into an
 * unnecessary main-thread fallback.
 */
export function workerReadyTimeoutMsForTracker(tracker: string): number {
  return tracker === 'movenet-lightning' ? 20_000 : 45_000;
}

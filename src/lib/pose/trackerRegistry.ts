'use client';

/**
 * Pose tracker registry.
 *
 * One resolution path for "given a PoseDetectorConfig, build a detector". The
 * detector used to be constructed in three places with hard-coded and
 * divergent values, which made the edge perf matrix label runs with configs it
 * never applied. Everything now goes through here.
 */

import {
  createDetector,
  SupportedModels,
  type PoseDetector as TfPoseDetector,
} from '@tensorflow-models/pose-detection';
import type {
  BlazePoseTfjsModelConfig,
  BlazePoseModelType,
  MoveNetModelConfig,
} from '@tensorflow-models/pose-detection';
import type { PoseBackendId, PoseDetectorConfig, PoseTrackerId } from '@/types/mediapipe';

/**
 * Live-session defaults.
 *
 * Lightning over webgl keeps the coaching loop responsive; the 17-keypoint
 * output is sufficient for the current single-person exercise engine. Smoothing
 * and the legacy bounding-box tracker stay off because MoveNet's smoothed
 * tracker can dereference a missing box on transient frames (`null.yMin`).
 */
export const DEFAULT_POSE_CONFIG: PoseDetectorConfig = {
  tracker: 'movenet-lightning',
  backend: 'webgl',
  inputSize: 640,
  enableSmoothing: false,
  minPoseScore: 0.25,
  multiPoseMaxDimension: 512,
  enableTracking: false,
};

/** Mobile uses a lower score floor and no multi-pose dimension cap. */
export function getDefaultPoseConfig(isMobile: boolean): PoseDetectorConfig {
  return {
    ...DEFAULT_POSE_CONFIG,
    minPoseScore: isMobile ? 0.2 : DEFAULT_POSE_CONFIG.minPoseScore,
    multiPoseMaxDimension: isMobile ? undefined : DEFAULT_POSE_CONFIG.multiPoseMaxDimension,
  };
}

export interface TrackerSpec {
  id: PoseTrackerId;
  label: string;
  /** Human note on cost/accuracy, kept honest — no unmeasured claims. */
  note: string;
  model: SupportedModels;
  /** Model type string passed to the library; typed per model family. */
  modelType: string;
  /** Narrowed modelType for BlazePose, which requires its own union. */
  blazeposeModelType?: BlazePoseModelType;
  /**
   * BlazePose reports 33 landmarks including hands and face; the exercise
   * engine consumes the MoveNet-shaped 17. Callers must not assume keypoint
   * names are identical across trackers.
   */
  keypointShape: 'movenet-17' | 'blazepose-33';
  /** Backends this tracker cannot run on. */
  unsupportedBackends?: PoseBackendId[];
}

/**
 * BlazePose ships in the same @tensorflow-models/pose-detection package as
 * MoveNet, so registering it costs no extra bundle weight in the default path.
 */
export const TRACKERS: Record<PoseTrackerId, TrackerSpec> = {
  'movenet-lightning': {
    id: 'movenet-lightning',
    label: 'MoveNet Lightning',
    note: 'Shipped live default. Fastest MoveNet variant.',
    model: SupportedModels.MoveNet,
    modelType: 'SinglePose.Lightning',
    keypointShape: 'movenet-17',
  },
  'movenet-thunder': {
    id: 'movenet-thunder',
    label: 'MoveNet Thunder',
    note: 'Heavier MoveNet variant, kept for an explicit accuracy benchmark.',
    model: SupportedModels.MoveNet,
    modelType: 'SinglePose.Thunder',
    keypointShape: 'movenet-17',
  },
  blazepose: {
    id: 'blazepose',
    label: 'BlazePose (tfjs)',
    // NOTE: the tfjs runtime, NOT the MediaPipe runtime. The MediaPipe variant
    // is not available here because @mediapipe/pose is stubbed out; see
    // src/stubs/mediapipe-pose.js.
    note: '33 landmarks incl. hands and face. Slower and heavier than MoveNet.',
    model: SupportedModels.BlazePose,
    modelType: 'full',
    blazeposeModelType: 'full',
    keypointShape: 'blazepose-33',
    // The MediaPipe wasm backend is what BlazePose normally uses; the tfjs
    // path runs on webgl. Kept honest rather than assumed.
    unsupportedBackends: ['wasm'],
  },
};

export function getTracker(id: PoseTrackerId): TrackerSpec {
  const spec = TRACKERS[id];
  if (!spec) {
    throw new Error(`Unknown pose tracker: ${id}`);
  }
  return spec;
}

/** Whether this tracker/backend pair can actually be constructed on this device. */
export function isConfigSupported(
  config: PoseDetectorConfig,
  device: { webglSupport: boolean; webGPUSupport: boolean }
): boolean {
  const spec = getTracker(config.tracker);

  if (spec.unsupportedBackends?.includes(config.backend)) return false;
  if (config.backend === 'webgpu' && !device.webGPUSupport) return false;
  if (config.backend === 'webgl' && !device.webglSupport) return false;
  // wasm and cpu are always constructible; tf falls back internally.
  return true;
}

/**
 * Build a detector from a config. The single place a detector is created.
 *
 * The library types the two families differently: MoveNet takes no `runtime`,
 * while BlazePose requires `runtime: 'tfjs'` (or 'mediapipe'). The tfjs runtime
 * is used deliberately — @mediapipe/pose is stubbed out in this app.
 */
export async function createPoseDetector(config: PoseDetectorConfig): Promise<TfPoseDetector> {
  const spec = getTracker(config.tracker);

  if (spec.model === SupportedModels.BlazePose) {
    // BlazePose's config genuinely has no minPoseScore / multiPoseMaxDimension /
    // enableTracking — those are MoveNet-only knobs. The registry records which
    // options each family accepts so an unsupported option is dropped here
    // rather than cast away at the call site.
    const blazeposeConfig: BlazePoseTfjsModelConfig = {
      runtime: 'tfjs',
      modelType: spec.blazeposeModelType ?? 'full',
      enableSmoothing: config.enableSmoothing,
    };
    return createDetector(spec.model, blazeposeConfig);
  }

  const movenetConfig: MoveNetModelConfig = {
    modelType: spec.modelType,
    enableSmoothing: config.enableSmoothing,
    minPoseScore: config.minPoseScore,
    multiPoseMaxDimension: config.multiPoseMaxDimension,
    enableTracking: config.enableTracking,
  };
  return createDetector(spec.model, movenetConfig);
}

/**
 * Which options of a config the given tracker actually consumes.
 *
 * Reported so a benchmark comparing MoveNet against BlazePose does not imply the
 * two were configured identically — BlazePose ignores minPoseScore entirely.
 */
export function supportedOptions(tracker: PoseTrackerId): Array<keyof PoseDetectorConfig> {
  if (getTracker(tracker).model === SupportedModels.BlazePose) {
    return ['tracker', 'backend', 'inputSize', 'enableSmoothing'];
  }
  return ['tracker', 'backend', 'inputSize', 'enableSmoothing', 'minPoseScore', 'enableTracking'];
}

/** Normalize a partial/loose config into a complete one. */
export function resolvePoseConfig(
  partial: Partial<PoseDetectorConfig> | undefined,
  isMobile = false
): PoseDetectorConfig {
  const base = getDefaultPoseConfig(isMobile);
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    multiPoseMaxDimension:
      partial.multiPoseMaxDimension !== undefined
        ? partial.multiPoseMaxDimension
        : base.multiPoseMaxDimension,
  };
}

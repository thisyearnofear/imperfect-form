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
import type { PoseLandmarkerSession } from './poseLandmarkerAdapter';

/**
 * Either detector family the registry can build. tfjs trackers return the
 * library's `PoseDetector`; tasks-vision trackers return the adapter's
 * `PoseLandmarkerSession`. Both expose `estimatePoses(image)` and `dispose()`,
 * which is all the worker and the main-thread loop call.
 */
export type SessionPoseDetector = TfPoseDetector | PoseLandmarkerSession;

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

/**
 * Protocol reading sessions (the fixed-rep baselines selected by
 * `assessmentProtocolFor` — the session carries `readingTargetReps`) run the
 * tasks-vision PoseLandmarker. The promotion was for *reliability*, not a
 * benchmark win: MoveNet Thunder downloads its weights from tfhub.dev at
 * session start and that fetch was the observed hang on real devices, while
 * the landmarker's WASM + `.task` bundle are served from public/mediapipe —
 * same origin, no runtime CDN. It also happens to benchmark ahead
 * (74% vs 38% COCO-17 confidence, evidence/pose-landmarker-benchmark.md).
 *
 * Jitter on real camera streams is not yet verified — the bench used still
 * frames. The mitigations already in the pipeline: PoseSmoother's adaptive
 * smoothing runs before the engine, and the reach/curl processors gate on
 * per-keypoint visibility, which is exactly what the landmarker reports
 * honestly.
 *
 * The multi-pose dimension cap stays set even though the landmarker ignores
 * it — it documents intent and re-applies automatically if a reading ever
 * returns to a tfjs tracker.
 */
export const READING_POSE_CONFIG: PoseDetectorConfig = {
  ...DEFAULT_POSE_CONFIG,
  tracker: 'poselandmarker-full',
  multiPoseMaxDimension: 512,
};

/** Knobs that pick the per-session detector config. */
export interface PoseConfigOptions {
  /**
   * True for protocol reading sessions. Readings take the accuracy-first
   * config; every other session keeps the latency-first default.
   */
  forReading?: boolean;
  /**
   * Device tier from `getDeviceInfo().performanceLevel`. A 'low' device
   * downgrades a reading back to lightning — honest capacity beats an
   * aspirational config the hardware cannot sustain.
   */
  performanceLevel?: 'low' | 'medium' | 'high';
}

/**
 * Per-session detector defaults. Mobile uses a lower score floor; it also
 * drops the multi-pose dimension cap for ordinary sessions, but readings
 * keep it — see READING_POSE_CONFIG.
 */
export function getDefaultPoseConfig(
  isMobile: boolean,
  options: PoseConfigOptions = {}
): PoseDetectorConfig {
  const { forReading = false, performanceLevel } = options;
  const reading = forReading && performanceLevel !== 'low';
  const base = reading ? READING_POSE_CONFIG : DEFAULT_POSE_CONFIG;
  return {
    ...base,
    minPoseScore: isMobile ? 0.2 : base.minPoseScore,
    multiPoseMaxDimension: isMobile && !reading ? undefined : base.multiPoseMaxDimension,
  };
}

export interface TrackerSpec {
  id: PoseTrackerId;
  label: string;
  /** Human note on cost/accuracy, kept honest — no unmeasured claims. */
  note: string;
  /**
   * Which inference runtime builds this tracker. 'tfjs' trackers go through
   * @tensorflow-models/pose-detection; 'tasks-vision' trackers go through
   * @mediapipe/tasks-vision and the adapter in poseLandmarkerAdapter.ts.
   */
  runtime: 'tfjs' | 'tasks-vision';
  /** tfjs model family, or 'landmarker' for the tasks-vision runtime. */
  model: SupportedModels | 'landmarker';
  /** Model type string passed to the library; typed per model family. */
  modelType: string;
  /** Narrowed modelType for BlazePose, which requires its own union. */
  blazeposeModelType?: BlazePoseModelType;
  /**
   * tasks-vision trackers load a `.task` model bundle from this local path
   * (served from public/, never a CDN).
   */
  modelFile?: string;
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
    runtime: 'tfjs',
    model: SupportedModels.MoveNet,
    modelType: 'SinglePose.Lightning',
    keypointShape: 'movenet-17',
  },
  'movenet-thunder': {
    id: 'movenet-thunder',
    label: 'MoveNet Thunder',
    note: 'Heavier MoveNet variant, kept for an explicit accuracy benchmark.',
    runtime: 'tfjs',
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
    runtime: 'tfjs',
    model: SupportedModels.BlazePose,
    modelType: 'full',
    blazeposeModelType: 'full',
    keypointShape: 'blazepose-33',
    // The MediaPipe wasm backend is what BlazePose normally uses; the tfjs
    // path runs on webgl. Kept honest rather than assumed.
    unsupportedBackends: ['wasm'],
  },
  'poselandmarker-full': {
    id: 'poselandmarker-full',
    label: 'PoseLandmarker Full (tasks-vision)',
    // Separate runtime from the tfjs family: FilesetResolver loads the local
    // WASM fileset and PoseLandmarker loads this .task bundle — both served
    // from public/mediapipe, no CDN at runtime.
    note: 'MediaPipe runtime. 33 landmarks with real per-landmark visibility. Runs protocol reading sessions (local assets — promoted for reliability, see docs/POSE_STACK.md).',
    runtime: 'tasks-vision',
    model: 'landmarker',
    modelType: 'full',
    modelFile: '/mediapipe/models/pose_landmarker_full.task',
    keypointShape: 'blazepose-33',
    // tasks-vision ships GPU (WebGL) and CPU delegates only — there is no
    // WebGPU delegate to request.
    unsupportedBackends: ['webgpu'],
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
  // wasm and cpu are always constructible. For tasks-vision trackers 'wasm'
  // and 'cpu' both select the CPU delegate; tfjs trackers fall back internally.
  return true;
}

/**
 * Build a detector from a config. The single place a detector is created.
 *
 * The library types the two families differently: MoveNet takes no `runtime`,
 * while BlazePose requires `runtime: 'tfjs'` (or 'mediapipe'). The tfjs runtime
 * is used deliberately — @mediapipe/pose is stubbed out in this app.
 */
export async function createPoseDetector(config: PoseDetectorConfig): Promise<SessionPoseDetector> {
  const spec = getTracker(config.tracker);

  if (spec.runtime === 'tasks-vision') {
    // Lazy import: the tasks-vision bundle and its WASM/model fetches stay
    // out of the MoveNet path until a session actually requests this tracker.
    if (!spec.modelFile) {
      throw new Error(`Tracker ${spec.id} has no modelFile configured`);
    }
    const { createPoseLandmarker } = await import('./poseLandmarkerAdapter');
    return createPoseLandmarker(config, spec.modelFile);
  }

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
  // runtime === 'tfjs' guarantees a SupportedModels family here.
  return createDetector(spec.model as SupportedModels, movenetConfig);
}

/**
 * Which options of a config the given tracker actually consumes.
 *
 * Reported so a benchmark comparing MoveNet against BlazePose does not imply the
 * two were configured identically — BlazePose ignores minPoseScore entirely.
 */
export function supportedOptions(tracker: PoseTrackerId): Array<keyof PoseDetectorConfig> {
  const spec = getTracker(tracker);
  if (spec.runtime === 'tasks-vision') {
    // The landmarker honours exactly two config fields beyond its identity:
    // 'backend' selects the GPU/CPU delegate, and 'minPoseScore' maps onto
    // minPoseDetectionConfidence. It ignores inputSize (its graph resizes
    // internally), enableSmoothing, enableTracking and multiPoseMaxDimension.
    return ['tracker', 'backend', 'minPoseScore'];
  }
  if (spec.model === SupportedModels.BlazePose) {
    return ['tracker', 'backend', 'inputSize', 'enableSmoothing'];
  }
  return ['tracker', 'backend', 'inputSize', 'enableSmoothing', 'minPoseScore', 'enableTracking'];
}

/** Normalize a partial/loose config into a complete one. */
export function resolvePoseConfig(
  partial: Partial<PoseDetectorConfig> | undefined,
  isMobile = false,
  options: PoseConfigOptions = {}
): PoseDetectorConfig {
  const base = getDefaultPoseConfig(isMobile, options);
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

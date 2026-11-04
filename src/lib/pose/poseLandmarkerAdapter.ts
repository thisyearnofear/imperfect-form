'use client';

/**
 * MediaPipe tasks-vision PoseLandmarker adapter.
 *
 * PoseLandmarker is a different runtime from the tfjs pose-detection family:
 * `FilesetResolver` loads a local WASM fileset, `PoseLandmarker` loads a
 * `.task` model bundle, and frames go through `detectForVideo(image, ts)` with
 * a strictly increasing timestamp — not `estimatePoses`. This module wraps all
 * of that behind the same `estimatePoses` shape the worker and the main-thread
 * loop already call, so registering the tracker costs no call-site surgery.
 *
 * Local-first: the WASM fileset and the `.task` model are served from
 * `public/mediapipe/` on this origin. Nothing here hits a CDN at runtime.
 */

import type { NormalizedLandmark, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { Keypoint, PoseBackendId, PoseDetectorConfig } from '@/types/mediapipe';

/** Local WASM fileset, copied from node_modules/@mediapipe/tasks-vision/wasm. */
export const POSE_LANDMARKER_WASM_BASE = '/mediapipe/wasm';

/**
 * BlazePose-33 landmark names, in output order. Index 0 is `nose`. Indices
 * 0–16 carry the COCO-17 names so downstream consumers that `find` by name
 * (`readArm`, `movementAssessment`, `poseDrawing`, readiness) read the same
 * strings they get from MoveNet; 17–32 are the BlazePose extras (hands, feet,
 * mouth) under their own names.
 */
export const BLAZEPOSE_LANDMARK_NAMES = [
  'nose', // 0
  'left_eye_inner', // 1
  'left_eye', // 2
  'left_eye_outer', // 3
  'right_eye_inner', // 4
  'right_eye', // 5
  'right_eye_outer', // 6
  'left_ear', // 7
  'right_ear', // 8
  'mouth_left', // 9
  'mouth_right', // 10
  'left_shoulder', // 11
  'right_shoulder', // 12
  'left_elbow', // 13
  'right_elbow', // 14
  'left_wrist', // 15
  'right_wrist', // 16
  'left_pinky', // 17
  'right_pinky', // 18
  'left_index', // 19
  'right_index', // 20
  'left_thumb', // 21
  'right_thumb', // 22
  'left_hip', // 23
  'right_hip', // 24
  'left_knee', // 25
  'right_knee', // 26
  'left_ankle', // 27
  'right_ankle', // 28
  'left_heel', // 29
  'right_heel', // 30
  'left_foot_index', // 31
  'right_foot_index', // 32
] as const;

/**
 * The COCO-17 names the exercise engine reads, mapped to their BlazePose-33
 * index. Exported for tests and for any consumer that wants exactly the
 * MoveNet-shaped 17 out of the 33-landmark output.
 */
export const COCO_NAME_TO_BLAZEPOSE_INDEX: Record<string, number> = {
  nose: 0,
  left_eye: 2,
  right_eye: 5,
  left_ear: 7,
  right_ear: 8,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28,
};

/** Image inputs the adapter accepts — the union of both call sites. */
export type LandmarkerInput =
  | ImageBitmap
  | HTMLVideoElement
  | HTMLImageElement
  | HTMLCanvasElement
  | OffscreenCanvas
  | VideoFrame;

/** A pose in the shape every detector in this app reports. */
export interface LandmarkerPose {
  keypoints: Keypoint[];
  score?: number;
}

/**
 * The detector the registry hands back for tasks-vision trackers — the same
 * `estimatePoses` / `dispose` surface as a tfjs `PoseDetector`.
 */
export interface PoseLandmarkerSession {
  estimatePoses(image: LandmarkerInput): Promise<LandmarkerPose[]>;
  dispose(): void;
  /** The delegate the landmarker actually built with ('GPU' | 'CPU'). */
  readonly resolvedDelegate: string;
}

/**
 * Map one pose's normalized landmarks to the engine's keypoint shape.
 *
 * `visibility` is the honest per-landmark score MediaPipe computes — this is
 * the number MoveNet's soft score only approximates, and it feeds the
 * missing-limb cues and visibility gates directly. `presence` (in-bounds
 * likelihood) is the fallback when a model emits no visibility.
 *
 * Coordinates are denormalized to pixels so geometry downstream (angles,
 * drawing, frame-bounds readiness checks) sees the same units as MoveNet.
 */
export function landmarkerKeypoints(
  landmarks: NormalizedLandmark[],
  width: number,
  height: number
): Keypoint[] {
  return landmarks.map((lm, i) => ({
    name: BLAZEPOSE_LANDMARK_NAMES[i] ?? `landmark_${i}`,
    x: lm.x * width,
    y: lm.y * height,
    z: lm.z * width, // z shares x's scale by definition
    score: lm.visibility ?? lm.presence ?? 0,
  }));
}

function inputDimensions(image: LandmarkerInput): { width: number; height: number } {
  // HTMLVideoElement does not exist inside a worker — guard before instanceof.
  if (typeof HTMLVideoElement !== 'undefined' && image instanceof HTMLVideoElement) {
    return { width: image.videoWidth, height: image.videoHeight };
  }
  if (typeof VideoFrame !== 'undefined' && image instanceof VideoFrame) {
    return { width: image.displayWidth, height: image.displayHeight };
  }
  // ImageBitmap, canvases and HTMLImageElement all expose width/height.
  const { width, height } = image as { width: number; height: number };
  return { width, height };
}

/** Which tasks-vision delegate a PoseBackendId asks for. */
export function delegateForBackend(backend: PoseBackendId): 'GPU' | 'CPU' {
  // tasks-vision has no WebGPU delegate; the registry marks 'webgpu'
  // unsupported for this tracker, so any backend reaching here is honest:
  // webgl → GPU delegate, wasm/cpu → CPU delegate.
  return backend === 'webgl' ? 'GPU' : 'CPU';
}

/**
 * Build a PoseLandmarker behind the estimatePoses surface.
 *
 * Tries the requested delegate first and, when GPU init fails (no WebGL in a
 * worker, headless SwiftShader quirks), retries on CPU and reports what it
 * actually built via `resolvedDelegate` — the caller can post that as the
 * backend instead of labelling a CPU run 'webgl'.
 */
export async function createPoseLandmarker(
  config: PoseDetectorConfig,
  modelAssetPath: string
): Promise<PoseLandmarkerSession> {
  // Lazy import: the ~150KB vision bundle (plus multi-MB WASM at init) stays
  // out of the MoveNet path entirely.
  const { FilesetResolver, PoseLandmarker: PoseLandmarkerCtor } =
    await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(POSE_LANDMARKER_WASM_BASE);

  const requested = delegateForBackend(config.backend);
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath, delegate },
    runningMode: 'VIDEO' as const,
    numPoses: 1,
    // The only MoveNet knob with a real landmarker analogue: a pose-level
    // score floor. It is mapped, not carried — see supportedOptions().
    minPoseDetectionConfidence: config.minPoseScore,
  });

  let landmarker: PoseLandmarker;
  let resolvedDelegate: 'GPU' | 'CPU' = requested;
  try {
    landmarker = await PoseLandmarkerCtor.createFromOptions(fileset, options(requested));
  } catch (gpuError) {
    if (requested === 'CPU') throw gpuError;
    console.warn('[poseLandmarker] GPU delegate unavailable, falling back to CPU:', gpuError);
    resolvedDelegate = 'CPU';
    landmarker = await PoseLandmarkerCtor.createFromOptions(fileset, options('CPU'));
  }

  // detectForVideo requires strictly increasing timestamps. performance.now()
  // is monotonic but can repeat within its resolution, so each call bumps the
  // timestamp past the previous one when needed.
  let lastTimestamp = -1;
  const nextTimestamp = () => {
    const now = performance.now();
    lastTimestamp = now > lastTimestamp ? now : lastTimestamp + 1;
    return lastTimestamp;
  };

  return {
    resolvedDelegate,
    async estimatePoses(image: LandmarkerInput): Promise<LandmarkerPose[]> {
      const result = landmarker.detectForVideo(image, nextTimestamp());
      const { width, height } = inputDimensions(image);
      return result.landmarks.map((landmarks) => {
        const keypoints = landmarkerKeypoints(landmarks, width, height);
        const poseScore =
          keypoints.length > 0
            ? keypoints.reduce((sum, kp) => sum + kp.score, 0) / keypoints.length
            : 0;
        return { keypoints, score: poseScore };
      });
    },
    dispose() {
      landmarker.close();
    },
  };
}

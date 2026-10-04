import { SessionSnapshot } from './workout';
import type { PosePreprocessorSettings } from '../lib/pose/posePreprocessor';
export type { PosePreprocessorSettings };

// Keypoint type for pose detection
export interface Keypoint {
  name: string;
  x: number;
  y: number;
  z?: number;
  score: number;
}

// Pose detection result
export interface PoseDetectionResult {
  keypoints: Keypoint[];
  score?: number;
  id?: number;
}

// MediaPipe pose detection model
export interface PoseDetector {
  estimatePoses: (
    image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    config?: {
      flipHorizontal?: boolean;
      maxPoses?: number;
    }
  ) => Promise<PoseDetectionResult[]>;
}

/** Which pose architecture to run. */
export type PoseTrackerId = 'movenet-lightning' | 'movenet-thunder' | 'blazepose';

/** Which tfjs backend to run inference on. */
export type PoseBackendId = 'webgpu' | 'webgl' | 'wasm' | 'cpu';

/**
 * Detector configuration.
 *
 * Previously hard-coded in three places (poseWorker, usePoseDetection,
 * PoseDetectionService) with divergent values in tfUtils. Every detector is now
 * built from this one resolution path so a benchmark cannot silently label a
 * run with a config it never applied. See src/lib/pose/trackerRegistry.ts.
 */
export interface PoseDetectorConfig {
  tracker: PoseTrackerId;
  backend: PoseBackendId;
  /** Upper bound on the inference input's long edge, in pixels. */
  inputSize: number;
  /**
   * MoveNet's smoothing tracker can dereference a missing bounding box on
   * transient frames (`null.yMin`), so the raw detector is used instead.
   */
  enableSmoothing: boolean;
  /** Minimum detection score for a pose to be reported. */
  minPoseScore: number;
  /** Max dimension for multi-pose backends; undefined uses the library default. */
  multiPoseMaxDimension?: number;
  enableTracking: boolean;
}

// Video frame callback metadata
export interface VideoFrameCallbackMetadata {
  presentationTime: DOMHighResTimeStamp;
  expectedDisplayTime: DOMHighResTimeStamp;
  width: number;
  height: number;
  mediaTime: number;
  presentedFrames: number;
  processingDuration?: number;
  captureTime?: DOMHighResTimeStamp;
  receiveTime?: DOMHighResTimeStamp;
  rtpTimestamp?: number;
}

// Worker message types
export type WorkerMessage =
  | {
      type: 'init';
      canvas: OffscreenCanvas;
      mode: string;
      width: number;
      height: number;
      isMobile?: boolean;
      pbTrace?: SessionSnapshot[];
      preprocessor?: PosePreprocessorSettings;
      /** Detector configuration. Omitted means the shipped live default. */
      config?: PoseDetectorConfig;
    }
  | {
      type: 'frame';
      bitmap: ImageBitmap;
      /** Sender performance timestamp used for pipeline-latency measurement. */
      captureTimeMs?: number;
      /** Number of pending frames replaced before this frame was dispatched. */
      coalescedFrames?: number;
    }
  | { type: 'setMode'; mode: string }
  | {
      /**
       * Swap the detector mid-session. Used by the edge perf matrix so a
       * benchmark measures a real config change rather than re-labelling the
       * same live detector.
       */
      type: 'configure';
      config: PoseDetectorConfig;
    }
  | { type: 'stop' };

export interface BiomechanicalState {
  trunkLean: number;
  kneeValgus: number;
  ankleFlexion: number;
  depth: number;
  symmetry: number;
  isStable: boolean;
  warnings: string[];
}

/** Raw curl measurements emitted by the exercise engine for the live instrument. */
export interface CurlPoseData {
  leftElbowAngle?: number;
  rightElbowAngle?: number;
  observedElbowAngle?: number;
  leftShoulderAngle?: number;
  rightShoulderAngle?: number;
  observedShoulderAngle?: number;
  /** Active-arm angle selected by the curl processor for consistent UI depth. */
  activeElbowAngle?: number;
  /** Active-arm elbow drift selected by the curl processor. */
  activeShoulderAngle?: number;
}

export interface CurlTelemetry {
  elbowAngle: number;
  elbowDriftDeg: number | null;
  targetMinDeg: number;
  targetMaxDeg: number;
  elbowDriftTargetDeg: number;
  phase: 'extended' | 'mid-curl' | 'curl-range';
  rangeProgress: number;
  depth: number | null;
}

// Worker response types
export type WorkerResponse =
  | {
      type: 'result';
      state: BiomechanicalState | null;
      keypoints: Keypoint[];
      poseData?: CurlPoseData;
      formCheckSpeak?: { issue: string; phrase: string };
    }
  | { type: 'rep'; count: number }
  | { type: 'ready' }
  | { type: 'backend'; backend: string }
  | { type: 'error'; message: string }
  | {
      type: 'baseline';
      detectionTimeMs: number;
      preprocessTimeMs?: number;
      keypointConfidence: number | null;
      keypointCount: number;
      memoryUsed?: number;
      memoryTotal?: number;
      mode: string;
      coalescedFrames?: number;
      captureTimeMs?: number;
    };

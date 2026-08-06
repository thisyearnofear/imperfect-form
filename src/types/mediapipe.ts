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
    }
  | { type: 'frame'; bitmap: ImageBitmap }
  | { type: 'setMode'; mode: string }
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
    };

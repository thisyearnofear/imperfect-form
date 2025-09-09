/**
 * Type definitions for TensorFlow.js pose detection
 */

declare module '@tensorflow-models/pose-detection' {
  export interface Keypoint {
    x: number;
    y: number;
    z?: number;
    score?: number;
    name?: string;
  }

  export interface Pose {
    keypoints: Keypoint[];
    score?: number;
  }

  export interface PoseDetectorConfig {
    modelType?: string;
    detectorModelUrl?: string;
    minPoseScore?: number;
    multiPoseMaxDimension?: number;
    enableSmoothing?: boolean;
    enableTracking?: boolean;
    trackerType?: string;
    trackerConfig?: Record<string, unknown>;
  }

  export interface PoseDetector {
    estimatePoses(
      image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap,
      config?: {
        flipHorizontal?: boolean;
        maxPoses?: number;
      }
    ): Promise<Pose[]>;
    dispose?: () => void;
  }

  export function createDetector(model: string, config?: PoseDetectorConfig): Promise<PoseDetector>;

  export const SupportedModels: {
    MoveNet: string;
    BlazePose: string;
    PoseNet: string;
  };

  export const movenet: {
    modelType: {
      SINGLEPOSE_LIGHTNING: string;
      SINGLEPOSE_THUNDER: string;
      MULTIPOSE_LIGHTNING: string;
    };
  };
}

declare module '@tensorflow/tfjs-backend-webgl' {
  // This module doesn't export anything directly, it registers the WebGL backend
}

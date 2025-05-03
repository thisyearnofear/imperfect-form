// Types for MediaPipe and TensorFlow.js integrations

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
  | { type: 'init'; canvas: OffscreenCanvas; mode: string; width: number; height: number }
  | { type: 'frame'; bitmap: ImageBitmap }
  | { type: 'stop' };

// Worker response types
export type WorkerResponse = 
  | { type: 'pose'; keypoints: Keypoint[] }
  | { type: 'rep'; count: number }
  | { type: 'error'; message: string };

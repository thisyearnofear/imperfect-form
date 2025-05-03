/**
 * Type definitions for MediaPipe libraries
 */

declare module '@mediapipe/pose' {
  export interface PoseLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export interface PoseResults {
    poseLandmarks: PoseLandmark[];
    image: HTMLVideoElement | HTMLImageElement;
  }

  export interface PoseOptions {
    modelComplexity?: number;
    smoothLandmarks?: boolean;
    enableSegmentation?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class Pose {
    constructor(options?: { locateFile?: (file: string) => string });
    setOptions(options: PoseOptions): void;
    onResults(callback: (results: PoseResults) => void): void;
    send(options: { image: HTMLVideoElement | HTMLImageElement }): Promise<void>;
    close(): void;
  }

  export const POSE_CONNECTIONS: number[][];
}

declare module '@mediapipe/camera_utils' {
  export interface CameraOptions {
    onFrame: () => Promise<void>;
    width?: number;
    height?: number;
    facingMode?: string;
  }

  export class Camera {
    constructor(
      videoElement: HTMLVideoElement,
      options: CameraOptions
    );
    start(): Promise<void>;
    stop(): void;
  }
}

declare module '@mediapipe/drawing_utils' {
  export function drawConnectors(
    ctx: CanvasRenderingContext2D,
    landmarks: Array<{x: number; y: number; z?: number; visibility?: number}>,
    connections: number[][],
    options?: {
      color?: string;
      lineWidth?: number;
    }
  ): void;

  export function drawLandmarks(
    ctx: CanvasRenderingContext2D,
    landmarks: Array<{x: number; y: number; z?: number; visibility?: number}>,
    options?: {
      color?: string;
      lineWidth?: number;
    }
  ): void;
}

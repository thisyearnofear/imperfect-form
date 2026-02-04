/**
 * PoseDetectionService - Unified pose detection service layer
 * Single source of truth for all pose detection operations
 * Replaces fragmented usePoseDetection logic with clean service API
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import type { PoseDetector } from '@tensorflow-models/pose-detection';

export interface PoseDetectionProgress {
  phase: 'initial' | 'tensorflow-init' | 'model-download' | 'warmup' | 'ready';
  message: string;
  percentage: number;
}

export interface PoseDetectionState {
  hasCamera: boolean;
  hasPoseDetection: boolean;
  poseDetected: boolean;
  isLoading: boolean;
  lastError?: string;
}

export interface DetectionConfig {
  isMobile: boolean;
  canvasWidth: number;
  canvasHeight: number;
  videoWidth: number;
  videoHeight: number;
  detectionInterval: number;
}

type ProgressCallback = (progress: PoseDetectionProgress) => void;
type StateCallback = (state: PoseDetectionState) => void;

export class PoseDetectionService {
  private detector: PoseDetector | null = null;
  private config: DetectionConfig | null = null;
  private progressCallbacks: ProgressCallback[] = [];
  private stateCallbacks: StateCallback[] = [];
  private currentState: PoseDetectionState = {
    hasCamera: false,
    hasPoseDetection: false,
    poseDetected: false,
    isLoading: false,
  };

  /**
   * Get the optimal model type for device
   */
  static getOptimalModelType(isMobile: boolean): string {
    return isMobile ? 'lightning' : 'thunder';
  }

  /**
   * Get detector config based on device type
   */
  static getDetectorConfig(isMobile: boolean) {
    if (isMobile) {
      return {
        modelType: 'SinglePose.Lightning',
        enableSmoothing: true,
        minPoseScore: 0.2,
      };
    }
    return {
      modelType: 'SinglePose.Thunder',
      enableSmoothing: true,
      minPoseScore: 0.25,
      multiPoseMaxDimension: 512,
      enableTracking: true,
    };
  }

  /**
   * Subscribe to progress updates during initialization
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Emit progress event
   */
  private emitProgress(progress: PoseDetectionProgress) {
    this.progressCallbacks.forEach((cb) => cb(progress));
  }

  /**
   * Emit state change event
   */
  private emitStateChange(state: Partial<PoseDetectionState>) {
    this.currentState = { ...this.currentState, ...state };
    this.stateCallbacks.forEach((cb) => cb(this.currentState));
  }

  /**
   * Initialize TensorFlow.js backend with progress tracking
   */
  async initializeTensorFlow(isMobile: boolean): Promise<string> {
    this.emitProgress({
      phase: 'tensorflow-init',
      message: 'Initializing TensorFlow.js...',
      percentage: 10,
    });

    try {
      const backend = isMobile ? 'webgl' : 'webgl';
      await tf.setBackend(backend);
      await tf.ready();

      this.emitProgress({
        phase: 'tensorflow-init',
        message: `TensorFlow ready (${backend})`,
        percentage: 30,
      });

      return backend;
    } catch (error) {
      console.error('TensorFlow initialization failed:', error);
      throw new Error('Failed to initialize TensorFlow.js');
    }
  }

  /**
   * Initialize pose detection detector
   */
  async initializeDetector(isMobile: boolean): Promise<PoseDetector> {
    this.emitStateChange({ isLoading: true });

    try {
      this.emitProgress({
        phase: 'model-download',
        message: 'Loading pose detection model...',
        percentage: 0,
      });

      const poseDetection = await import('@tensorflow-models/pose-detection');
      const config = PoseDetectionService.getDetectorConfig(isMobile);

      // Start progress animation from 0% to 70% during model loading
      // This gives users visual feedback during the 10-30s loading time
      let progress = 0;
      const targetProgress = 70;
      const progressInterval = setInterval(() => {
        // Slow down progress as we get closer to target
        const remaining = targetProgress - progress;
        const increment = Math.max(0.5, remaining * 0.05);
        progress = Math.min(targetProgress, progress + increment);
        this.emitProgress({
          phase: 'model-download',
          message: 'Loading pose detection model...',
          percentage: Math.floor(progress),
        });
      }, 200); // Update every 200ms

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        config
      );

      clearInterval(progressInterval);

      this.emitProgress({
        phase: 'model-download',
        message: 'Model loaded',
        percentage: 70,
      });

      // Warm up the model with a dummy inference
      await this.warmupDetector(detector);

      this.detector = detector;
      this.emitStateChange({ hasPoseDetection: true, isLoading: false });
      this.emitProgress({
        phase: 'warmup',
        message: 'Ready for pose detection',
        percentage: 100,
      });

      return detector;
    } catch (error) {
      console.error('Detector initialization failed:', error);
      this.emitStateChange({
        isLoading: false,
        lastError: 'Failed to initialize pose detection',
      });
      throw error;
    }
  }

  /**
   * Warm up detector with dummy inference to avoid first-run latency
   */
  private async warmupDetector(detector: PoseDetector) {
    try {
      // Create a small dummy canvas
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 256, 256);
        // Run dummy detection
        await detector.estimatePoses(canvas);
      }
    } catch (error) {
      // Silently fail warmup - not critical
      console.warn('Detector warmup failed:', error);
    }
  }

  /**
   * Get detector instance
   */
  getDetector(): PoseDetector | null {
    return this.detector;
  }

  /**
   * Get current state
   */
  getState(): PoseDetectionState {
    return { ...this.currentState };
  }

  /**
   * Update camera state
   */
  setCameraReady() {
    this.emitStateChange({ hasCamera: true });
  }

  /**
   * Update pose detected state
   */
  setPoseDetected(detected: boolean) {
    if (detected !== this.currentState.poseDetected) {
      this.emitStateChange({ poseDetected: detected });
    }
  }

  /**
   * Dispose and clean up resources
   */
  dispose() {
    if (this.detector) {
      try {
        (this.detector as any).dispose?.();
      } catch (error) {
        console.error('Error disposing detector:', error);
      }
      this.detector = null;
    }
    this.currentState = {
      hasCamera: false,
      hasPoseDetection: false,
      poseDetected: false,
      isLoading: false,
    };
  }
}

// Singleton instance
let serviceInstance: PoseDetectionService | null = null;

export function getPoseDetectionService(): PoseDetectionService {
  if (!serviceInstance) {
    serviceInstance = new PoseDetectionService();
  }
  return serviceInstance;
}

export function resetPoseDetectionService() {
  if (serviceInstance) {
    serviceInstance.dispose();
    serviceInstance = null;
  }
}

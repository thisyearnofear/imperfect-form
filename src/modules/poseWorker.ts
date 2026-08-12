/// <reference lib="webworker" />
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { createDetector, SupportedModels, PoseDetector } from '@tensorflow-models/pose-detection';
import { Keypoint, WorkerMessage, PosePreprocessorSettings } from '../types/mediapipe';
import {
  getDefaultPreprocessorSettings,
  preprocessImageBitmap,
} from '../lib/pose/posePreprocessor';
import {
  ExerciseMode,
  RepCounterState,
  EngineRepDetectorState,
  createInitialRepCounterState,
  createEngineRepDetectorState,
  detectPushup,
  detectSquat,
  detectEngineRep,
  consumeFormCheckSpeak,
  isEngineMode,
  analyzeBiomechanics,
} from '../utils/biomechanics';
import { drawSkeleton } from '../utils/poseDrawing';
import { PoseSmoother } from '../lib/pose/poseSmoother';

let detector: PoseDetector;
let ctx: OffscreenCanvasRenderingContext2D;
// Biomechanical Helpers removed - consolidated into src/utils/biomechanics.ts

let repCounter: RepCounterState = createInitialRepCounterState();
let engineDetector: EngineRepDetectorState | null = null;
const poseSmoother = new PoseSmoother();
let workerMode: ExerciseMode = 'pushups';
let workerPbTrace: import('../types/workout').SessionSnapshot[] | undefined;
let workerStartTime = 0;
let preprocessorSettings: PosePreprocessorSettings = getDefaultPreprocessorSettings();
let preprocessCanvas: OffscreenCanvas | null = null;
const _MIN_TIME_BETWEEN_REPS = 800; // ms

// Biomechanical Helpers removed - consolidated into src/utils/biomechanics.ts

// Point interface removed - consolidated into src/utils/biomechanics.ts

// Initialize TF backend with WebGPU first then WebGL fallback
async function initTfBackend(): Promise<'webgpu' | 'webgl'> {
  try {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      // Check if WebGPU is actually supported/available in this context
      const adapter = await (navigator as any).gpu?.requestAdapter();
      if (adapter) {
        await import('@tensorflow/tfjs-backend-webgpu');
        await tf.setBackend('webgpu');
        await tf.ready();
        return 'webgpu';
      }
    }
  } catch (e) {
    console.warn('WebGPU init failed, falling back:', e);
  }
  await tf.setBackend('webgl');
  await tf.ready();
  return 'webgl';
}

// calculateAngle removed - consolidated into src/utils/biomechanics.ts

// detectPushup and detectSquat removed - consolidated into src/utils/biomechanics.ts

// Helper to dispose the current detector
async function disposeDetector() {
  if (detector) {
    try {
      (detector as any).dispose?.();
    } catch (e) {
      console.warn('Error disposing detector:', e);
    }
  }
}

// Warm up the model with a dummy inference to avoid first-run latency
async function warmupDetector(detector: PoseDetector, _width: number, _height: number) {
  try {
    // Create a small dummy buffer/canvas
    const offscreen = new OffscreenCanvas(256, 256);
    const tempCtx = offscreen.getContext('2d');
    if (tempCtx) {
      tempCtx.fillStyle = 'black';
      tempCtx.fillRect(0, 0, 256, 256);
      const bitmap = offscreen.transferToImageBitmap();
      await detector.estimatePoses(bitmap);
      bitmap.close();
    }
  } catch (error) {
    console.warn('Detector warmup failed:', error);
  }
}

self.addEventListener('message', async (event) => {
  const data = event.data as WorkerMessage;

  try {
    if (data.type === 'init') {
      const offscreen: OffscreenCanvas = data.canvas;
      // Defensive: ensure mode is never null/undefined
      workerMode = (data.mode ?? 'pushups') as ExerciseMode;
      workerPbTrace = data.pbTrace;
      workerStartTime = Date.now();
      preprocessorSettings = data.preprocessor ?? preprocessorSettings;

      offscreen.width = data.width;
      offscreen.height = data.height;
      ctx = offscreen.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;

      const backend = await initTfBackend();
      self.postMessage({ type: 'backend', backend });

      // Lightning keeps live coaching responsive; the 17-keypoint output is
      // sufficient for the current single-person exercise engine.
      const modelType = 'SinglePose.Lightning';

      await disposeDetector();

      // MoveNet's smoothing tracker can dereference a missing bounding box
      // on transient frames (`null.yMin`). The raw detector is more robust for
      // this camera loop; the session logger still provides temporal context.
      detector = await createDetector(SupportedModels.MoveNet, {
        modelType,
        enableSmoothing: false,
      });

      // Warm up the detector
      await warmupDetector(detector, data.width, data.height);

      repCounter = createInitialRepCounterState();
      engineDetector = isEngineMode(workerMode) ? createEngineRepDetectorState(workerMode) : null;
      poseSmoother.reset();

      self.postMessage({ type: 'ready' });
    } else if (data.type === 'setMode') {
      workerMode = (data.mode ?? 'pushups') as ExerciseMode;
      repCounter = createInitialRepCounterState();
      engineDetector = isEngineMode(workerMode) ? createEngineRepDetectorState(workerMode) : null;
      poseSmoother.reset();
    } else if (data.type === 'frame') {
      if (!detector || !ctx) {
        if (data.bitmap) data.bitmap.close();
        return;
      }

      const bitmap: ImageBitmap = data.bitmap;
      let processedBitmap = bitmap;
      let preprocessTimeMs = 0;
      const preprocessingActive =
        preprocessorSettings.enabled &&
        (preprocessorSettings.mode !== 'none' ||
          preprocessorSettings.cameraCalibration ||
          preprocessorSettings.generativeCleanup);

      if (preprocessingActive) {
        try {
          if (!preprocessCanvas) {
            preprocessCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          }
          const preprocessStart = performance.now();
          processedBitmap = await preprocessImageBitmap(
            bitmap,
            preprocessorSettings,
            preprocessCanvas
          );
          preprocessTimeMs = performance.now() - preprocessStart;
        } catch (_preErr) {
          // Pre-processor failed; fall back to the raw frame and keep going.
          processedBitmap = bitmap;
        }
      }

      const detectStart = performance.now();
      try {
        const poses = await detector.estimatePoses(processedBitmap);
        const detectionTimeMs = performance.now() - detectStart;

        // Emit baseline metrics regardless of whether a pose was detected
        const firstPose = poses[0];
        const keypoints = firstPose?.keypoints as Keypoint[] | undefined;
        const scored = keypoints?.filter((kp) => typeof kp.score === 'number') ?? [];
        const avgScore =
          scored.length > 0
            ? Math.round(
                (scored.reduce((sum, kp) => sum + (kp.score ?? 0), 0) / scored.length) * 1000
              ) / 1000
            : null;

        const memory = (performance as any).memory as
          { usedJSHeapSize?: number; totalJSHeapSize?: number } | undefined;
        self.postMessage({
          type: 'baseline',
          detectionTimeMs: Math.round(detectionTimeMs * 100) / 100,
          preprocessTimeMs: Math.round(preprocessTimeMs * 100) / 100,
          keypointConfidence: avgScore,
          keypointCount: keypoints?.length ?? 0,
          memoryUsed: memory?.usedJSHeapSize,
          memoryTotal: memory?.totalJSHeapSize,
          mode: workerMode,
          coalescedFrames: data.coalescedFrames ?? 0,
          captureTimeMs: data.captureTimeMs,
        });

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 👻 Render Ghost Mode trace if available
        if (workerPbTrace && workerPbTrace.length > 0) {
          const elapsed = Date.now() - workerStartTime;
          const ghostSnapshot = workerPbTrace.find((s) => s.timestamp >= elapsed);
          if (ghostSnapshot) {
            drawSkeleton(ctx, ghostSnapshot.keypoints as any, workerMode, true);
          }
        }

        if (firstPose?.keypoints?.length) {
          const keypoints = poseSmoother.update(firstPose.keypoints as Keypoint[]);

          // Biomechanical Analysis
          const metrics = analyzeBiomechanics(keypoints, workerMode);

          // Update Detection
          const repIncremented =
            workerMode === 'pushups'
              ? detectPushup(keypoints, repCounter)
              : workerMode === 'squats'
                ? detectSquat(keypoints, repCounter)
                : engineDetector
                  ? detectEngineRep(keypoints, workerMode, engineDetector)
                  : false;

          if (repIncremented) {
            repCounter.repCount += 1;
            self.postMessage({ type: 'rep', count: repCounter.repCount });
          }

          const formCheckSpeak = engineDetector ? consumeFormCheckSpeak(engineDetector) : undefined;

          // Render
          drawSkeleton(ctx, keypoints, workerMode);
          self.postMessage({
            type: 'result',
            state: metrics,
            keypoints,
            poseData: engineDetector?.lastPoseData,
            formCheckSpeak,
          } satisfies import('../types/mediapipe').WorkerResponse);
        } else {
          // If no user pose, still draw the ghost if available (already handled above clearRect)
          self.postMessage({ type: 'result', state: null, keypoints: [] });
        }
      } catch (err) {
        // MoveNet can briefly lose its internal bounding box on a noisy frame.
        // Treat that frame as undetected instead of spamming the production
        // console or interrupting the rest of the session.
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('yMin')) {
          console.error('In-worker processing error:', err);
        }
        self.postMessage({ type: 'result', state: null, keypoints: [] });
      } finally {
        // Close the processed bitmap if we created a new one
        if (processedBitmap !== bitmap) {
          processedBitmap.close();
        }
        bitmap.close();
      }
    } else if (data.type === 'stop') {
      await disposeDetector();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error';
    self.postMessage({ type: 'error', message });
  }
});

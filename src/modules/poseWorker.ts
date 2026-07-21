/// <reference lib="webworker" />
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { createDetector, SupportedModels, PoseDetector } from '@tensorflow-models/pose-detection';
import { Keypoint, WorkerMessage } from '../types/mediapipe';
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
  engineDisplayRepState,
  isEngineMode,
  analyzeBiomechanics,
} from '../utils/biomechanics';
import { drawSkeleton, drawFeedback } from '../utils/poseDrawing';

let detector: PoseDetector;
let ctx: OffscreenCanvasRenderingContext2D;
// Biomechanical Helpers removed - consolidated into src/utils/biomechanics.ts

let repCounter: RepCounterState = createInitialRepCounterState();
let engineDetector: EngineRepDetectorState | null = null;
let workerMode: ExerciseMode = 'pushups';
let lastProcessTime = 0;
let workerIsMobile = false;
let workerPbTrace: import('../types/workout').SessionSnapshot[] | undefined;
let workerStartTime = 0;
const DESKTOP_FRAME_INTERVAL_MS = 66; // ~15fps for stability
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

let lastProgress = 0;

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
      workerIsMobile = !!data.isMobile;
      workerPbTrace = data.pbTrace;
      workerStartTime = Date.now();

      offscreen.width = data.width;
      offscreen.height = data.height;
      ctx = offscreen.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;

      const backend = await initTfBackend();
      self.postMessage({ type: 'backend', backend });

      // Consolidate model selection logic:
      // Desktop Squats/Pushups -> Thunder (Best accuracy)
      // Mobile -> Lightning (Best performance)
      const modelType = workerIsMobile ? 'SinglePose.Lightning' : 'SinglePose.Thunder';

      await disposeDetector();

      detector = await createDetector(SupportedModels.MoveNet, {
        modelType,
        enableSmoothing: true,
      });

      // Warm up the detector
      await warmupDetector(detector, data.width, data.height);

      repCounter = createInitialRepCounterState();
      engineDetector = isEngineMode(workerMode) ? createEngineRepDetectorState(workerMode) : null;
      lastProgress = 0;

      self.postMessage({ type: 'ready' });
    } else if (data.type === 'setMode') {
      workerMode = (data.mode ?? 'pushups') as ExerciseMode;
      repCounter = createInitialRepCounterState();
      engineDetector = isEngineMode(workerMode) ? createEngineRepDetectorState(workerMode) : null;
      lastProgress = 0;
    } else if (data.type === 'frame') {
      if (!detector || !ctx) {
        if (data.bitmap) data.bitmap.close();
        return;
      }

      const bitmap: ImageBitmap = data.bitmap;
      const now = performance.now();
      if (!workerIsMobile && now - lastProcessTime < DESKTOP_FRAME_INTERVAL_MS) {
        if (data.bitmap) data.bitmap.close();
        return;
      }
      lastProcessTime = now;

      try {
        const poses = await detector.estimatePoses(bitmap);

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 👻 Render Ghost Mode trace if available
        if (workerPbTrace && workerPbTrace.length > 0) {
          const elapsed = Date.now() - workerStartTime;
          const ghostSnapshot = workerPbTrace.find((s) => s.timestamp >= elapsed);
          if (ghostSnapshot) {
            drawSkeleton(ctx, ghostSnapshot.keypoints as any, workerMode, true);
          }
        }

        if (poses.length > 0) {
          const keypoints = poses[0].keypoints as Keypoint[];

          // Biomechanical Analysis
          const metrics = analyzeBiomechanics(keypoints, workerMode);
          lastProgress = metrics.depth;

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
          const displayRepState = engineDetector
            ? engineDisplayRepState(engineDetector)
            : repCounter.repState;
          drawSkeleton(ctx, keypoints, workerMode);
          drawFeedback(ctx, workerMode, displayRepState, lastProgress, metrics.warnings);

          self.postMessage({
            type: 'result',
            state: metrics,
            keypoints,
            formCheckSpeak,
          } satisfies import('../types/mediapipe').WorkerResponse);
        } else {
          // If no user pose, still draw the ghost if available (already handled above clearRect)
          drawFeedback(ctx, workerMode, 'middle', 0, []);
          self.postMessage({ type: 'result', state: null, keypoints: [] });
        }
      } catch (err) {
        console.error('In-worker processing error:', err);
      } finally {
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

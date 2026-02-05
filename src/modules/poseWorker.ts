/// <reference lib="webworker" />
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { createDetector, SupportedModels, PoseDetector } from '@tensorflow-models/pose-detection';
import { Keypoint, WorkerMessage, BiomechanicalState } from '../types/mediapipe';
import { drawSkeleton, drawFeedback } from '../utils/poseDrawing';

let detector: PoseDetector;
let ctx: OffscreenCanvasRenderingContext2D;
let repState: 'up' | 'down' | 'middle' = 'middle';
let repCount = 0;
let mode: 'pushups' | 'squats' = 'pushups';
let lastRepTime = 0;
let lastProcessTime = 0;
let workerIsMobile = false;
const DESKTOP_FRAME_INTERVAL_MS = 66; // ~15fps for stability
const MIN_TIME_BETWEEN_REPS = 800; // ms

interface Point {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

// Biomechanical Helpers
function getPoint(keypoints: Keypoint[], name: string): Point | null {
  const kp = keypoints.find((k) => k.name === name);
  return kp && kp.score > 0.3 ? kp : null;
}

function calculateTrunkLean(shoulder: Point, hip: Point): number {
  return Math.abs(Math.atan2(shoulder.x - hip.x, shoulder.y - hip.y) * (180 / Math.PI));
}

function calculateKneeValgus(hip: Point, knee: Point, ankle: Point): number {
  const lineX = hip.x + (ankle.x - hip.x) * ((knee.y - hip.y) / (ankle.y - hip.y));
  return Math.abs(knee.x - lineX);
}

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

function calculateAngle(a: Point, b: Point, c: Point) {
  if (!a || !b || !c) return 0;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function detectPushup(keypoints: Keypoint[]) {
  const ls = getPoint(keypoints, 'left_shoulder');
  const rs = getPoint(keypoints, 'right_shoulder');
  const le = getPoint(keypoints, 'left_elbow');
  const re = getPoint(keypoints, 'right_elbow');
  const lw = getPoint(keypoints, 'left_wrist');
  const rw = getPoint(keypoints, 'right_wrist');

  if (!ls || !rs || !le || !re || !lw || !rw) return false;

  const leftArmAngle = calculateAngle(ls, le, lw);
  const rightArmAngle = calculateAngle(rs, re, rw);
  const avgAngle = (leftArmAngle + rightArmAngle) / 2;

  const isDown = avgAngle < 85;
  const isUp = avgAngle > 155;
  const currentTime = Date.now();

  if (isDown && repState !== 'down') {
    repState = 'down';
    return false;
  }
  if (isUp && repState === 'down' && currentTime - lastRepTime > MIN_TIME_BETWEEN_REPS) {
    repState = 'up';
    lastRepTime = currentTime;
    return true;
  }
  return false;
}

function detectSquat(keypoints: Keypoint[]) {
  const lh = getPoint(keypoints, 'left_hip');
  const rh = getPoint(keypoints, 'right_hip');
  const lk = getPoint(keypoints, 'left_knee');
  const rk = getPoint(keypoints, 'right_knee');
  const la = getPoint(keypoints, 'left_ankle');
  const ra = getPoint(keypoints, 'right_ankle');

  if (!lh || !rh || !lk || !rk || !la || !ra) return false;

  const leftAngle = calculateAngle(lh, lk, la);
  const rightAngle = calculateAngle(rh, rk, ra);
  const avgAngle = (leftAngle + rightAngle) / 2;

  const isDown = avgAngle < 115;
  const isUp = avgAngle > 165;
  const currentTime = Date.now();

  if (isDown && repState !== 'down') {
    repState = 'down';
    return false;
  }
  if (isUp && repState === 'down' && currentTime - lastRepTime > MIN_TIME_BETWEEN_REPS) {
    repState = 'up';
    lastRepTime = currentTime;
    return true;
  }
  return false;
}

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
async function warmupDetector(detector: PoseDetector, width: number, height: number) {
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
      mode = (data.mode ?? 'pushups') as 'pushups' | 'squats';
      workerIsMobile = !!data.isMobile;

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

      repState = 'middle';
      repCount = 0;
      lastProgress = 0;

      self.postMessage({ type: 'ready' });
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

        if (poses.length > 0) {
          const keypoints = poses[0].keypoints as Keypoint[];
          const warnings: string[] = [];
          const metrics: BiomechanicalState = {
            trunkLean: 0,
            kneeValgus: 0,
            ankleFlexion: 0,
            depth: 0,
            symmetry: 1,
            isStable: true,
            warnings: [],
          };

          // Biomechanical Analysis
          const lh = getPoint(keypoints, 'left_hip');
          const ls = getPoint(keypoints, 'left_shoulder');
          const lk = getPoint(keypoints, 'left_knee');
          const la = getPoint(keypoints, 'left_ankle');
          const lw = getPoint(keypoints, 'left_wrist');

          if (ls && lh) metrics.trunkLean = calculateTrunkLean(ls, lh);

          if (mode === 'squats' && lh && lk && la) {
            metrics.kneeValgus = calculateKneeValgus(lh, lk, la);
            metrics.ankleFlexion = calculateAngle(lk, la, { x: la.x + 10, y: la.y });

            const currentAngle = calculateAngle(lh, lk, la);
            metrics.depth = (170 - currentAngle) / (170 - 110);
            lastProgress = metrics.depth;

            if (metrics.kneeValgus > 40) warnings.push('KNEES IN');
            if (metrics.trunkLean > 45) warnings.push('LEANING TOO FAR');
          }

          if (mode === 'pushups' && ls && lw) {
            const le = getPoint(keypoints, 'left_elbow');
            if (le) {
              const currentAngle = calculateAngle(ls, le, lw);
              metrics.depth = (160 - currentAngle) / (160 - 85);
              lastProgress = metrics.depth;
            }
          }

          metrics.warnings = warnings;

          // Update Detection
          const repIncremented =
            mode === 'pushups' ? detectPushup(keypoints) : detectSquat(keypoints);

          if (repIncremented) {
            repCount += 1;
            self.postMessage({ type: 'rep', count: repCount });
          }

          // Render
          drawSkeleton(ctx, keypoints, mode);
          drawFeedback(ctx, mode, repState, lastProgress, warnings);

          self.postMessage({ type: 'result', state: metrics, keypoints });
        } else {
          drawFeedback(ctx, mode, 'middle', 0, []);
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

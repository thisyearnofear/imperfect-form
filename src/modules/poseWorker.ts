/// <reference lib="webworker" />
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { createDetector, SupportedModels, PoseDetector } from '@tensorflow-models/pose-detection';
import { Keypoint, WorkerMessage, BiomechanicalState } from '../types/mediapipe';

let detector: PoseDetector;
let ctx: OffscreenCanvasRenderingContext2D;
let repState: 'up' | 'down' | 'middle' = 'middle';
let repCount = 0;
let mode: 'pushups' | 'squats' = 'pushups';
let lastRepTime = 0;
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

function drawSkeleton(ctx: OffscreenCanvasRenderingContext2D, keypoints: Keypoint[], mode: string) {
  const confidenceThreshold = 0.3;
  const keypointMap = keypoints.reduce(
    (map, kp) => {
      if (kp.name) map[kp.name] = kp;
      return map;
    },
    {} as Record<string, Keypoint>
  );

  // Styles
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const accentColor = mode === 'squats' ? '#00ffff' : '#00ff00';
  const secondaryColor = '#ffff00';

  const connections = [
    [['left_shoulder', 'right_shoulder'], '#ffffff', 4],
    [['left_shoulder', 'left_hip'], '#ffffff', 4],
    [['right_shoulder', 'right_hip'], '#ffffff', 4],
    [['left_hip', 'right_hip'], '#ffffff', 4],
    // Arms
    [['left_shoulder', 'left_elbow'], mode === 'pushups' ? accentColor : '#ffffff', 6],
    [['left_elbow', 'left_wrist'], mode === 'pushups' ? accentColor : '#ffffff', 6],
    [['right_shoulder', 'right_elbow'], mode === 'pushups' ? accentColor : '#ffffff', 6],
    [['right_elbow', 'right_wrist'], mode === 'pushups' ? accentColor : '#ffffff', 6],
    // Legs
    [['left_hip', 'left_knee'], mode === 'squats' ? accentColor : '#ffffff', 6],
    [['left_knee', 'left_ankle'], mode === 'squats' ? accentColor : '#ffffff', 6],
    [['right_hip', 'right_knee'], mode === 'squats' ? accentColor : '#ffffff', 6],
    [['right_knee', 'right_ankle'], mode === 'squats' ? accentColor : '#ffffff', 6],
  ] as const;

  // Draw Glow
  ctx.shadowBlur = 15;
  ctx.shadowColor = accentColor;

  connections.forEach(([[p1Name, p2Name], color, width]) => {
    const p1 = keypointMap[p1Name];
    const p2 = keypointMap[p2Name];
    if (p1 && p2 && p1.score > confidenceThreshold && p2.score > confidenceThreshold) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  });

  ctx.shadowBlur = 0;

  // Draw Keypoints
  keypoints.forEach((kp) => {
    if (kp.score > confidenceThreshold) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

function drawFeedback(
  ctx: OffscreenCanvasRenderingContext2D,
  mode: string,
  state: string,
  progress: number,
  warnings: string[]
) {
  ctx.save();
  // Clear flip status for text
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // Rep State Text (Top Right)
  let statusText = state === 'down' ? 'GO UP!' : state === 'up' ? 'GO DOWN!' : 'READY';
  let statusColor = state === 'down' ? '#ff3366' : state === 'up' ? '#00ffcc' : '#ffffff';

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(width - 170, 20, 150, 45, 10);
  ctx.fill();

  ctx.fillStyle = statusColor;
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(statusText, width - 95, 52);

  // Depth Gauge (Left Side)
  const barWidth = 12;
  const barHeight = 200;
  const barX = 30;
  const barY = (height - barHeight) / 2;

  // BG
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 6);
  ctx.fill();

  // Progress
  const cappedProgress = Math.max(0, Math.min(1, progress));
  const fillHeight = barHeight * cappedProgress;

  const gradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY);
  gradient.addColorStop(0, '#00ffcc');
  gradient.addColorStop(1, '#ff3366');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(barX, barY + (barHeight - fillHeight), barWidth, fillHeight, 6);
  ctx.fill();

  // Label
  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Outfit, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DEPTH', barX - 5, barY - 15);

  // Warnings
  if (warnings.length > 0) {
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'left';
    warnings.forEach((msg, i) => {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(20, height - 40 - i * 30, ctx.measureText(msg).width + 20, 25, 5);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.fillText(`! ${msg}`, 30, height - 23 - i * 30);
    });
  }

  ctx.restore();
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
      mode = data.mode as 'pushups' | 'squats';
      const isMobile = !!data.isMobile;

      offscreen.width = data.width;
      offscreen.height = data.height;
      ctx = offscreen.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;

      const backend = await initTfBackend();
      self.postMessage({ type: 'backend', backend });

      // Consolidate model selection logic:
      // Desktop Squats/Pushups -> Thunder (Best accuracy)
      // Mobile -> Lightning (Best performance)
      const modelType = isMobile ? 'SinglePose.Lightning' : 'SinglePose.Thunder';

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

          self.postMessage({ type: 'metrics', state: metrics });
          self.postMessage({ type: 'pose', keypoints });
        } else {
          drawFeedback(ctx, mode, 'middle', 0, []);
          self.postMessage({ type: 'pose', keypoints: [] });
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

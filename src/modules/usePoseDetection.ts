import { useEffect, useRef, RefObject, useState, useCallback } from 'react';
import { WorkerMessage, WorkerResponse, BiomechanicalState, Keypoint } from '../types/mediapipe';
import { drawSkeleton, drawFeedback } from '../utils/poseDrawing';
import { SessionLogger, SessionSummary } from '../services/sessionLogger';
import type { PoseDetector } from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { createDetector, SupportedModels } from '@tensorflow-models/pose-detection';

type ExerciseMode = 'pushups' | 'squats';

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

function calculateAngle(a: Point, b: Point, c: Point) {
  if (!a || !b || !c) return 0;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

let repState: 'up' | 'down' | 'middle' = 'middle';
let repCount = 0;
let lastRepTime = 0;
const MIN_TIME_BETWEEN_REPS = 800; // ms

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

export function usePoseDetection(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  mode: ExerciseMode,
  onRepCount: (count: number) => void,
  isActive: boolean,
  isMobile: boolean = false,
  onPoseStateChange?: (state: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  }) => void,
  onDetectionProgress?: (progress: {
    phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
    message: string;
    percentage: number;
  }) => void,
  onMetrics?: (state: BiomechanicalState) => void,
  onSessionEnd?: (summary: SessionSummary) => void
) {
  // Defensive: handle unexpected null/undefined at runtime
  const safeMode: ExerciseMode = mode === 'squats' ? 'squats' : 'pushups';
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const animationRef = useRef<number | null>(null);
  const [poseState, setPoseState] = useState({
    hasCamera: false,
    hasPoseDetection: false,
    poseDetected: false,
    isLoading: false,
  });

  const sessionLoggerRef = useRef<SessionLogger | null>(null);
  const lastRepCountRef = useRef(0);

  // Use refs for callbacks to avoid re-triggering the main effect
  const onRepCountRef = useRef(onRepCount);
  const onPoseStateChangeRef = useRef(onPoseStateChange);
  const onDetectionProgressRef = useRef(onDetectionProgress);
  const onMetricsRef = useRef(onMetrics);
  const onSessionEndRef = useRef(onSessionEnd);

  const scheduleCallback = useCallback((fn: () => void) => {
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(fn);
    } else {
      Promise.resolve().then(fn);
    }
  }, []);

  const emitProgress = useCallback(
    (progress: {
      phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
      message: string;
      percentage: number;
    }) => {
      if (!onDetectionProgressRef.current) return;
      scheduleCallback(() => onDetectionProgressRef.current?.(progress));
    },
    [scheduleCallback]
  );

  useEffect(() => {
    onRepCountRef.current = onRepCount;
    onPoseStateChangeRef.current = onPoseStateChange;
    onDetectionProgressRef.current = onDetectionProgress;
    onMetricsRef.current = onMetrics;
    onSessionEndRef.current = onSessionEnd;
  }, [onRepCount, onPoseStateChange, onDetectionProgress, onMetrics, onSessionEnd]);

  const notifyStateChange = useCallback(
    (newState: Partial<typeof poseState>) => {
      setPoseState((prev) => {
        const updated = { ...prev, ...newState };
        if (onPoseStateChangeRef.current) {
          scheduleCallback(() => onPoseStateChangeRef.current?.(updated));
        }
        return updated;
      });
    },
    [scheduleCallback]
  );

  // Check if OffscreenCanvas is supported
  const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  useEffect(() => {
    if (!isActive) return;
    if (!canvasRef.current || !videoRef.current) return;

    notifyStateChange({ isLoading: true });
    emitProgress({
      phase: 'initial',
      message: 'Starting...',
      percentage: 10,
    });

    // Initialize session logger
    sessionLoggerRef.current = new SessionLogger(safeMode);
    lastRepCountRef.current = 0;
    repCount = 0;
    repState = 'middle';

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Use worker if OffscreenCanvas is supported AND not on mobile
    // Mobile devices (even with OffscreenCanvas support) often struggle with createImageBitmap and worker overhead
    if (
      supportsOffscreenCanvas &&
      typeof canvas.transferControlToOffscreen === 'function' &&
      !isMobile
    ) {
      // Worker-based approach (desktop)
      startWorkerBasedDetection();
    } else {
      // Main-thread approach (mobile)
      startMainThreadDetection();
    }

    async function startWorkerBasedDetection() {
      try {
        if ((canvas as any)._isTransferred) {
          console.warn('Canvas already transferred');
          return;
        }

        let offscreen: OffscreenCanvas;
        try {
          offscreen = canvas.transferControlToOffscreen();
          (canvas as any)._isTransferred = true;
        } catch (e) {
          console.warn('Canvas transfer failed, falling back to main thread', e);
          startMainThreadDetection();
          return;
        }

        const constraints = {
          video: {
            width: isMobile ? 480 : 640,
            height: isMobile ? 360 : 480,
            facingMode: 'user',
          },
        };

        streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = streamRef.current;
        await video.play();

        notifyStateChange({ hasCamera: true });
        emitProgress({
          phase: 'ai',
          message: 'Initializing AI Model...',
          percentage: 40,
        });

        const worker = new Worker(new URL('./poseWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        const initMessage: WorkerMessage = {
          type: 'init',
          canvas: offscreen,
          mode: safeMode,
          width: video.videoWidth,
          height: video.videoHeight,
          isMobile,
        };
        worker.postMessage(initMessage, [offscreen]);

        let isProcessing = false;
        const frameCallback = async () => {
          if (!videoRef.current || !workerRef.current || !isActive) return;

          if (!isProcessing) {
            isProcessing = true;
            try {
              const bitmap = await createImageBitmap(video);
              worker.postMessage({ type: 'frame', bitmap }, [bitmap]);
            } catch (e) {
              // Silently handle frame capture errors
            }
            isProcessing = false;
          }

          if ('requestVideoFrameCallback' in video) {
            video.requestVideoFrameCallback(frameCallback);
          } else {
            animationRef.current = requestAnimationFrame(frameCallback);
          }
        };

        if ('requestVideoFrameCallback' in video) {
          video.requestVideoFrameCallback(frameCallback);
        } else {
          animationRef.current = requestAnimationFrame(frameCallback);
        }

        worker.onmessage = (
          e: MessageEvent<
            | WorkerResponse
            | {
                type: 'ready' | 'rep' | 'result';
                count?: number;
                state?: BiomechanicalState | null;
                keypoints?: Keypoint[];
              }
          >
        ) => {
          const data = e.data;
          if (data.type === 'ready') {
            notifyStateChange({ hasPoseDetection: true, isLoading: false });
            emitProgress({
              phase: 'ready',
              message: 'Ready!',
              percentage: 100,
            });
          } else if (data.type === 'rep') {
            const count = data.count || 0;
            lastRepCountRef.current = count;
            onRepCountRef.current(count);
          } else if (data.type === 'result') {
            const detected = data.keypoints && data.keypoints.length > 0;
            notifyStateChange({ poseDetected: detected });
            if (data.state) {
              onMetricsRef.current?.(data.state);
              sessionLoggerRef.current?.logFrame(data.state, data.keypoints || []);
            }
          }
        };
      } catch (error) {
        console.error('Failed to start worker-based detection:', error);
        // Fallback to main thread
        startMainThreadDetection();
      }
    }

    async function startMainThreadDetection() {
      console.log('Using main-thread pose detection (mobile fallback)');

      try {
        // STEP 1: Initialize Camera FIRST (critical for iOS)
        const constraints = {
          video: {
            width: isMobile ? 480 : 640,
            height: isMobile ? 360 : 480,
            facingMode: 'user',
          },
        };

        streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = streamRef.current;
        await video.play();

        notifyStateChange({ hasCamera: true });
        emitProgress({
          phase: 'camera',
          message: 'Camera ready',
          percentage: 20,
        });

        // STEP 2: Initialize TensorFlow AFTER camera is running
        emitProgress({
          phase: 'ai',
          message: 'Initializing AI...',
          percentage: 40,
        });

        // iOS Safari workaround: Try WebGL first, fall back to CPU
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('TensorFlow WebGL backend initialized');
        } catch (webglError) {
          console.warn('WebGL failed, trying CPU backend:', webglError);
          try {
            await import('@tensorflow/tfjs-backend-cpu');
            await tf.setBackend('cpu');
            await tf.ready();
            console.log('TensorFlow CPU backend initialized');
          } catch (cpuError) {
            console.error('Both WebGL and CPU backends failed:', cpuError);
            throw cpuError;
          }
        }

        emitProgress({
          phase: 'ai',
          message: 'Loading model...',
          percentage: 60,
        });

        // STEP 3: Create detector
        const modelType = isMobile ? 'SinglePose.Lightning' : 'SinglePose.Thunder';
        detectorRef.current = await createDetector(SupportedModels.MoveNet, {
          modelType: modelType as any,
          enableSmoothing: true,
        });

        notifyStateChange({ hasPoseDetection: true, isLoading: false });
        emitProgress({
          phase: 'ready',
          message: 'Ready!',
          percentage: 100,
        });

        // Set canvas dimensions
        if (isMobile) {
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * window.devicePixelRatio;
          canvas.height = rect.height * window.devicePixelRatio;
        } else {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        // Start detection loop
        const detect = async () => {
          if (!isActive || !videoRef.current || !detectorRef.current) return;

          try {
            const poses = await detectorRef.current!.estimatePoses(videoRef.current);

            const detected = poses.length > 0 && poses[0].keypoints.length > 0;
            notifyStateChange({ poseDetected: detected });

            if (poses.length > 0) {
              const keypoints = poses[0].keypoints as Keypoint[];

              // Biomechanical Analysis
              const lh = getPoint(keypoints, 'left_hip');
              const ls = getPoint(keypoints, 'left_shoulder');
              const lk = getPoint(keypoints, 'left_knee');
              const la = getPoint(keypoints, 'left_ankle');
              const lw = getPoint(keypoints, 'left_wrist');

              const metrics: BiomechanicalState = {
                trunkLean: 0,
                kneeValgus: 0,
                ankleFlexion: 0,
                depth: 0,
                symmetry: 1,
                isStable: true,
                warnings: [],
              };

              if (ls && lh) metrics.trunkLean = calculateTrunkLean(ls, lh);

              if (safeMode === 'squats' && lh && lk && la) {
                metrics.kneeValgus = calculateKneeValgus(lh, lk, la);
                metrics.ankleFlexion = calculateAngle(lk, la, { x: la.x + 10, y: la.y });
                const currentAngle = calculateAngle(lh, lk, la);
                metrics.depth = (170 - currentAngle) / (170 - 110);
                if (metrics.kneeValgus > 40) metrics.warnings.push('KNEES IN');
                if (metrics.trunkLean > 45) metrics.warnings.push('LEANING TOO FAR');
              }

              if (safeMode === 'pushups' && ls && lw) {
                const le = getPoint(keypoints, 'left_elbow');
                if (le) {
                  const currentAngle = calculateAngle(ls, le, lw);
                  metrics.depth = (160 - currentAngle) / (160 - 85);
                }
              }

              // Rep detection
              const repIncremented =
                safeMode === 'pushups' ? detectPushup(keypoints) : detectSquat(keypoints);
              if (repIncremented) {
                repCount += 1;
                lastRepCountRef.current = repCount;
                onRepCountRef.current(repCount);
              }

              onMetricsRef.current?.(metrics);
              sessionLoggerRef.current?.logFrame(metrics, keypoints);

              // Draw on canvas
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                  drawSkeleton(ctx as any, keypoints, safeMode);
                  drawFeedback(ctx as any, safeMode, repState, metrics.depth, metrics.warnings);
                }
              }
            } else {
              // Clear canvas if no pose
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                }
              }
            }
          } catch (error) {
            console.error('Detection error:', error);
          }

          animationRef.current = requestAnimationFrame(detect);
        };

        animationRef.current = requestAnimationFrame(detect);
      } catch (error) {
        console.error('Failed to start main-thread detection:', error);
        notifyStateChange({ isLoading: false, hasPoseDetection: false });
        emitProgress({
          phase: 'ai',
          message: 'AI initialization failed',
          percentage: 0,
        });
      }
    }

    return () => {
      console.log('🧹 Cleaning up pose detection');

      // Calculate and trigger session end callback
      if (sessionLoggerRef.current) {
        const summary = sessionLoggerRef.current.getSummary(lastRepCountRef.current);
        onSessionEndRef.current?.(summary);
      }

      // Clean up worker
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      // Clean up detector
      if (detectorRef.current) {
        try {
          (detectorRef.current as any).dispose?.();
        } catch (e) {
          console.warn('Error disposing detector:', e);
        }
        detectorRef.current = null;
      }

      // Clean up animation frame
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Reset canvas transfer flag
      if (canvasRef.current) {
        (canvasRef.current as any)._isTransferred = false;
      }

      notifyStateChange({ hasCamera: false, hasPoseDetection: false, poseDetected: false });
    };
  }, [canvasRef, safeMode, isActive, isMobile, notifyStateChange, supportsOffscreenCanvas]);

  return videoRef;
}

import { useEffect, useRef, RefObject, useState, useCallback } from 'react';
import { WorkerMessage, WorkerResponse, BiomechanicalState, Keypoint } from '../types/mediapipe';
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
  normalizeExerciseMode,
  analyzeBiomechanics,
} from '../utils/biomechanics';
import { drawSkeleton, drawFeedback } from '../utils/poseDrawing';
import { SessionLogger, SessionSummary } from '../services/sessionLogger';
import { coachStation } from '../services/coachStation';
import type { PoseDetector } from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { createDetector, SupportedModels } from '@tensorflow-models/pose-detection';
import {
  requestCameraPermission,
  cleanupCameraStream,
  monitorCameraStream,
  getFarcasterCameraConstraints,
} from '../utils/cameraPermissions';
import {
  initializeTensorFlow,
  monitorTensorFlowMemory,
  disposeUnusedTensors,
} from '../utils/tensorFlowInit';
import { handleFarcasterError } from '../utils/farcasterErrors';
import { isFarcasterMiniApp } from '../utils/farcasterMiniApp';
import {
  clearPoseRuntimeStatus,
  publishPoseRuntimeStatus,
  readForcePoseWorkerFlag,
  shouldUsePoseWorker,
  type PoseRuntimeWindow,
} from '../lib/pose/poseRuntime';
import { recordPoseBaselineFrame } from '../lib/pose/poseBaseline';
import {
  PosePreprocessorSettings,
  loadPreprocessorSettings,
  preprocessVideoFrame,
} from '../lib/pose/posePreprocessor';

// Biomechanical types removed - consolidated into src/utils/biomechanics.ts

// Biomechanical Helpers removed - consolidated into src/utils/biomechanics.ts

let repCounter: RepCounterState = createInitialRepCounterState();
let engineDetector: EngineRepDetectorState | null = null;

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
  onSessionEnd?: (summary: SessionSummary) => void,
  pbTrace?: import('../types/workout').SessionSnapshot[],
  /** Bumps when Webcam replaces a poisoned OffscreenCanvas host */
  canvasEpoch: number = 0,
  onCanvasPoisoned?: () => void
) {
  // Platform detection variables - defined once at function level
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isSafari =
    /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

  // Must include curls — collapsing it to pushups silently breaks Ring 0 curls
  // and the Milestone 1 coach-station demo (camera → curls → arm moves).
  const safeMode: ExerciseMode = normalizeExerciseMode(mode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const preprocessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const preprocessorSettingsRef = useRef<PosePreprocessorSettings>(loadPreprocessorSettings());
  const animationRef = useRef<number | null>(null);
  const modeRef = useRef<ExerciseMode>(safeMode);
  const isActiveRef = useRef(isActive);
  const wasActiveRef = useRef(false);
  const onCanvasPoisonedRef = useRef(onCanvasPoisoned);
  const [_poseState, setPoseState] = useState<{
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
    lastError?: string;
  }>({
    hasCamera: false,
    hasPoseDetection: false,
    poseDetected: false,
    isLoading: false,
  });

  const sessionLoggerRef = useRef<SessionLogger | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const lastRepCountRef = useRef(0);

  // Use refs for callbacks to avoid re-triggering the main effect
  const onRepCountRef = useRef(onRepCount);
  const onPoseStateChangeRef = useRef(onPoseStateChange);
  const onDetectionProgressRef = useRef(onDetectionProgress);
  const onMetricsRef = useRef(onMetrics);
  const onSessionEndRef = useRef(onSessionEnd);

  modeRef.current = safeMode;
  isActiveRef.current = isActive;
  onCanvasPoisonedRef.current = onCanvasPoisoned;

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
    (newState: Partial<typeof _poseState>) => {
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

  // Hot-swap exercise mode without tearing down camera / OffscreenCanvas.
  useEffect(() => {
    if (!isActive) return;
    engineDetector = isEngineMode(safeMode) ? createEngineRepDetectorState(safeMode) : null;
    workerRef.current?.postMessage({ type: 'setMode', mode: safeMode } satisfies WorkerMessage);
    if (typeof window !== 'undefined') {
      const prev = (window as PoseRuntimeWindow).__IMF_POSE_RUNTIME__;
      if (prev) {
        publishPoseRuntimeStatus({ ...prev, mode: safeMode });
      }
    }
  }, [safeMode, isActive]);

  // Emit session summary only when the parent deactivates us (Stop), not on
  // React Strict Mode remounts or mode hot-swaps (those keep isActive true).
  useEffect(() => {
    if (isActive) {
      wasActiveRef.current = true;
      return;
    }
    if (!wasActiveRef.current) return;
    wasActiveRef.current = false;
    if (sessionLoggerRef.current) {
      const summary = sessionLoggerRef.current.getSummary(lastRepCountRef.current);
      // Ignore ghost sessions from aborted Strict Mode mounts (<500ms).
      if (summary.duration >= 0.5) {
        onSessionEndRef.current?.(summary);
      }
    }
    sessionLoggerRef.current = null;
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;
    if (!canvasRef.current || !videoRef.current) return;

    let cancelled = false;

    notifyStateChange({ isLoading: true });
    emitProgress({
      phase: 'initial',
      message: 'Starting...',
      percentage: 10,
    });

    // Initialize session logger
    const startMode = modeRef.current;
    sessionLoggerRef.current = new SessionLogger(startMode);
    sessionStartTimeRef.current = Date.now();
    lastRepCountRef.current = 0;
    repCounter = createInitialRepCounterState();
    engineDetector = isEngineMode(startMode) ? createEngineRepDetectorState(startMode) : null;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Detect mobile/iOS directly from navigator to avoid race with useDeviceDetect hydration
    // (isMobile prop may still be false on first render due to SSR/useEffect timing)
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent
    );
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileDevice = isMobile || isMobileUA || (window.innerWidth < 768 && isTouchDevice);

    // Path selection: see src/lib/pose/poseRuntime.ts + docs/ARCHITECTURE.md
    const preferWorker = shouldUsePoseWorker({
      isMobileDevice,
      supportsOffscreenCanvas,
      canTransferControl: typeof canvas.transferControlToOffscreen === 'function',
      nodeEnv: process.env.NODE_ENV,
      forceWorker: readForcePoseWorkerFlag(),
    });

    publishPoseRuntimeStatus({
      path: preferWorker ? 'worker' : 'main',
      mode: startMode,
      startedAt: Date.now(),
    });

    if (preferWorker) {
      startWorkerBasedDetection();
    } else {
      startMainThreadDetection();
    }

    async function startWorkerBasedDetection() {
      try {
        if (cancelled) return;

        if ((canvas as any)._isTransferred) {
          console.warn('Canvas already transferred — requesting fresh canvas host');
          onCanvasPoisonedRef.current?.();
          return;
        }

        let offscreen: OffscreenCanvas;
        try {
          offscreen = canvas.transferControlToOffscreen();
          (canvas as any)._isTransferred = true;
        } catch (e) {
          if (cancelled) return;
          console.warn('Canvas transfer failed, falling back to main thread', e);
          publishPoseRuntimeStatus({
            path: 'main',
            mode: modeRef.current,
            startedAt: sessionStartTimeRef.current || Date.now(),
          });
          startMainThreadDetection();
          return;
        }

        if (cancelled) {
          // Transfer already happened; host canvas is dead — ask for a remount.
          onCanvasPoisonedRef.current?.();
          return;
        }

        // Use Farcaster-aware camera permission request
        const constraints = isFarcasterMiniApp()
          ? getFarcasterCameraConstraints()
          : {
              video: {
                width: isMobile ? { ideal: 640 } : 640,
                height: isMobile ? { ideal: 480 } : 480,
                facingMode: 'user',
                frameRate: { ideal: 30 },
              },
            };

        const cameraResult = await requestCameraPermission(constraints);
        if (cancelled) return;

        if (!cameraResult.granted) {
          const farcasterError = handleFarcasterError(
            new Error(cameraResult.error || 'Camera permission failed'),
            'camera-access'
          );

          notifyStateChange({
            isLoading: false,
            lastError: farcasterError.userMessage,
          });

          emitProgress({
            phase: 'camera',
            message: farcasterError.userMessage,
            percentage: 0,
          });

          return;
        }

        streamRef.current = cameraResult.stream!;
        video.srcObject = streamRef.current;

        // iOS Safari needs these attributes even in worker mode
        if (isIOS) {
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('webkit-playsinline', 'true');
        }

        await video.play();
        if (cancelled) return;

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
          mode: modeRef.current,
          width: video.videoWidth,
          height: video.videoHeight,
          isMobile,
          pbTrace,
          preprocessor: preprocessorSettingsRef.current,
        };
        worker.postMessage(initMessage, [offscreen]);

        let isProcessing = false;
        const frameCallback = async () => {
          if (!videoRef.current || !workerRef.current || !isActiveRef.current || cancelled) return;

          if (!isProcessing) {
            isProcessing = true;
            try {
              const bitmap = await createImageBitmap(video);
              worker.postMessage({ type: 'frame', bitmap }, [bitmap]);
            } catch (_e) {
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

        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const data = e.data;
          if (data.type === 'baseline') {
            recordPoseBaselineFrame({
              detectionTimeMs: data.detectionTimeMs ?? 0,
              keypointConfidence: data.keypointConfidence ?? null,
              keypointCount: data.keypointCount ?? 0,
              memoryUsed: data.memoryUsed,
              memoryTotal: data.memoryTotal,
              mode: data.mode ?? modeRef.current,
              path: 'worker',
            });
            return;
          }
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
            // Worker can't open WebSockets — forward engine form cues on main thread
            if (data.formCheckSpeak) {
              coachStation.sendEngineFormCheck(
                modeRef.current,
                data.formCheckSpeak,
                lastRepCountRef.current
              );
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
      if (cancelled) return;
      console.log('Using main-thread pose detection');

      try {
        // iOS Safari workaround: Try to ensure the video element is truly ready
        // and not in a background/suspended state.
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');

        // STEP 1: Initialize Camera FIRST (critical for iOS)
        const isFarcaster = isFarcasterMiniApp();
        const constraints = isFarcaster
          ? getFarcasterCameraConstraints()
          : {
              video: {
                width: isMobile ? { ideal: 640 } : 640,
                height: isMobile ? { ideal: 480 } : 480,
                facingMode: 'user',
                frameRate: { ideal: 30 },
              },
            };

        const cameraResult = await requestCameraPermission(constraints);
        if (cancelled) return;

        if (!cameraResult.granted) {
          const farcasterError = handleFarcasterError(
            new Error(cameraResult.error || 'Camera permission failed'),
            'camera-access'
          );

          notifyStateChange({
            isLoading: false,
            lastError: farcasterError.userMessage,
          });

          emitProgress({
            phase: 'camera',
            message: farcasterError.userMessage,
            percentage: 0,
          });

          return;
        }

        streamRef.current = cameraResult.stream!;
        video.srcObject = streamRef.current;

        // iOS Safari needs playsinline and muted attributes
        if (isIOS) {
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('webkit-playsinline', 'true');
        }

        await video.play();
        if (cancelled) return;

        // Monitor camera stream for disconnections (common in Farcaster)
        if (cameraResult.stream) {
          const stopMonitoring = monitorCameraStream(cameraResult.stream, () => {
            // Camera disconnected - common in mini apps
            const farcasterError = handleFarcasterError(
              new Error('Camera stream disconnected'),
              'camera-disconnected'
            );

            notifyStateChange({
              hasCamera: false,
              lastError: farcasterError.userMessage,
            });

            emitProgress({
              phase: 'camera',
              message: farcasterError.userMessage,
              percentage: 0,
            });
          });

          // Store cleanup function
          (streamRef.current as any)._stopMonitoring = stopMonitoring;
        }

        notifyStateChange({ hasCamera: true });
        emitProgress({
          phase: 'camera',
          message: 'Camera ready',
          percentage: 20,
        });

        // STEP 2: Initialize TensorFlow AFTER camera is running
        emitProgress({
          phase: 'ai',
          message: isFarcaster ? 'Initializing AI for Farcaster...' : 'Initializing AI...',
          percentage: 40,
        });

        // Use Farcaster-optimized TensorFlow initialization
        const tfResult = await initializeTensorFlow({
          isFarcaster,
          isMobile,
          preferWebGL: true,
          memoryLimit: isFarcaster ? 256 : 512,
        });

        if (!tfResult.success) {
          const farcasterError = handleFarcasterError(
            new Error('TensorFlow initialization failed'),
            'tensorflow-init'
          );

          notifyStateChange({
            isLoading: false,
            lastError: farcasterError.userMessage,
          });

          emitProgress({
            phase: 'ai',
            message: farcasterError.userMessage,
            percentage: 0,
          });

          return;
        }

        // Apply optimizations based on platform
        try {
          if (isIOS) {
            tf.env().set('WEBGL_CONV_MATH_WITH_OPTIMIZED_CHANNELS', true);
            tf.env().set('WEBGL_MAX_TEXTURE_SIZE', 4096); // Limit texture size for iOS
          } else if (isMobile) {
            // General mobile optimizations
            tf.env().set('WEBGL_FORCE_F16_PIPELINES', true);
            tf.env().set('WEBGL_PACK', true);
          }

          await tf.ready();
          console.log(
            `TensorFlow WebGL backend initialized (${isIOS && isSafari ? 'iOS Safari optimized' : 'standard'})`
          );

          // Warm up backend with small operations
          if (isIOS) {
            const dummyTensor = tf.tensor2d([
              [1, 2],
              [3, 4],
            ]);
            dummyTensor.mul(dummyTensor).dispose();
            dummyTensor.dispose();
          }
        } catch (webglError) {
          console.warn(
            `WebGL backend failed${isIOS && isSafari ? ' on iOS Safari' : ''}, falling back to CPU:`,
            webglError
          );

          try {
            // Import CPU backend if not already loaded
            await import('@tensorflow/tfjs-backend-cpu');
            await tf.setBackend('cpu');
            await tf.ready();
            console.log('TensorFlow CPU backend initialized');

            // iOS CPU optimization
            if (isIOS) {
              console.log('Applying iOS CPU optimizations');
              tf.env().set('WEBGL_FORCE_FLOAT', false);
            }
          } catch (cpuError) {
            const errorMsg = `Failed to initialize TensorFlow backends. WebGL: ${webglError}, CPU: ${cpuError}`;
            console.error(errorMsg);

            // Provide user-friendly error for iOS Safari
            if (isIOS && isSafari) {
              throw new Error(
                'Unable to initialize pose detection on iOS Safari. Please try: 1) Closing other tabs/apps, 2) Restarting Safari, or 3) Using a different browser.'
              );
            } else {
              throw new Error(`Pose detection initialization failed: ${cpuError}`);
            }
          }
        }

        emitProgress({
          phase: 'ai',
          message: 'Loading model...',
          percentage: 60,
        });

        // STEP 3: Create detector (reuse pre-warmed detector if available)
        const modelType = isMobile ? 'SinglePose.Lightning' : 'SinglePose.Thunder';
        const preWarmedDetector = window.__imfPreWarmedDetector;
        if (preWarmedDetector) {
          detectorRef.current = preWarmedDetector;
          // Remove the global reference so a later session doesn't try to reuse a disposed detector.
          delete window.__imfPreWarmedDetector;
        } else {
          detectorRef.current = await createDetector(SupportedModels.MoveNet, {
            modelType: modelType as any,
            enableSmoothing: true,
          });
        }

        notifyStateChange({ hasPoseDetection: true, isLoading: false });
        emitProgress({
          phase: 'ready',
          message: 'Ready!',
          percentage: 100,
        });

        // Set canvas dimensions with iOS-specific handling
        if (isMobile) {
          const rect = canvas.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;

          // iOS Safari: Limit DPR to save memory
          const effectiveDPR = /iPhone|iPad|iPod/.test(navigator.userAgent) && dpr > 2 ? 2 : dpr;

          canvas.width = rect.width * effectiveDPR;
          canvas.height = rect.height * effectiveDPR;

          // Store dimensions for orientation changes
          (canvas as any)._lastDimensions = {
            width: canvas.width,
            height: canvas.height,
            rectWidth: rect.width,
            rectHeight: rect.height,
          };
        } else {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        // Start detection loop
        const detect = async () => {
          if (!isActiveRef.current || cancelled || !videoRef.current || !detectorRef.current)
            return;

          try {
            const detectStart = performance.now();
            const preprocessorEnabled =
              preprocessorSettingsRef.current.enabled &&
              preprocessorSettingsRef.current.mode !== 'none';
            let detectInput: HTMLVideoElement | HTMLCanvasElement = videoRef.current;
            if (preprocessorEnabled) {
              try {
                if (!preprocessCanvasRef.current) {
                  preprocessCanvasRef.current = document.createElement('canvas');
                }
                detectInput = preprocessVideoFrame(
                  videoRef.current,
                  preprocessCanvasRef.current,
                  preprocessorSettingsRef.current
                );
              } catch (_preErr) {
                // Pre-processor failed; fall back to the raw video frame.
                detectInput = videoRef.current;
              }
            }
            const poses = await detectorRef.current!.estimatePoses(detectInput);
            const detectionTimeMs = performance.now() - detectStart;
            if (cancelled || !isActiveRef.current) return;

            const activeMode = modeRef.current;
            const detected = poses.length > 0 && poses[0].keypoints.length > 0;
            notifyStateChange({ poseDetected: detected });

            // Memory management: periodic cleanup for mini apps and mobile
            const isFarcaster = isFarcasterMiniApp();

            if ((isFarcaster || isIOS) && Math.random() < 0.01) {
              // 1% chance per frame to check memory
              const memoryCheck = monitorTensorFlowMemory();

              if (memoryCheck.shouldDispose) {
                console.log('Memory cleanup triggered:', memoryCheck.memoryInfo);
                disposeUnusedTensors();
              }
            }

            if (poses.length > 0) {
              const keypoints = poses[0].keypoints as Keypoint[];
              const scored = keypoints.filter((kp) => typeof kp.score === 'number');
              const avgScore =
                scored.length > 0
                  ? scored.reduce((sum, kp) => sum + (kp.score ?? 0), 0) / scored.length
                  : null;

              const memory = (performance as any).memory as
                { usedJSHeapSize?: number; totalJSHeapSize?: number } | undefined;

              recordPoseBaselineFrame({
                detectionTimeMs: Math.round(detectionTimeMs * 100) / 100,
                keypointConfidence: avgScore,
                keypointCount: keypoints.length,
                memoryUsed: memory?.usedJSHeapSize,
                memoryTotal: memory?.totalJSHeapSize,
                mode: activeMode,
                path: 'main',
              });

              // Biomechanical Analysis
              const metrics = analyzeBiomechanics(keypoints, activeMode);

              // Rep detection
              const repIncremented =
                activeMode === 'pushups'
                  ? detectPushup(keypoints, repCounter)
                  : activeMode === 'squats'
                    ? detectSquat(keypoints, repCounter)
                    : engineDetector
                      ? detectEngineRep(keypoints, activeMode, engineDetector)
                      : false;
              if (repIncremented) {
                repCounter.repCount += 1;
                lastRepCountRef.current = repCounter.repCount;
                onRepCountRef.current(repCounter.repCount);
              }

              // Physical AI: stream engine form cues (e.g. elbow_swing on curls)
              if (engineDetector) {
                const speak = consumeFormCheckSpeak(engineDetector);
                if (speak) {
                  coachStation.sendEngineFormCheck(activeMode, speak, repCounter.repCount);
                }
              }

              onMetricsRef.current?.(metrics);
              sessionLoggerRef.current?.logFrame(metrics, keypoints);

              // Draw on canvas
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                  // 👻 Render Ghost Mode trace if available
                  if (pbTrace && pbTrace.length > 0) {
                    const elapsed = Date.now() - sessionStartTimeRef.current;
                    // Find the snapshot closest to current elapsed time
                    // We look for the first snapshot that is >= current elapsed time
                    const ghostSnapshot = pbTrace.find((s) => s.timestamp >= elapsed);
                    if (ghostSnapshot) {
                      drawSkeleton(ctx as any, ghostSnapshot.keypoints, activeMode, true);
                    }
                  }

                  drawSkeleton(ctx as any, keypoints, activeMode);
                  drawFeedback(
                    ctx as any,
                    activeMode,
                    engineDetector ? engineDisplayRepState(engineDetector) : repCounter.repState,
                    metrics.depth,
                    metrics.warnings
                  );
                }
              }
            } else {
              // Clear canvas if no pose, but still render ghost if available
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                  // 👻 Render Ghost Mode trace even if user is not detected
                  if (pbTrace && pbTrace.length > 0) {
                    const elapsed = Date.now() - sessionStartTimeRef.current;
                    const ghostSnapshot = pbTrace.find((s) => s.timestamp >= elapsed);
                    if (ghostSnapshot) {
                      drawSkeleton(ctx as any, ghostSnapshot.keypoints, modeRef.current, true);
                    }
                  }
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

        let errorMessage = 'AI initialization failed';
        if (isIOS && isSafari) {
          errorMessage = 'iOS Safari: AI initialization failed. Try restarting the app.';
        }

        notifyStateChange({ isLoading: false, hasPoseDetection: false });
        emitProgress({
          phase: 'ai',
          message: errorMessage,
          percentage: 0,
        });
      }
    }

    // iOS Safari orientation change handler
    const handleOrientationChange = () => {
      if (!canvasRef.current || !videoRef.current || !isActive) return;

      if (isIOS) {
        // Delay to allow iOS Safari to update layout
        setTimeout(() => {
          if (canvasRef.current && videoRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const effectiveDPR = dpr > 2 ? 2 : dpr;

            // Update canvas dimensions
            canvasRef.current.width = rect.width * effectiveDPR;
            canvasRef.current.height = rect.height * effectiveDPR;

            console.log('iOS orientation change: Updated canvas dimensions', {
              width: canvasRef.current.width,
              height: canvasRef.current.height,
            });
          }
        }, 300); // iOS Safari needs a longer delay
      }
    };

    // Add orientation change listener
    window.addEventListener('orientationchange', handleOrientationChange);

    // Also listen for resize events (iOS Safari sometimes triggers these instead)
    const handleResize = () => {
      if (isIOS && isActive) {
        handleOrientationChange();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      console.log('🧹 Cleaning up pose detection');
      clearPoseRuntimeStatus();

      // Remove event listeners
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);

      // Session end is handled by the isActive→false effect — not here.
      // Emitting on every cleanup races React Strict Mode and kills real sessions.

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

      // Stop camera with cleanup
      if (streamRef.current) {
        // Stop monitoring first
        if ((streamRef.current as any)._stopMonitoring) {
          (streamRef.current as any)._stopMonitoring();
        }

        cleanupCameraStream(streamRef.current);
        streamRef.current = null;
      }

      // Reset transfer flag (does not undo a real OffscreenCanvas transfer —
      // Webcam remounts a fresh <canvas> via canvasEpoch when poisoned).
      if (canvasRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        (canvasRef.current as any)._isTransferred = false;
      }

      // Clean up TensorFlow memory (especially important for Farcaster)
      const isFarcaster = isFarcasterMiniApp();
      if (isFarcaster || tf?.getBackend()) {
        try {
          // Force cleanup for mini apps
          disposeUnusedTensors();
          tf.disposeVariables();
          console.log('Cleaned up TensorFlow memory on iOS');
        } catch (e) {
          console.warn('Error cleaning up TensorFlow memory:', e);
        }
      }

      notifyStateChange({ hasCamera: false, hasPoseDetection: false, poseDetected: false });
    };
    // Mode is hot-swapped via modeRef — do not restart the pipeline on exercise change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canvasRef,
    canvasEpoch,
    isActive,
    isMobile,
    notifyStateChange,
    emitProgress,
    supportsOffscreenCanvas,
    pbTrace,
  ]);

  return videoRef;
}

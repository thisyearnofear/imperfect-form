import { useEffect, useRef, RefObject, useState, useCallback } from 'react';
import { WorkerMessage, WorkerResponse } from '../types/mediapipe';

type ExerciseMode = 'pushups' | 'squats';

export function usePoseWorker(
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
    phase: 'initial' | 'tensorflow-init' | 'model-download' | 'warmup' | 'ready';
    message: string;
    percentage: number;
  }) => void,
  onMetrics?: (state: import('../types/mediapipe').BiomechanicalState) => void
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [poseState, setPoseState] = useState({
    hasCamera: false,
    hasPoseDetection: false,
    poseDetected: false,
    isLoading: false,
  });

  // Use refs for callbacks to avoid re-triggering the main effect
  const onRepCountRef = useRef(onRepCount);
  const onPoseStateChangeRef = useRef(onPoseStateChange);
  const onDetectionProgressRef = useRef(onDetectionProgress);
  const onMetricsRef = useRef(onMetrics);

  useEffect(() => {
    onRepCountRef.current = onRepCount;
    onPoseStateChangeRef.current = onPoseStateChange;
    onDetectionProgressRef.current = onDetectionProgress;
    onMetricsRef.current = onMetrics;
  }, [onRepCount, onPoseStateChange, onDetectionProgress, onMetrics]);

  const notifyStateChange = useCallback((newState: Partial<typeof poseState>) => {
    setPoseState((prev) => {
      const updated = { ...prev, ...newState };
      onPoseStateChangeRef.current?.(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (!isActive) return;
    if (workerRef.current) return;
    if (!canvasRef.current || !videoRef.current) return;

    notifyStateChange({ isLoading: true });
    onDetectionProgressRef.current?.({
      phase: 'initial',
      message: 'Starting worker...',
      percentage: 10,
    });

    const canvas = canvasRef.current;
    // We need to transfer control only once. Use a flag on the canvas element itself
    // to track if it has already been transferred, as a safeguard.
    if ((canvas as any)._isTransferred) {
      console.warn('Canvas already transferred according to internal flag');
      return;
    }

    let offscreen: OffscreenCanvas;
    try {
      offscreen = canvas.transferControlToOffscreen();
      (canvas as any)._isTransferred = true;
    } catch (e) {
      console.warn('Canvas already controlled by offscreen or transfer failed', e);
      return;
    }

    const worker = new Worker(new URL('./poseWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    async function start() {
      try {
        const video = videoRef.current!;
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
        onDetectionProgressRef.current?.({
          phase: 'tensorflow-init',
          message: 'Initializing Model...',
          percentage: 40,
        });

        const initMessage: WorkerMessage = {
          type: 'init',
          canvas: offscreen,
          mode,
          width: video.videoWidth,
          height: video.videoHeight,
          isMobile,
        };
        worker.postMessage(initMessage, [offscreen]);

        // Process each video frame
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
            requestAnimationFrame(frameCallback);
          }
        };

        if ('requestVideoFrameCallback' in video) {
          video.requestVideoFrameCallback(frameCallback);
        } else {
          requestAnimationFrame(frameCallback);
        }
      } catch (error) {
        console.error('Failed to start pose detection:', error);
        notifyStateChange({ isLoading: false });
      }
    }

    start();

    worker.onmessage = (
      e: MessageEvent<WorkerResponse | { type: 'ready' | 'backend' | 'pose' }>
    ) => {
      const data = e.data;
      if (data.type === 'ready') {
        notifyStateChange({ hasPoseDetection: true, isLoading: false });
        onDetectionProgressRef.current?.({ phase: 'ready', message: 'Ready!', percentage: 100 });
      } else if (data.type === 'rep') {
        onRepCountRef.current((data as any).count);
      } else if (data.type === 'metrics') {
        onMetricsRef.current?.((data as any).state);
      } else if (data.type === 'pose') {
        const keypoints = (data as any).keypoints;
        const detected = keypoints && keypoints.length > 0;
        notifyStateChange({ poseDetected: detected });
      }
    };

    return () => {
      console.log('🧹 Cleaning up pose worker and stream');
      worker.terminate();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      workerRef.current = null;
      streamRef.current = null;
      notifyStateChange({ hasCamera: false, hasPoseDetection: false, poseDetected: false });
    };
  }, [canvasRef, mode, isActive, isMobile, notifyStateChange]);

  return videoRef;
}

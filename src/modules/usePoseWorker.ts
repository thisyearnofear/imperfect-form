import { useEffect, useRef, RefObject } from 'react';
import { WorkerMessage, WorkerResponse } from '../types/mediapipe';

type ExerciseMode = 'pushups' | 'squats';

export function usePoseWorker(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  mode: ExerciseMode,
  onRepCount: (count: number) => void,
  isActive: boolean
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isActive) return;
    if (workerRef.current) return;
    if (!canvasRef.current || !videoRef.current) return;
    const offscreen = canvasRef.current.transferControlToOffscreen();
    const worker = new Worker(new URL('./poseWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    async function start() {
      const video = videoRef.current!;
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      video.srcObject = streamRef.current;
      await video.play();
      const initMessage: WorkerMessage = {
        type: 'init',
        canvas: offscreen,
        mode,
        width: video.videoWidth,
        height: video.videoHeight,
      };
      worker.postMessage(initMessage, [offscreen]);
      // Process each video frame
      function frameCallback() {
        // DOMHighResTimeStamp and VideoFrameCallbackMetadata parameters are required by the interface
        // but not used in this implementation, so they're omitted
        video.requestVideoFrameCallback(frameCallback);
        createImageBitmap(video).then((bitmap) => {
          const frameMessage: WorkerMessage = { type: 'frame', bitmap };
          worker.postMessage(frameMessage, [bitmap]);
        });
      }
      video.requestVideoFrameCallback(frameCallback);
    }

    start();

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      if (e.data.type === 'rep') onRepCount(e.data.count);
    };

    return () => {
      workerRef.current?.terminate();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      workerRef.current = null;
      streamRef.current = null;
    };
  }, [canvasRef, mode, onRepCount, isActive]);

  return videoRef;
}

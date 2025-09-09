import { useEffect, useRef, RefObject, useCallback } from 'react';
import type { Pose } from '@mediapipe/pose';
import type { Camera } from '@mediapipe/camera_utils';

// Define our own PoseLandmark type
interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

type ExerciseMode = 'pushups' | 'squats';

// Define joint names to match the TensorFlow pose model's naming
const POSE_KEYPOINTS: Record<number, string> = {
  0: 'nose',
  11: 'left_shoulder',
  12: 'right_shoulder',
  13: 'left_elbow',
  14: 'right_elbow',
  15: 'left_wrist',
  16: 'right_wrist',
  23: 'left_hip',
  24: 'right_hip',
  25: 'left_knee',
  26: 'right_knee',
  27: 'left_ankle',
  28: 'right_ankle',
};

type KeypointWithName = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
  name: string;
};

type Point = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export function useMediaPipePose(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  mode: ExerciseMode = 'pushups',
  onRepCount: (count: number) => void = () => {},
  isActive: boolean = true
): RefObject<HTMLVideoElement | null> {
  const videoRef = useRef<HTMLVideoElement>(null);
  const repState = useRef<'up' | 'down' | 'middle'>('middle');
  const repCount = useRef(0);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  function calculateAngle(a: Point, b: Point, c: Point) {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  function detectPushup(keypoints: KeypointWithName[]) {
    const leftShoulder = keypoints.find((kp) => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find((kp) => kp.name === 'right_shoulder');
    const leftElbow = keypoints.find((kp) => kp.name === 'left_elbow');
    const rightElbow = keypoints.find((kp) => kp.name === 'right_elbow');
    const leftWrist = keypoints.find((kp) => kp.name === 'left_wrist');
    const rightWrist = keypoints.find((kp) => kp.name === 'right_wrist');
    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist) {
      return false;
    }
    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;
    const isDown = avgArmAngle < 80;
    const isUp = avgArmAngle > 160;
    if (isDown && repState.current !== 'down') {
      repState.current = 'down';
      return false;
    }
    if (isUp && repState.current === 'down') {
      repState.current = 'up';
      return true;
    }
    return false;
  }

  function detectSquat(keypoints: KeypointWithName[]) {
    const leftHip = keypoints.find((kp) => kp.name === 'left_hip');
    const rightHip = keypoints.find((kp) => kp.name === 'right_hip');
    const leftKnee = keypoints.find((kp) => kp.name === 'left_knee');
    const rightKnee = keypoints.find((kp) => kp.name === 'right_knee');
    const leftAnkle = keypoints.find((kp) => kp.name === 'left_ankle');
    const rightAnkle = keypoints.find((kp) => kp.name === 'right_ankle');
    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return false;
    }
    const leftLegAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightLegAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgLegAngle = (leftLegAngle + rightLegAngle) / 2;
    const isDown = avgLegAngle < 110;
    const isUp = avgLegAngle > 160;
    if (isDown && repState.current !== 'down') {
      repState.current = 'down';
      return false;
    }
    if (isUp && repState.current === 'down') {
      repState.current = 'up';
      return true;
    }
    return false;
  }

  // Define the exercise detection functions with useCallback to include them in dependencies
  const detectPushupCallback = useCallback(detectPushup, []);
  const detectSquatCallback = useCallback(detectSquat, []);

  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;

    // Clean up old instances
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    let isMounted = true;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Dynamically import MediaPipe components
    const setupPose = async () => {
      if (!isMounted) return;

      try {
        // Dynamic imports to avoid SSR issues
        const [{ Pose, POSE_CONNECTIONS }, { Camera }, { drawConnectors, drawLandmarks }] =
          await Promise.all([
            import('@mediapipe/pose'),
            import('@mediapipe/camera_utils'),
            import('@mediapipe/drawing_utils'),
          ]);

        // Set up pose detection
        const pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        poseRef.current = pose;

        // Handle pose detection results
        pose.onResults((results) => {
          if (!ctx || !isMounted) return;

          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Clear canvas and draw video frame
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks) {
            // Draw pose landmarks and connections
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
              color: '#00ff00',
              lineWidth: 3,
            });

            drawLandmarks(ctx, results.poseLandmarks, {
              color: '#ff0000',
              lineWidth: 2,
            });

            // Create keypoints with names
            const keypoints: KeypointWithName[] = results.poseLandmarks.map(
              (lm: PoseLandmark, idx: number) => ({
                x: lm.x,
                y: lm.y,
                z: lm.z,
                visibility: lm.visibility,
                name: POSE_KEYPOINTS[idx] || '',
              })
            );

            // Detect exercises
            if (
              mode === 'pushups' ? detectPushupCallback(keypoints) : detectSquatCallback(keypoints)
            ) {
              const count = repCount.current + 1;
              repCount.current = count;
              onRepCount(count);
            }
          }
        });

        // Set up camera
        const camera = new Camera(video, {
          onFrame: async () => {
            if (isMounted && poseRef.current) {
              await poseRef.current.send({ image: video });
            }
          },
          width: 640,
          height: 480,
        });

        cameraRef.current = camera;
        await camera.start();
      } catch (error) {
        console.error('Error setting up MediaPipe:', error);
      }
    };

    setupPose();

    // Clean up
    return () => {
      isMounted = false;
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
    };
  }, [canvasRef, isActive, mode, onRepCount, detectPushupCallback, detectSquatCallback]);

  return videoRef;
}

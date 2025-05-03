import { useEffect, useRef, RefObject, useCallback } from "react";
// TensorFlow is imported but not directly used in this file
// import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import { initializeTensorFlow } from '@/utils/tfUtils';
import type { PoseDetector } from '@tensorflow-models/pose-detection';

type ExerciseMode = "pushups" | "squats";

// Define keypoint type
type Keypoint = {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
};

export function usePoseDetection(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  mode: ExerciseMode = "pushups",
  onRepCount: (count: number) => void = () => {},
  isActive: boolean = true
): RefObject<HTMLVideoElement | null> {
  const videoRef = useRef<HTMLVideoElement>(null);
  const repState = useRef<"up" | "down" | "middle">("middle");
  const repCount = useRef(0);
  const lastRepTime = useRef(0);
  const detectorRef = useRef<PoseDetector | null>(null);
  const requestRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // This function is defined but not used in the current implementation
  // It's kept for reference and potential future use
  // const drawSkeleton = (ctx: CanvasRenderingContext2D, keypoints: any[]) => {
  //   // Function to draw the connections between joints
  //   ctx.strokeStyle = "#00FF00";
  //   ctx.lineWidth = 2;

  //   // Torso
  //   drawConnection(ctx, keypoints, "left_shoulder", "right_shoulder");
  //   drawConnection(ctx, keypoints, "left_shoulder", "left_hip");
  //   drawConnection(ctx, keypoints, "right_shoulder", "right_hip");
  //   drawConnection(ctx, keypoints, "left_hip", "right_hip");

  //   // Arms
  //   drawConnection(ctx, keypoints, "left_shoulder", "left_elbow");
  //   drawConnection(ctx, keypoints, "left_elbow", "left_wrist");
  //   drawConnection(ctx, keypoints, "right_shoulder", "right_elbow");
  //   drawConnection(ctx, keypoints, "right_elbow", "right_wrist");

  //   // Legs
  //   drawConnection(ctx, keypoints, "left_hip", "left_knee");
  //   drawConnection(ctx, keypoints, "left_knee", "left_ankle");
  //   drawConnection(ctx, keypoints, "right_hip", "right_knee");
  //   drawConnection(ctx, keypoints, "right_knee", "right_ankle");

  //   // Draw each joint
  //   keypoints.forEach((keypoint) => {
  //     if (keypoint.score > 0.3) {
  //       ctx.beginPath();
  //       ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
  //       ctx.fillStyle = "#FF0000";
  //       ctx.fill();
  //     }
  //   });
  // };

  // This function is defined but not used in the current implementation
  // It's kept for reference and potential future use
  // const drawConnection = (
  //   ctx: CanvasRenderingContext2D,
  //   keypoints: any[],
  //   from: string,
  //   to: string
  // ) => {
  //   const fromKeypoint = keypoints.find((kp) => kp.name === from);
  //   const toKeypoint = keypoints.find((kp) => kp.name === to);

  //   if (
  //     fromKeypoint &&
  //     toKeypoint &&
  //     fromKeypoint.score > 0.3 &&
  //     toKeypoint.score > 0.3
  //   ) {
  //     ctx.beginPath();
  //     ctx.moveTo(fromKeypoint.x, fromKeypoint.y);
  //     ctx.lineTo(toKeypoint.x, toKeypoint.y);
  //     ctx.stroke();
  //   }
  // };

  function calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint) {
    if (!a || !b || !c) return 0;
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) -
      Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  function detectPushup(keypoints: Keypoint[]) {
    const leftShoulder = keypoints.find((kp) => kp.name === "left_shoulder");
    const rightShoulder = keypoints.find((kp) => kp.name === "right_shoulder");
    const leftElbow = keypoints.find((kp) => kp.name === "left_elbow");
    const rightElbow = keypoints.find((kp) => kp.name === "right_elbow");
    const leftWrist = keypoints.find((kp) => kp.name === "left_wrist");
    const rightWrist = keypoints.find((kp) => kp.name === "right_wrist");

    if (
      !leftShoulder ||
      !rightShoulder ||
      !leftElbow ||
      !rightElbow ||
      !leftWrist ||
      !rightWrist ||
      !leftShoulder.score || leftShoulder.score < 0.3 ||
      !rightShoulder.score || rightShoulder.score < 0.3 ||
      !leftElbow.score || leftElbow.score < 0.3 ||
      !rightElbow.score || rightElbow.score < 0.3 ||
      !leftWrist.score || leftWrist.score < 0.3 ||
      !rightWrist.score || rightWrist.score < 0.3
    ) {
      return false;
    }

    const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

    const avgArmAngle = (leftArmAngle + rightArmAngle) / 2;

    const isDown = avgArmAngle < 80;
    const isUp = avgArmAngle > 160;

    const currentTime = Date.now();
    const minTimeBetweenReps = 1000; // 1 second minimum between reps

    if (isDown && repState.current !== "down") {
      repState.current = "down";
      return false;
    }

    if (
      isUp &&
      repState.current === "down" &&
      currentTime - lastRepTime.current > minTimeBetweenReps
    ) {
      repState.current = "up";
      lastRepTime.current = currentTime;
      return true;
    }

    return false;
  }

  function detectSquat(keypoints: Keypoint[]) {
    const leftHip = keypoints.find((kp) => kp.name === "left_hip");
    const rightHip = keypoints.find((kp) => kp.name === "right_hip");
    const leftKnee = keypoints.find((kp) => kp.name === "left_knee");
    const rightKnee = keypoints.find((kp) => kp.name === "right_knee");
    const leftAnkle = keypoints.find((kp) => kp.name === "left_ankle");
    const rightAnkle = keypoints.find((kp) => kp.name === "right_ankle");

    if (
      !leftHip ||
      !rightHip ||
      !leftKnee ||
      !rightKnee ||
      !leftAnkle ||
      !rightAnkle ||
      !leftHip.score || leftHip.score < 0.3 ||
      !rightHip.score || rightHip.score < 0.3 ||
      !leftKnee.score || leftKnee.score < 0.3 ||
      !rightKnee.score || rightKnee.score < 0.3 ||
      !leftAnkle.score || leftAnkle.score < 0.3 ||
      !rightAnkle.score || rightAnkle.score < 0.3
    ) {
      return false;
    }

    const leftLegAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightLegAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

    const avgLegAngle = (leftLegAngle + rightLegAngle) / 2;

    const isDown = avgLegAngle < 110;
    const isUp = avgLegAngle > 160;

    const currentTime = Date.now();
    const minTimeBetweenReps = 1000; // 1 second minimum between reps

    if (isDown && repState.current !== "down") {
      repState.current = "down";
      return false;
    }

    if (
      isUp &&
      repState.current === "down" &&
      currentTime - lastRepTime.current > minTimeBetweenReps
    ) {
      repState.current = "up";
      lastRepTime.current = currentTime;
      return true;
    }

    return false;
  }

  // Define the exercise detection functions with useCallback to include them in dependencies
  const detectPushupCallback = useCallback(detectPushup, []);
  const detectSquatCallback = useCallback(detectSquat, []);

  useEffect(() => {
    if (!isActive) return;

    // Using a ref for isMounted state to avoid the prefer-const warning
    const isMountedRef = { current: true };

    // Capture the video ref at the beginning of the effect to avoid the React hooks warning
    const videoElement = videoRef.current;

    // Clean up previous instances
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = 0;
    }

    const initPoseDetection = async () => {
      if (!videoRef.current || !canvasRef.current || !isMountedRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      try {
        // Initialize camera
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });

        video.srcObject = streamRef.current;

        // Initialize TensorFlow.js with the best available backend
        try {
          const backend = await initializeTensorFlow();
          console.log('TensorFlow.js initialized with backend:', backend);
        } catch (tfError) {
          console.error('Failed to initialize TensorFlow:', tfError);
        }

        // Don't try to play the video here - we'll handle that in the Webcam component
        // This avoids the "play interrupted by load request" error

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        console.log("Set canvas dimensions:", canvas.width, canvas.height);

        // Force canvas to be visible with a border for debugging
        canvas.style.border = "3px solid red";
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.zIndex = "10";

        // Initialize the TensorFlow.js pose detection model
        const poseDetectionModule = await import("@tensorflow-models/pose-detection");

        if (!isMountedRef.current) return;

        // Create MoveNet detector
        detectorRef.current = await poseDetectionModule.createDetector(
          poseDetectionModule.SupportedModels.MoveNet,
          { modelType: poseDetectionModule.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );

        // Detection loop with throttling
        let lastDetectionTime = 0;
        const detectionInterval = 100; // Limit to 10 detections per second

        const detectFrame = async (timestamp: number) => {
          if (!isMountedRef.current || !detectorRef.current || !ctx || !video) return;

          // Throttle detection to improve performance
          if (timestamp - lastDetectionTime >= detectionInterval) {
            lastDetectionTime = timestamp;

            try {
              // Clear canvas and draw video frame first for better UX
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Detect poses
              const poses = await detectorRef.current.estimatePoses(video);

              if (poses.length > 0) {
                const keypoints = poses[0].keypoints.map((kp: Keypoint) => ({ ...kp }));

                // Draw skeleton with improved visibility
                drawSkeleton(ctx, keypoints);

                // Draw exercise state information
                drawExerciseState(ctx, canvas.width, canvas.height);

                // Check for rep completion
                if (mode === 'pushups' ? detectPushupCallback(keypoints) : detectSquatCallback(keypoints)) {
                  const count = repCount.current + 1;
                  repCount.current = count;
                  onRepCount(count);
                }
              } else {
                // Even if no pose is detected, still show the exercise state
                drawExerciseState(ctx, canvas.width, canvas.height);
              }
            } catch (error) {
              console.error('Error during pose detection:', error);
            }
          }

          requestRef.current = requestAnimationFrame(detectFrame);
        };

        requestRef.current = requestAnimationFrame(detectFrame);
      } catch (error) {
        console.error('Error initializing pose detection:', error);
      }
    };

    // This function is defined but not used in the current implementation
    // function getKeypointColor(name: string): string {
    //   // Group keypoints by color for better visualization
    //   if (name.includes('shoulder') || name.includes('hip')) {
    //     return '#ff0000'; // Red for core points
    //   } else if (name.includes('elbow') || name.includes('wrist') || name.includes('hand')) {
    //     return '#00ff00'; // Green for arm points
    //   } else if (name.includes('knee') || name.includes('ankle') || name.includes('foot')) {
    //     return '#0000ff'; // Blue for leg points
    //   } else if (name.includes('eye') || name.includes('ear') || name.includes('nose')) {
    //     return '#ffff00'; // Yellow for face points
    //   }
    //   return '#ffffff'; // White for other points
    // }

    // This function is defined but not used in the current implementation
    // function drawKeypoint(ctx: CanvasRenderingContext2D, keypoint: any, color: string) {
    //   const { x, y } = keypoint;

    //   ctx.beginPath();
    //   ctx.arc(x, y, 5, 0, 2 * Math.PI);
    //   ctx.fillStyle = color;
    //   ctx.fill();
    //   ctx.strokeStyle = '#000000';
    //   ctx.lineWidth = 2;
    //   ctx.stroke();
    // }

    function drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: Keypoint[]) {
      const confidenceThreshold = 0.3;

      // Define connections between keypoints for a skeleton
      // This array is defined but not directly used in the current implementation
      // const connections = [
      //   ['nose', 'left_eye'], ['nose', 'right_eye'],
      //   ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
      //   ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'],
      //   ['right_shoulder', 'right_elbow'], ['left_elbow', 'left_wrist'],
      //   ['right_elbow', 'right_wrist'], ['left_shoulder', 'left_hip'],
      //   ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
      //   ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
      //   ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
      // ];

      // Create a map for faster keypoint lookup
      const keypointMap = keypoints.reduce((map, kp) => {
        if (kp.name) {
          map[kp.name] = kp;
        }
        return map;
      }, {} as Record<string, Keypoint>);

      // Draw the connections with extremely thick lines and very strong glow effect
      ctx.lineWidth = mode === 'squats' ? 20 : 18; // Super thick lines for maximum visibility

      // Add very strong glow effect
      ctx.shadowBlur = 30;
      ctx.shadowColor = mode === 'squats' ? '#00ffff' : '#00ff00'; // Brighter colors

      // Group connections by body part for better visualization
      const torsoConnections = [
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip']
      ];

      const armConnections = [
        ['left_shoulder', 'left_elbow'],
        ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_elbow', 'right_wrist']
      ];

      const legConnections = [
        ['left_hip', 'left_knee'],
        ['right_hip', 'right_knee'],
        ['left_knee', 'left_ankle'],
        ['right_knee', 'right_ankle']
      ];

      const faceConnections = [
        ['nose', 'left_eye'],
        ['nose', 'right_eye'],
        ['left_eye', 'left_ear'],
        ['right_eye', 'right_ear']
      ];

      // Draw legs with emphasis for squats
      if (mode === 'squats') {
        // Draw legs first and with more emphasis
        drawConnectionGroup(legConnections, '#ffff00', 6); // Yellow, thicker lines for legs in squat mode
        drawConnectionGroup(torsoConnections, '#00ff00', 4); // Green for torso
        drawConnectionGroup(armConnections, '#00ffff', 3); // Cyan for arms
        drawConnectionGroup(faceConnections, '#ffffff', 2); // White for face
      } else {
        // For pushups, emphasize arms
        drawConnectionGroup(armConnections, '#00ff00', 5); // Green, thicker lines for arms in pushup mode
        drawConnectionGroup(torsoConnections, '#ffff00', 4); // Yellow for torso
        drawConnectionGroup(legConnections, '#00ffff', 3); // Cyan for legs
        drawConnectionGroup(faceConnections, '#ffffff', 2); // White for face
      }

      // Reset shadow for keypoints
      ctx.shadowBlur = 0;

      // Draw keypoints with larger radius for better visibility
      keypoints.forEach(keypoint => {
        if (keypoint.score && keypoint.score > confidenceThreshold && keypoint.name) {
          const isLegPoint = ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'].includes(keypoint.name);
          const isArmPoint = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'].includes(keypoint.name);

          // Emphasize leg points for squats, arm points for pushups - use much larger points
          const radius = mode === 'squats' && isLegPoint ? 12 :
                         mode === 'pushups' && isArmPoint ? 12 : 8;

          // Add glow effect for keypoints
          ctx.shadowBlur = 10;

          // Color based on body part - use brighter colors
          if (isLegPoint) {
            ctx.fillStyle = mode === 'squats' ? '#ffff00' : '#00ffff'; // Yellow for legs in squat mode, cyan otherwise
            ctx.shadowColor = '#ffff00';
          } else if (isArmPoint) {
            ctx.fillStyle = mode === 'pushups' ? '#00ff00' : '#00ffff'; // Green for arms in pushup mode, cyan otherwise
            ctx.shadowColor = '#00ff00';
          } else if (keypoint.name && ['nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear'].includes(keypoint.name)) {
            ctx.fillStyle = '#ffffff'; // White for face
            ctx.shadowColor = '#ffffff';
          } else {
            ctx.fillStyle = '#ff00ff'; // Magenta for other points
            ctx.shadowColor = '#ff00ff';
          }

          // Draw point with thicker outline
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI);
          ctx.fill();

          // Add white outline for better visibility
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      });

      // Helper function to draw connection groups
      function drawConnectionGroup(connectionGroup: string[][], color: string, lineWidth: number) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;

        connectionGroup.forEach(([p1Name, p2Name]) => {
          const p1 = keypointMap[p1Name];
          const p2 = keypointMap[p2Name];

          if (p1 && p2 && p1.score && p2.score && p1.score > confidenceThreshold && p2.score > confidenceThreshold) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      }
    }

    function drawExerciseState(ctx: CanvasRenderingContext2D, width: number, height: number) {
      // Draw rep count and current state with improved visibility
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'right';

      // Add shadow for better text visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Show exercise type with background
      const modeText = `MODE: ${mode.toUpperCase()}`;
      ctx.fillStyle = '#fcb131';
      ctx.fillText(modeText, width - 10, 30);

      // Show position state with visual indicator
      let stateText = '';
      let stateColor = '';

      if (repState.current === "up") {
        stateText = "UP";
        stateColor = '#00ff00'; // Green
      } else if (repState.current === "down") {
        stateText = "DOWN";
        stateColor = '#ff0000'; // Red
      } else {
        stateText = "READY";
        stateColor = '#ffffff'; // White
      }

      // Draw state text
      ctx.fillStyle = stateColor;
      ctx.fillText(stateText, width - 10, 70);

      // Draw visual indicator for the current state
      if (mode === 'squats') {
        // Draw a stick figure in squat or standing position
        const centerX = width - 60;
        const headY = repState.current === "down" ? height - 100 : height - 150;

        // Head
        ctx.beginPath();
        ctx.arc(centerX, headY, 15, 0, 2 * Math.PI);
        ctx.fillStyle = stateColor;
        ctx.fill();

        // Body
        ctx.beginPath();
        ctx.moveTo(centerX, headY + 15);
        ctx.lineTo(centerX, headY + 50);
        ctx.strokeStyle = stateColor;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Legs
        if (repState.current === "down") {
          // Squatting position
          ctx.beginPath();
          ctx.moveTo(centerX, headY + 50);
          ctx.lineTo(centerX - 20, headY + 60);
          ctx.lineTo(centerX - 20, headY + 80);
          ctx.moveTo(centerX, headY + 50);
          ctx.lineTo(centerX + 20, headY + 60);
          ctx.lineTo(centerX + 20, headY + 80);
          ctx.stroke();
        } else {
          // Standing position
          ctx.beginPath();
          ctx.moveTo(centerX, headY + 50);
          ctx.lineTo(centerX - 15, headY + 100);
          ctx.moveTo(centerX, headY + 50);
          ctx.lineTo(centerX + 15, headY + 100);
          ctx.stroke();
        }
      } else {
        // Draw a stick figure in pushup position
        const centerX = width - 60;
        const centerY = height - 100;

        if (repState.current === "down") {
          // Down position
          ctx.beginPath();
          ctx.moveTo(centerX - 30, centerY);
          ctx.lineTo(centerX + 30, centerY);
          ctx.strokeStyle = stateColor;
          ctx.lineWidth = 4;
          ctx.stroke();
        } else {
          // Up position
          ctx.beginPath();
          ctx.moveTo(centerX - 30, centerY - 20);
          ctx.lineTo(centerX, centerY);
          ctx.lineTo(centerX + 30, centerY - 20);
          ctx.strokeStyle = stateColor;
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    initPoseDetection();

    return () => {
      // Mark component as unmounted
      isMountedRef.current = false;

      // Cancel any animation frames
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = 0;
      }

      // Dispose of the detector
      if (detectorRef.current) {
        try {
          // Use optional chaining to safely call dispose if it exists
          // Using type interface augmentation in tensorflow.d.ts to allow this
          detectorRef.current.dispose?.();
        } catch (error) {
          console.error("Error disposing detector:", error);
        }
        detectorRef.current = null;
      }

      // Stop all media tracks using the captured ref value
      if (videoElement?.srcObject) {
        try {
          const stream = videoElement.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            track.stop();
          });
          videoElement.srcObject = null;
        } catch (error) {
          console.error("Error stopping video tracks:", error);
        }
      }

      // Stop all tracks from the stream reference
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
          });
          streamRef.current = null;
        } catch (error) {
          console.error("Error stopping stream tracks:", error);
        }
      }
    };
  }, [canvasRef, mode, onRepCount, isActive, detectPushupCallback, detectSquatCallback]);

  return videoRef;
}

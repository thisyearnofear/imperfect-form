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
  isActive: boolean = true,
  isMobile: boolean = false,
  onStateChange?: (state: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  }) => void
): RefObject<HTMLVideoElement | null> {
  const videoRef = useRef<HTMLVideoElement>(null);
  const repState = useRef<"up" | "down" | "middle">("middle");
  const repCount = useRef(0);
  const lastRepTime = useRef(0);
  const detectorRef = useRef<PoseDetector | null>(null);
  const requestRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // State tracking for guidance
  const [hasCamera, setHasCamera] = useState(false);
  const [hasPoseDetection, setHasPoseDetection] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastPoseDetectedTime = useRef(0);

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

  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        hasCamera,
        hasPoseDetection,
        poseDetected,
        isLoading,
      });
    }
  }, [hasCamera, hasPoseDetection, poseDetected, isLoading, onStateChange]);

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

      setIsLoading(true);

      try {
        // Initialize TensorFlow.js with the best available backend
        // Pass isMobile flag to apply device-specific optimizations
        try {
          const backend = await initializeTensorFlow(isMobile);
          console.log('TensorFlow.js initialized with backend:', backend);
        } catch (tfError) {
          console.error('Failed to initialize TensorFlow:', tfError);
        }

        // Initialize camera with appropriate resolution
        // Use lower resolution on mobile for better performance
        const constraints = {
          video: {
            width: isMobile ? 480 : 640,
            height: isMobile ? 360 : 480
          }
        };

        streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = streamRef.current;
        setHasCamera(true);

        // Set canvas dimensions to match video with mobile optimization
        if (isMobile) {
          // On mobile, use the actual display size to avoid scaling issues
          const rect = canvas.getBoundingClientRect();
          canvas.width = rect.width * window.devicePixelRatio;
          canvas.height = rect.height * window.devicePixelRatio;
          console.log("Set mobile canvas dimensions:", canvas.width, canvas.height, "DPR:", window.devicePixelRatio);
        } else {
          // Desktop uses video dimensions directly
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          console.log("Set desktop canvas dimensions:", canvas.width, canvas.height);
        }

        // Force canvas to be visible with a border for debugging
        const borderColor = isMobile ? "3px solid green" : "3px solid red";
        canvas.style.border = borderColor; // Different color for mobile/desktop for debugging
        canvas.style.position = "absolute";
        canvas.style.top = "0";
        canvas.style.left = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.zIndex = "10";

        // Import pose detection models dynamically to reduce initial load time
        try {
          const poseDetection = await import('@tensorflow-models/pose-detection');

          // Use a simpler configuration for mobile to ensure compatibility
          if (isMobile) {
            // On mobile: use the most reliable and lightweight settings
            detectorRef.current = await poseDetection.createDetector(
              poseDetection.SupportedModels.MoveNet,
              {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                enableSmoothing: true,
                minPoseScore: 0.2,
              }
            );
          } else {
            // On desktop: use the original high-quality settings
            detectorRef.current = await poseDetection.createDetector(
              poseDetection.SupportedModels.MoveNet,
              {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
                enableSmoothing: true,
                minPoseScore: 0.25,
                multiPoseMaxDimension: 512,
                enableTracking: true
              }
            );
          }

          console.log('Pose detector initialized successfully for', isMobile ? 'mobile' : 'desktop');
          setHasPoseDetection(true);
          setIsLoading(false);
        } catch (modelError) {
          console.error('Error initializing pose detection model:', modelError);
          setIsLoading(false);
        }

        // Detection loop with throttling
        // Use more aggressive throttling on mobile for better performance
        let lastDetectionTime = 0;
        const detectionInterval = isMobile ? 120 : 100; // More throttling on mobile

        const detectFrame = async (timestamp: number) => {
          if (!isMountedRef.current || !detectorRef.current || !ctx || !video) return;

          // Throttle detection to improve performance
          if (timestamp - lastDetectionTime >= detectionInterval) {
            lastDetectionTime = timestamp;

            try {
              // Ensure canvas has valid dimensions before drawing
              if (canvas.width === 0 || canvas.height === 0) {
                // Set fallback dimensions if canvas is zero-sized
                const fallbackWidth = video.videoWidth || video.clientWidth || 320;
                const fallbackHeight = video.videoHeight || video.clientHeight || 240;

                if (fallbackWidth > 0 && fallbackHeight > 0) {
                  canvas.width = fallbackWidth;
                  canvas.height = fallbackHeight;
                  console.log('Fixed zero-sized canvas', { width: fallbackWidth, height: fallbackHeight });
                } else {
                  // Last resort fallback to prevent texture size error
                  canvas.width = 320;
                  canvas.height = 240;
                  console.log('Using emergency fallback canvas size: 320x240');
                }
              }

              // Clear canvas and draw video frame first for better UX
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Only try to draw if dimensions are valid
              if (canvas.width > 0 && canvas.height > 0) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              }

              // Detect poses
              const poses = await detectorRef.current.estimatePoses(video);

              if (poses.length > 0) {
                const keypoints = poses[0].keypoints.map((kp: Keypoint) => ({ ...kp }));

                // Update pose detection state
                const currentTime = Date.now();
                lastPoseDetectedTime.current = currentTime;
                if (!poseDetected) {
                  setPoseDetected(true);
                }

                // Draw skeleton with improved visibility
                drawSkeleton(ctx, keypoints);

                // Draw exercise state information
                drawExerciseState(ctx);

                // Check for rep completion
                if (mode === 'pushups' ? detectPushupCallback(keypoints) : detectSquatCallback(keypoints)) {
                  const count = repCount.current + 1;
                  repCount.current = count;
                  onRepCount(count);
                }
              } else {
                // Check if we should mark pose as not detected (after 2 seconds of no detection)
                const currentTime = Date.now();
                if (poseDetected && currentTime - lastPoseDetectedTime.current > 2000) {
                  setPoseDetected(false);
                }

                // Even if no pose is detected, still show the exercise state
                drawExerciseState(ctx);
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

    function drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: Keypoint[]) {
      const confidenceThreshold = 0.3;

      // Create a map for faster keypoint lookup
      const keypointMap = keypoints.reduce((map, kp) => {
        if (kp.name) {
          map[kp.name] = kp;
        }
        return map;
      }, {} as Record<string, Keypoint>);

      // Mobile-specific scaling for graphics
      const scaleFactor = isMobile ? window.devicePixelRatio : 1;

      // Draw the connections with device-appropriate thickness
      if (isMobile) {
        // On mobile, scale down the thickness but keep visibility
        ctx.lineWidth = (mode === 'squats' ? 12 : 10) * scaleFactor;
        ctx.shadowBlur = 15 * scaleFactor;
      } else {
        // Desktop keeps the original thick, gamified look
        ctx.lineWidth = mode === 'squats' ? 20 : 18;
        ctx.shadowBlur = 30;
      }

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

      // Draw legs with emphasis for squats - mobile-aware scaling
      if (mode === 'squats') {
        if (isMobile) {
          // Mobile: thinner lines to not overwhelm small screen
          drawConnectionGroup(legConnections, '#ffff00', 2 * scaleFactor); // Yellow for legs
          drawConnectionGroup(torsoConnections, '#00ff00', 1.5 * scaleFactor); // Green for torso
          drawConnectionGroup(armConnections, '#00ffff', 1.5 * scaleFactor); // Cyan for arms
          drawConnectionGroup(faceConnections, '#ffffff', 1 * scaleFactor); // White for face
        } else {
          // Desktop: keep original thick gamified look
          drawConnectionGroup(legConnections, '#ffff00', 6); // Yellow, thicker lines for legs in squat mode
          drawConnectionGroup(torsoConnections, '#00ff00', 4); // Green for torso
          drawConnectionGroup(armConnections, '#00ffff', 3); // Cyan for arms
          drawConnectionGroup(faceConnections, '#ffffff', 2); // White for face
        }
      } else {
        if (isMobile) {
          // Mobile pushups: thinner lines
          drawConnectionGroup(armConnections, '#00ff00', 2 * scaleFactor); // Green for arms
          drawConnectionGroup(torsoConnections, '#ffff00', 1.5 * scaleFactor); // Yellow for torso
          drawConnectionGroup(legConnections, '#00ffff', 1.5 * scaleFactor); // Cyan for legs
          drawConnectionGroup(faceConnections, '#ffffff', 1 * scaleFactor); // White for face
        } else {
          // Desktop pushups: keep original thick look
          drawConnectionGroup(armConnections, '#00ff00', 5); // Green, thicker lines for arms in pushup mode
          drawConnectionGroup(torsoConnections, '#ffff00', 4); // Yellow for torso
          drawConnectionGroup(legConnections, '#00ffff', 3); // Cyan for legs
          drawConnectionGroup(faceConnections, '#ffffff', 2); // White for face
        }
      }

      // Reset shadow for keypoints
      ctx.shadowBlur = 0;

      // Draw keypoints with larger radius for better visibility
      keypoints.forEach(keypoint => {
        if (keypoint.score && keypoint.score > confidenceThreshold && keypoint.name) {
          const isLegPoint = ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'].includes(keypoint.name);
          const isArmPoint = ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'].includes(keypoint.name);

          // Emphasize leg points for squats, arm points for pushups - mobile-aware sizing
          let radius;
          if (isMobile) {
            // Mobile: smaller keypoints to not overwhelm
            radius = (mode === 'squats' && isLegPoint ? 6 :
                     mode === 'pushups' && isArmPoint ? 6 : 4) * scaleFactor;
          } else {
            // Desktop: keep original large keypoints
            radius = mode === 'squats' && isLegPoint ? 12 :
                     mode === 'pushups' && isArmPoint ? 12 : 8;
          }

          // Add glow effect for keypoints - mobile-aware
          ctx.shadowBlur = isMobile ? 5 * scaleFactor : 10;

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
    }

    function drawExerciseState(ctx: CanvasRenderingContext2D) {
      // Save the current canvas state
      ctx.save();

      // Apply horizontal flip to un-mirror the text
      ctx.scale(-1, 1);

      // Draw rep count and current state with improved visibility - mobile-aware
      const fontSize = isMobile ? 18 : 24; // Smaller text on mobile
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'right'; // Use right align since we're flipped

      // Add shadow for better text visibility - mobile-aware
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = isMobile ? 3 : 5;
      ctx.shadowOffsetX = isMobile ? -1 : -2; // Flip shadow offset
      ctx.shadowOffsetY = isMobile ? 1 : 2;

      // Show exercise type with background - positioned on left (but flipped)
      const modeText = `MODE: ${mode.toUpperCase()}`;
      ctx.fillStyle = '#fcb131';
      ctx.fillText(modeText, -10, 30); // Negative position due to flip

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

      // Draw state text - positioned on left (but flipped)
      ctx.fillStyle = stateColor;
      ctx.fillText(stateText, -10, 70); // Negative position due to flip

      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Restore the canvas state
      ctx.restore();
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
  }, [canvasRef, mode, onRepCount, isActive, isMobile, detectPushupCallback, detectSquatCallback]);

  return videoRef;
}

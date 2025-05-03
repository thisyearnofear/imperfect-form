import { useEffect, useRef, useState } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

// Define filter options - only "none" is available for now
export const filterOptions = [
  { name: "none", path: null },
];

export type FilterOption = typeof filterOptions[number];

export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isActive: boolean = true
) {
  const [currentFilter, setCurrentFilter] = useState<FilterOption>(filterOptions[0]);
  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const filterImageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize face detection
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const initializeDetector = async () => {
      try {
        // Initialize TensorFlow.js backend
        await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1,
          }
        ).then(detector => {
          detectorRef.current = detector;
          isInitializedRef.current = true;
        });
      } catch (error) {
        console.error('Error initializing face detection:', error);
        // Mark as initialized anyway to prevent infinite retries
        isInitializedRef.current = true;
      }
    };

    initializeDetector();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Clean up detector
      if (detectorRef.current) {
        detectorRef.current = null;
      }
    };
  }, [isActive]);

  // Load filter image when filter changes
  useEffect(() => {
    if (!currentFilter.path) {
      filterImageRef.current = null;
      return;
    }

    const img = new Image();
    img.src = currentFilter.path;
    img.onload = () => {
      filterImageRef.current = img;
    };
    img.onerror = (err) => {
      console.error('Error loading filter image:', currentFilter.path, err);
      filterImageRef.current = null;
    };
  }, [currentFilter]);

  // Run face detection loop
  useEffect(() => {
    // Only run the detection loop if the component is active
    if (!isActive) {
      return;
    }

    // Check for initialization every 500ms until initialized
    const initCheckInterval = setInterval(() => {
      if (isInitializedRef.current) {
        clearInterval(initCheckInterval);
        startDetectionLoop();
      }
    }, 500);

    function startDetectionLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

    const detectFace = async () => {
      if (!video || !canvas || !ctx || !detectorRef.current) {
        animationFrameRef.current = requestAnimationFrame(detectFace);
        return;
      }

      try {
        // Make sure video is valid and has dimensions
        if (!video || !video.videoWidth || !video.videoHeight) {
          animationFrameRef.current = requestAnimationFrame(detectFace);
          return;
        }

        // Make sure canvas dimensions are set
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        // Detect faces
        const faces = await detectorRef.current.estimateFaces(video);

        // We don't clear the canvas here as the pose detection has already drawn on it
        // Instead, we'll draw our filters on top of the existing content

        // Draw filter if we have faces and a filter is selected
        if (faces.length > 0 && filterImageRef.current && currentFilter.name !== 'none') {
          const face = faces[0];
          const keypoints = face.keypoints;

          // Different filter positions based on filter type
          if (currentFilter.name === 'nose') {
            // Nose filter - position on nose tip
            const nose = keypoints[4]; // Nose tip
            const scale = 0.5;
            const width = filterImageRef.current.width * scale;
            const height = filterImageRef.current.height * scale;
            ctx.drawImage(
              filterImageRef.current,
              nose.x - width / 2,
              nose.y - height / 2,
              width,
              height
            );
          } else if (currentFilter.name === 'mustache') {
            // Mustache filter - position between nose and upper lip
            const nose = keypoints[4]; // Nose tip
            const upperLip = keypoints[13]; // Upper lip
            const scale = 0.6;
            const width = filterImageRef.current.width * scale;
            const height = filterImageRef.current.height * scale;
            const x = (nose.x + upperLip.x) / 2;
            const y = (nose.y + upperLip.y) / 2;
            ctx.drawImage(
              filterImageRef.current,
              x - width / 2,
              y - height / 3,
              width,
              height
            );
          } else if (currentFilter.name === 'arch' || currentFilter.name === 'degen') {
            // Full face filters - position on face center
            const leftEye = keypoints[33]; // Left eye
            const rightEye = keypoints[263]; // Right eye
            const chin = keypoints[152]; // Chin
            const faceWidth = Math.abs(rightEye.x - leftEye.x) * 2.5;
            const faceHeight = Math.abs(chin.y - ((leftEye.y + rightEye.y) / 2)) * 2.5;
            const faceCenterX = (leftEye.x + rightEye.x) / 2;
            const faceCenterY = (leftEye.y + rightEye.y + chin.y) / 3;

            ctx.drawImage(
              filterImageRef.current,
              faceCenterX - faceWidth / 2,
              faceCenterY - faceHeight / 2,
              faceWidth,
              faceHeight
            );
          }
        }
      } catch (error) {
        console.error('Error in face detection:', error);
      }

      // Continue the detection loop
      animationFrameRef.current = requestAnimationFrame(detectFace);
    };

    // Start the detection loop
    detectFace();
    }

    // Clean up function
    return () => {
      clearInterval(initCheckInterval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, videoRef, canvasRef, currentFilter]);

  // Function to cycle through filters
  const cycleFilter = () => {
    const currentIndex = filterOptions.findIndex(filter => filter.name === currentFilter.name);
    const nextIndex = (currentIndex + 1) % filterOptions.length;
    setCurrentFilter(filterOptions[nextIndex]);
    return filterOptions[nextIndex].name;
  };

  return {
    currentFilter,
    setCurrentFilter,
    cycleFilter
  };
}

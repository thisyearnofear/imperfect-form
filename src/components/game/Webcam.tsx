'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { usePoseDetection } from '@/modules/usePoseDetection';
import useDeviceDetect from '@/hooks/useDeviceDetect';
import { createRemoteLogger } from '@/utils/remoteLogger';
import { normalizeExerciseMode } from '@/utils/biomechanics';

// Add type declaration for window object
declare global {
  interface Window {
    cycleWebcamFilter?: () => string;
    _poseModel?: unknown; // TensorFlow pose detection model
    tf?: unknown; // TensorFlow library
  }
}

interface WebcamProps {
  mode?: import('@/utils/biomechanics').ExerciseMode;
  onRepCount?: (count: number) => void;
  isActive?: boolean;
  onFilterChange?: (filterName: string) => void;
  onPoseStateChange?: (state: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  }) => void;
  onDetectionProgress?: (progress: {
    phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
    message: string;
    percentage: number;
  }) => void;
  onMetrics?: (state: import('@/types/mediapipe').BiomechanicalState) => void;
  onSessionEnd?: (summary: import('@/services/sessionLogger').SessionSummary) => void;
  pbTrace?: import('@/types/workout').SessionSnapshot[];
}

// Initialize logger for the Webcam component
const logger = createRemoteLogger('Webcam');

const Webcam: React.FC<WebcamProps> = ({
  mode = 'pushups',
  onRepCount = () => {},
  isActive = true,
  onFilterChange = () => {},
  onPoseStateChange,
  onDetectionProgress,
  onMetrics,
  onSessionEnd,
  pbTrace,
}) => {
  // Must pass curls/pullups/jumps through so the exercise engine runs.
  const safeMode = normalizeExerciseMode(mode);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // OffscreenCanvas transfer is irreversible — remount a fresh host when poisoned.
  const [canvasEpoch, setCanvasEpoch] = useState(0);
  const onCanvasPoisoned = useCallback(() => {
    setCanvasEpoch((epoch) => epoch + 1);
  }, []);
  // Pass isMobile flag to usePoseDetection for mobile-specific optimizations
  const { isMobile } = useDeviceDetect();
  const videoRef = usePoseDetection(
    canvasRef,
    safeMode,
    onRepCount,
    isActive,
    isMobile,
    onPoseStateChange,
    onDetectionProgress,
    onMetrics,
    onSessionEnd,
    pbTrace,
    canvasEpoch,
    onCanvasPoisoned
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Function to handle filter cycling - expose it to parent component
  // We keep this for API compatibility but it doesn't do much
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Add a method to the window object that the Game component can call
    const handleFilterChange = () => {
      const newFilterName = 'none'; // Always return "none" as we don't use filters

      // Notify parent component
      if (typeof onFilterChange === 'function') {
        onFilterChange(newFilterName);
      }

      return newFilterName;
    };

    // Add to window for Game component to access
    window.cycleWebcamFilter = handleFilterChange;

    return () => {
      // Clean up when component unmounts
      delete window.cycleWebcamFilter;
    };
  }, [onFilterChange]);

  // Handle video play interruptions and ensure canvas is properly sized
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    let playAttemptTimeout: NodeJS.Timeout;
    let isPlayAttemptInProgress = false;

    // Handle play interruptions
    const handlePlayError = () => {
      if (video.paused && !isPlayAttemptInProgress) {
        isPlayAttemptInProgress = true;
        logger.warn('Video playback paused unexpectedly, attempting to resume');
        // Try to play again after a short delay
        playAttemptTimeout = setTimeout(() => {
          video
            .play()
            .catch((err) => {
              logger.error('Failed to resume video playback', err);
            })
            .finally(() => {
              isPlayAttemptInProgress = false;
            });
        }, 500);
      }
    };

    // Handle loadedmetadata event to play video when it's ready
    const handleLoadedMetadata = () => {
      // Ensure canvas is sized properly to avoid 0x0 texture errors
      if (canvasRef.current && video) {
        // Size canvas with mobile-specific optimization
        const { videoWidth, videoHeight } = video;
        if (videoWidth && videoHeight) {
          try {
            if (isMobile) {
              // On mobile, use the actual display size to avoid scaling issues
              const rect = canvasRef.current.getBoundingClientRect();
              canvasRef.current.width = rect.width * window.devicePixelRatio;
              canvasRef.current.height = rect.height * window.devicePixelRatio;
              logger.info('Set mobile canvas dimensions', {
                width: canvasRef.current.width,
                height: canvasRef.current.height,
                DPR: window.devicePixelRatio,
                displaySize: { width: rect.width, height: rect.height },
              });
            } else {
              // Desktop uses video dimensions directly
              canvasRef.current.width = videoWidth;
              canvasRef.current.height = videoHeight;
              logger.info('Set desktop canvas dimensions', {
                width: videoWidth,
                height: videoHeight,
              });
            }
          } catch (_e) {
            // This happens if transferControlToOffscreen has already been called
            logger.debug('Canvas already transferred, skipping resize');
          }
        } else {
          try {
            // Fallback to default dimensions if video dimensions aren't available yet
            canvasRef.current.width = isMobile ? 320 * window.devicePixelRatio : 320;
            canvasRef.current.height = isMobile ? 240 * window.devicePixelRatio : 240;
            logger.info('Set fallback canvas dimensions', {
              width: canvasRef.current.width,
              height: canvasRef.current.height,
              mobile: isMobile,
            });
          } catch (_e) {
            logger.debug('Canvas already transferred, skipping resize');
          }
        }
      }

      // Only try to play if the component is still active
      if (isActive && !isPlayAttemptInProgress) {
        isPlayAttemptInProgress = true;
        logger.info('Video metadata loaded, attempting to play');
        // Add a small delay to ensure the video is fully loaded
        playAttemptTimeout = setTimeout(() => {
          video
            .play()
            .catch((err) => {
              logger.warn('Initial video play was rejected', err);
            })
            .finally(() => {
              isPlayAttemptInProgress = false;
            });
        }, 300);
      }
    };

    // Listen for events
    video.addEventListener('pause', handlePlayError);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleLoadedMetadata);

    // If video is already loaded, try to play it
    if (video.readyState >= 2) {
      handleLoadedMetadata();
    }

    return () => {
      // Clean up event listeners and timeout
      video.removeEventListener('pause', handlePlayError);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleLoadedMetadata);
      clearTimeout(playAttemptTimeout);

      // Enhanced camera stopping when component unmounts or isActive changes to false
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        let stoppedTracks = 0;

        stream.getTracks().forEach((track) => {
          if (track.readyState === 'live') {
            track.stop();
            stoppedTracks++;
            logger.info(`Webcam: Stopped ${track.kind} track`, {
              trackId: track.id,
              trackLabel: track.label,
              trackState: track.readyState,
            });
          }
        });

        video.srcObject = null;
        video.pause();
        video.load(); // Force video element reset

        logger.info(`Webcam cleanup: Stopped ${stoppedTracks} tracks`);
      }
    };
  }, [isActive, videoRef, canvasRef, isMobile]);

  // Handle window resize for desktop - simplified since we now fill parent
  useEffect(() => {
    // Skip for mobile
    if (isMobile || typeof window === 'undefined') return;

    // Log dimensions to help with debugging
    const logDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        logger.info(`Desktop container dimensions: ${containerWidth}x${containerHeight}`, {
          mobile: isMobile,
        });
      }
    };

    // Call once on mount and whenever window resizes
    logDimensions();
    window.addEventListener('resize', logDimensions);

    return () => window.removeEventListener('resize', logDimensions);
  }, [isMobile]);

  // Log when component mounts to help with debugging
  useEffect(() => {
    if (isMobile) {
      logger.info(`Mobile Webcam mounted - mode: ${safeMode}, active: ${isActive}`);
    }
    return () => {
      if (isMobile) {
        logger.info('Mobile Webcam unmounting');
      }
    };
  }, [isMobile, safeMode, isActive]);

  // Style the canvas directly to ensure it's properly visible and sized
  useEffect(() => {
    if (canvasRef.current) {
      // Force canvas to be visible with a thin green border - based on the working blue border style
      canvasRef.current.style.border = '2px solid rgba(0, 255, 0, 0.5)';
      canvasRef.current.style.position = 'absolute';
      canvasRef.current.style.top = '0';
      canvasRef.current.style.left = '0';
      canvasRef.current.style.width = '100%';
      canvasRef.current.style.height = '100%';
      canvasRef.current.style.zIndex = '10';

      // Ensure the canvas has non-zero dimensions initially
      if (canvasRef.current.width === 0 || canvasRef.current.height === 0) {
        canvasRef.current.width = 320;
        canvasRef.current.height = 240;
      }
    }
  }, [canvasRef]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        // Fix mobile video squeezing by using flex-based sizing instead of conflicting aspect-ratio
        ...(isMobile
          ? {
              // Mobile: Let the parent flex container control height, maintain aspect ratio via padding
              width: '100%',
              height: '100%', // Fill the flex-grow container from Game.tsx
              maxHeight: '100%',
              minHeight: '300px',
            }
          : {
              // Desktop: Use fixed dimensions to match screen container
              width: '100%',
              height: '480px',
            }),
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute top-0 left-0 w-full h-full z-0"
        style={{
          // Mobile-specific video optimizations
          ...(isMobile
            ? {
                objectFit: 'cover', // On mobile, crop to fill container completely (full screen experience)
                transform: 'scaleX(-1)', // Mirror video on mobile for better UX
                backgroundColor: '#000', // Black background for letterboxing if needed
              }
            : {
                objectFit: 'cover', // Desktop: crop to fill container completely
                transform: 'scaleX(-1)', // Mirror video on desktop too for consistency
                width: '100%',
                height: '100%',
              }),
        }}
        muted
        playsInline
        autoPlay
      />
      <canvas
        key={canvasEpoch}
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-10"
        style={{
          // Mirror canvas to match video on both mobile and desktop
          transform: 'scaleX(-1)',
        }}
      />
    </div>
  );
};

export default Webcam;

"use client";
import React, { useRef, useEffect, useState } from "react";
import { usePoseDetection } from "@/modules/usePoseDetection";
import { useFaceDetection } from "@/modules/useFaceDetection";
import useDeviceDetect from "@/hooks/useDeviceDetect";
import { createRemoteLogger } from "@/utils/remoteLogger";

// Add type declaration for window object
declare global {
  interface Window {
    cycleWebcamFilter?: () => string;
    _poseModel?: unknown; // TensorFlow pose detection model
    tf?: unknown; // TensorFlow library
  }
}

interface WebcamProps {
  mode?: "pushups" | "squats";
  onRepCount?: (count: number) => void;
  isActive?: boolean;
  onFilterChange?: (filterName: string) => void;
}

// Initialize logger for the Webcam component
const logger = createRemoteLogger("Webcam");

const Webcam: React.FC<WebcamProps> = ({
  mode = "pushups",
  onRepCount = () => {},
  isActive = true,
  onFilterChange = () => {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Pass isMobile flag to usePoseDetection for mobile-specific optimizations
  const { isMobile } = useDeviceDetect();
  const videoRef = usePoseDetection(
    canvasRef,
    mode,
    onRepCount,
    isActive,
    isMobile
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  // Initialize face detection API but don't actually use face detection
  // This maintains API compatibility without loading heavy ML libraries
  const {} = useFaceDetection(videoRef, canvasRef, isActive);

  // Function to handle filter cycling - expose it to parent component
  // We keep this for API compatibility but it doesn't do much
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Add a method to the window object that the Game component can call
    const handleFilterChange = () => {
      const newFilterName = "none"; // Always return "none" as we don't use filters

      // Notify parent component
      if (typeof onFilterChange === "function") {
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
        logger.warn("Video playback paused unexpectedly, attempting to resume");
        // Try to play again after a short delay
        playAttemptTimeout = setTimeout(() => {
          video
            .play()
            .catch((err) => {
              logger.error("Failed to resume video playback", err);
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
          if (isMobile) {
            // On mobile, use the actual display size to avoid scaling issues
            const rect = canvasRef.current.getBoundingClientRect();
            canvasRef.current.width = rect.width * window.devicePixelRatio;
            canvasRef.current.height = rect.height * window.devicePixelRatio;
            logger.info("Set mobile canvas dimensions", {
              width: canvasRef.current.width,
              height: canvasRef.current.height,
              DPR: window.devicePixelRatio,
              displaySize: { width: rect.width, height: rect.height },
            });
          } else {
            // Desktop uses video dimensions directly
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;
            logger.info("Set desktop canvas dimensions", {
              width: videoWidth,
              height: videoHeight,
            });
          }
        } else {
          // Fallback to default dimensions if video dimensions aren't available yet
          canvasRef.current.width = isMobile
            ? 320 * window.devicePixelRatio
            : 320;
          canvasRef.current.height = isMobile
            ? 240 * window.devicePixelRatio
            : 240;
          logger.info("Set fallback canvas dimensions", {
            width: canvasRef.current.width,
            height: canvasRef.current.height,
            mobile: isMobile,
          });
        }
      }

      // Only try to play if the component is still active
      if (isActive && !isPlayAttemptInProgress) {
        isPlayAttemptInProgress = true;
        logger.info("Video metadata loaded, attempting to play");
        // Add a small delay to ensure the video is fully loaded
        playAttemptTimeout = setTimeout(() => {
          video
            .play()
            .catch((err) => {
              logger.warn("Initial video play was rejected", err);
            })
            .finally(() => {
              isPlayAttemptInProgress = false;
            });
        }, 300);
      }
    };

    // Listen for events
    video.addEventListener("pause", handlePlayError);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleLoadedMetadata);

    // If video is already loaded, try to play it
    if (video.readyState >= 2) {
      handleLoadedMetadata();
    }

    return () => {
      // Clean up event listeners and timeout
      video.removeEventListener("pause", handlePlayError);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleLoadedMetadata);
      clearTimeout(playAttemptTimeout);

      // Stop the video and release camera when component unmounts or isActive changes to false
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        video.srcObject = null;
        video.pause();
      }
    };
  }, [isActive, videoRef, canvasRef, isMobile]);

  // Handle window resize for desktop
  useEffect(() => {
    // Skip for mobile
    if (isMobile || typeof window === "undefined") return;
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Set container height based on aspect ratio
        const aspectRatio = isMobile ? 4 / 3 : 16 / 9; // Use 4:3 for mobile, 16:9 for desktop
        const calculatedHeight = containerWidth / aspectRatio;
        setContainerHeight(calculatedHeight);

        // Log dimensions to help with debugging
        logger.info(
          `Container resized: ${containerWidth}x${calculatedHeight}`,
          {
            mobile: isMobile,
            aspectRatio: aspectRatio,
          }
        );
      }
    };

    // Call once on mount and whenever window resizes
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  // Log when component mounts to help with debugging
  useEffect(() => {
    if (isMobile) {
      logger.info(`Mobile Webcam mounted - mode: ${mode}, active: ${isActive}`);
    }
    return () => {
      if (isMobile) {
        logger.info("Mobile Webcam unmounting");
      }
    };
  }, [isMobile, mode, isActive]);

  // Style the canvas directly to ensure it's properly visible and sized
  useEffect(() => {
    if (canvasRef.current) {
      // Force canvas to be visible with a thin green border - based on the working blue border style
      canvasRef.current.style.border = "2px solid rgba(0, 255, 0, 0.5)";
      canvasRef.current.style.position = "absolute";
      canvasRef.current.style.top = "0";
      canvasRef.current.style.left = "0";
      canvasRef.current.style.width = "100%";
      canvasRef.current.style.height = "100%";
      canvasRef.current.style.zIndex = "10";

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
              width: "100%",
              height: "100%", // Fill the flex-grow container from Game.tsx
              maxHeight: "70vh",
              minHeight: "300px",
            }
          : {
              // Desktop: Use fixed dimensions
              height: containerHeight ? `${containerHeight}px` : "480px",
              aspectRatio: "16/9",
            }),
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full z-0"
        style={{
          // Mobile-specific video optimizations
          ...(isMobile
            ? {
                objectFit: "contain", // On mobile, show full video without cropping
                transform: "scaleX(-1)", // Mirror video on mobile for better UX
                backgroundColor: "#000", // Black background for letterboxing if needed
              }
            : {
                objectFit: "cover", // Desktop can crop to fill
              }),
        }}
        muted
        playsInline
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-10"
        style={{
          // Mobile-specific canvas optimizations
          ...(isMobile && {
            transform: "scaleX(-1)", // Mirror canvas to match video
          }),
        }}
      />
      {isMobile && (
        <div className="absolute bottom-4 right-4 z-20 bg-black/50 text-xs text-white px-2 py-1 rounded">
          {mode.toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default Webcam;

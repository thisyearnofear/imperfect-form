"use client";
import React, { useRef, useEffect, useState } from "react";
import { usePoseDetection } from "@/modules/usePoseDetection";
import { useFaceDetection } from "@/modules/useFaceDetection";
import useDeviceDetect from "@/hooks/useDeviceDetect";

// Add type declaration for window object
declare global {
  interface Window {
    cycleWebcamFilter?: () => string;
  }
}

interface WebcamProps {
  mode?: "pushups" | "squats";
  onRepCount?: (count: number) => void;
  isActive?: boolean;
  onFilterChange?: (filterName: string) => void;
}

const Webcam: React.FC<WebcamProps> = ({
  mode = "pushups",
  onRepCount = () => {},
  isActive = true,
  onFilterChange = () => {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = usePoseDetection(canvasRef, mode, onRepCount, isActive);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isMobile } = useDeviceDetect();
  const [containerHeight, setContainerHeight] = useState<number | null>(null);

  // Initialize face detection API but don't actually use face detection
  // This maintains API compatibility without loading heavy ML libraries
  const { } = useFaceDetection(videoRef, canvasRef, isActive);

  // Function to handle filter cycling - expose it to parent component
  // We keep this for API compatibility but it doesn't do much
  useEffect(() => {
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

  // Handle video play interruptions
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    let playAttemptTimeout: NodeJS.Timeout;
    let isPlayAttemptInProgress = false;

    // Handle play interruptions
    const handlePlayError = () => {
      if (video.paused && !isPlayAttemptInProgress) {
        isPlayAttemptInProgress = true;
        // Try to play again after a short delay
        playAttemptTimeout = setTimeout(() => {
          video
            .play()
            .catch(() => {})
            .finally(() => {
              isPlayAttemptInProgress = false;
            });
        }, 500);
      }
    };

    // Handle loadedmetadata event to play video when it's ready
    const handleLoadedMetadata = () => {
      // Only try to play if the component is still active
      if (isActive && !isPlayAttemptInProgress) {
        isPlayAttemptInProgress = true;
        // Add a small delay to ensure the video is fully loaded
        playAttemptTimeout = setTimeout(() => {
          video
            .play()
            .catch(() => {})
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
    if (video.readyState >= 3) {
      // HAVE_FUTURE_DATA or higher
      handleLoadedMetadata();
    }

    return () => {
      clearTimeout(playAttemptTimeout);
      video.removeEventListener("pause", handlePlayError);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleLoadedMetadata);

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
  }, [videoRef, isActive]);

  // Responsive container sizing for mobile
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Set container height based on aspect ratio
        const aspectRatio = isMobile ? 4/3 : 16/9;
        const calculatedHeight = containerWidth / aspectRatio;
        setContainerHeight(calculatedHeight);
      }
    };
    
    // Call once on mount and whenever window resizes
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);
  
  // Style the canvas directly
  useEffect(() => {
    if (canvasRef.current) {
      // Force canvas to be visible with a border for debugging
      canvasRef.current.style.border = "3px solid blue";
      canvasRef.current.style.position = "absolute";
      canvasRef.current.style.top = "0";
      canvasRef.current.style.left = "0";
      canvasRef.current.style.width = "100%";
      canvasRef.current.style.height = "100%";
      canvasRef.current.style.zIndex = "10";
    }
  }, [canvasRef]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full" 
      style={{ 
        height: containerHeight ? `${containerHeight}px` : (isMobile ? 'auto' : '480px'),
        aspectRatio: isMobile ? '4/3' : '16/9'
      }}
    >
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        muted
        playsInline
        autoPlay
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-10"
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

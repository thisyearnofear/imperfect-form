"use client";
import React, { useRef, useEffect } from "react";
import { usePoseDetection } from "@/modules/usePoseDetection";
import { useFaceDetection } from "@/modules/useFaceDetection";

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

  // Initialize face detection for filters
  const { cycleFilter } = useFaceDetection(videoRef, canvasRef, isActive);

  // Function to handle filter cycling - expose it to parent component
  useEffect(() => {
    // Add a method to the window object that the Game component can call
    const handleFilterChange = () => {
      try {
        if (typeof cycleFilter !== "function") {
          console.error("cycleFilter is not a function");
          throw new Error("cycleFilter is not a function");
        }

        const newFilterName = cycleFilter();

        if (typeof onFilterChange === "function") {
          onFilterChange(newFilterName);
        }

        return newFilterName;
      } catch (error) {
        console.error("Error in handleFilterChange:", error);
        throw error;
      }
    };

    // Add to window for Game component to access
    window.cycleWebcamFilter = handleFilterChange;

    return () => {
      // Clean up when component unmounts
      delete window.cycleWebcamFilter;
    };
  }, [cycleFilter, onFilterChange]);

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

  // Add a useEffect to style the canvas directly
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
    <div className="relative w-full h-full" style={{ minHeight: "480px" }}>
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        muted
        playsInline
        autoPlay
        style={{ minHeight: "480px", minWidth: "640px" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full z-10"
        style={{ minHeight: "480px", minWidth: "640px" }}
      />
    </div>
  );
};

export default Webcam;

"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import { Spinner, LoadingScreen, PoseLoadingOverlay } from "@/components/ui";
import useDeviceDetect from "@/hooks/useDeviceDetect";
import {
  cameraManager,
  stopAllCameras as stopAllCamerasUtil,
} from "@/utils/cameraManager";
import { SummaryModal, ExpandedLeaderboardModal } from "@/components/modals";
import { Welcome } from "@/components/game";
import PoseDetectionGuidance from "./PoseDetectionGuidance";
import { UniversalConnectButton } from "@/components/wallet";
import { usePlatform } from "@/contexts/PlatformContext";

import toast from "react-hot-toast";
import { Score } from "@/types";

// Use LazyWebcam for better performance - only loads TensorFlow when needed
const LazyWebcam = dynamic(() => import("./LazyWebcam"), {
  ssr: false,
  loading: () => <Spinner />,
});

// No need to dynamically import ThirdWeb hooks anymore

// Add type declaration for window object
declare global {
  interface Window {
    cycleWebcamFilter?: () => string;
  }
}
// Webcam is now imported at the top of the file

interface GameProps {
  thirdwebAddress?: string;
}

const Game: React.FC<GameProps> = ({ thirdwebAddress }) => {
  const [showWelcome, setShowWelcome] = useState(true);
  // Tutorial state is managed but not displayed in current UI
  const [, setShowTutorial] = useState(true);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [repCount, setRepCount] = useState(0);
  const [mode, setMode] = useState<"pushups" | "squats">("pushups");
  const [showSummary, setShowSummary] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  // Filter state is managed but currently only 'none' is used
  const [, setCurrentFilter] = useState<string>("none");

  // Pose detection guidance state
  const [showPoseGuidance, setShowPoseGuidance] = useState(false);
  const [poseState, setPoseState] = useState({
    hasCamera: false,
    hasPoseDetection: false,
    poseDetected: false,
    isLoading: false,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleStopRef = useRef<() => void>(() => {}); // Initialize with empty function
  const timeLeftRef = useRef(timeLeft); // Add ref to track timeLeft without causing re-renders
  const { isMobile } = useDeviceDetect(); // Use our enhanced device detection hook

  // Safe state for viewport dimensions
  const [viewportDimensions, setViewportDimensions] = useState({
    height: 0,
    width: 0,
  });

  // Get universal wallet context
  const { wallet, user } = usePlatform();
  const { address } = wallet;

  // Use the universal address - no more complex network-specific logic needed!
  const finalAddress = address || thirdwebAddress;

  // Simplified viewport dimensions effect
  useEffect(() => {
    // Safely get viewport dimensions
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setViewportDimensions({
          height: window.innerHeight,
          width: window.innerWidth,
        });
      };

      // Initial measurement
      handleResize();

      // Update on resize
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
      };
    }
  }, []);

  // Log address changes for debugging
  useEffect(() => {
    // Only log in development environment to reduce production noise
    if (process.env.NODE_ENV === "development") {
      console.log("Game: Using universal wallet address:", finalAddress);
    }
  }, [finalAddress]);

  // Store the address in localStorage for persistence (client-side only)
  useEffect(() => {
    if (finalAddress && typeof window !== "undefined") {
      localStorage.setItem("userAddress", finalAddress);
    }
  }, [finalAddress]);

  // Leaderboard data for the expanded modal
  // Using the shared Score type from @/types

  const [pushupLeaderboard] = useState<Score[]>([]);
  const [squatLeaderboard] = useState<Score[]>([]);
  const [displayNames] = useState<Record<string, string>>({});

  const formatTime = (sec: number) => {
    const minutes = Math.floor((120 - sec) / 60);
    const secs = (120 - sec) % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Moved memoized webcam after handler functions are defined

  // Function to start the timer
  const startTimer = () => {
    if (timerRef.current) return; // Don't start if already running

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev <= 1 ? 0 : prev - 1;
        timeLeftRef.current = newTime; // Update ref to keep it in sync
        if (newTime <= 0) {
          // Use the ref to call the latest version of handleStop
          if (handleStopRef.current) {
            handleStopRef.current();
          }
        }
        return newTime;
      });
    }, 1000);
  };

  // Handle rep counting from webcam component
  const handleRepCount = useCallback(
    (count: number) => {
      setRepCount(count);

      // Start the timer on the first rep if it hasn't started yet
      if (count === 1 && started && !timerRef.current) {
        startTimer();
      }

      // Track workout progress
      if (count > 0 && user?.fid) {
        fetch("/api/analytics/engagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: user.fid,
            eventType: "workout_completed",
            metadata: {
              reps: count,
              exerciseMode: mode,
              duration: 120 - timeLeftRef.current, // Use ref instead of state to avoid re-renders
            },
          }),
        }).catch((err) => console.warn("Failed to track workout:", err));
      }
    },
    [started, mode, user?.fid] // Remove timeLeft from dependencies
  );

  // Keep timeLeftRef in sync with timeLeft state
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    if (started) {
      // Ensure tutorial is hidden when game starts
      setShowTutorial(false);

      // Timer will start on first rep, not immediately
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [started]);

  // Enhanced function to aggressively stop all cameras using the camera manager
  const stopAllCameras = useCallback(() => {
    console.log("🛑 Stopping all cameras - using enhanced camera manager");

    // Use the enhanced camera manager for comprehensive cleanup
    const stoppedTracks = stopAllCamerasUtil();

    // Additional cleanup methods (client-side only)
    if (typeof window !== "undefined") {
      // Cancel any animation frames that might be running
      if (window.requestAnimationFrame) {
        const highestId = window.requestAnimationFrame(() => {});
        for (let i = 0; i < highestId; i++) {
          window.cancelAnimationFrame(i);
        }
        console.log("🎬 Cancelled animation frames up to ID:", highestId);
      }

      // Force garbage collection if available (development only)
      if (process.env.NODE_ENV === "development" && "gc" in window) {
        try {
          (window as typeof window & { gc?: () => void }).gc?.();
          console.log("🗑️ Forced garbage collection");
        } catch {
          console.log("Garbage collection not available");
        }
      }
    }

    // Log camera status after cleanup
    const status = cameraManager.getCameraStatus();
    console.log("📊 Camera status after cleanup:", status);

    console.log(
      `🎯 Camera cleanup complete. Stopped ${stoppedTracks} video tracks.`
    );
  }, []);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStarted(false);
    setShowTutorial(false);

    // Log the address state before showing the summary
    console.log("Game: handleStop called with address:", finalAddress);

    // Only show summary if we have an address
    if (finalAddress) {
      setShowSummary(true);
    } else {
      // If no address, show a toast message
      toast.error("Please connect your wallet to submit your score");
      console.error("Please connect your wallet to submit your score");
    }

    // Force camera to stop by accessing the video tracks and stopping them
    stopAllCameras();
  }, [stopAllCameras, finalAddress]);

  // Update the ref whenever handleStop changes
  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]);

  const handleStart = () => {
    setShowWelcome(false);
    setShowTutorial(false); // Hide tutorial when starting
    setShowLoading(true);

    // Reset counters
    setRepCount(0);
    setTimeLeft(120);

    // The LoadingScreen component will automatically transition to started state
    // after its hideDelay time expires via the onComplete callback
  };

  // This useEffect is already handled by the one above
  // Removing duplicate effect

  const handleReset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRepCount(0);
    setTimeLeft(120);
    setStarted(false);
    setShowWelcome(true);
    setShowTutorial(true);
    setShowSummary(false);

    // Also stop the camera when resetting
    stopAllCameras();
  }, [stopAllCameras]);

  const handleModeChange = () => {
    if (!started) {
      // If not started, switch exercise mode
      const newMode = mode === "pushups" ? "squats" : "pushups";
      setMode(newMode);
    } else {
      // When started, we only have the "none" filter option
      // This button now just shows the current mode
      setCurrentFilter("none");
    }
  };

  // Handle filter change from Webcam component
  const handleFilterChange = useCallback((filterName: string) => {
    console.log("Game component received filter change:", filterName);
    setCurrentFilter(filterName);
  }, []);

  // Handle pose detection state changes
  const handlePoseStateChange = useCallback(
    (newState: {
      hasCamera: boolean;
      hasPoseDetection: boolean;
      poseDetected: boolean;
      isLoading: boolean;
    }) => {
      setPoseState(newState);

      // Show guidance when camera starts but pose isn't detected yet
      if (started && newState.hasCamera && !newState.poseDetected) {
        setShowPoseGuidance(true);
      }

      // Hide guidance when pose is detected
      if (newState.poseDetected) {
        setShowPoseGuidance(false);
      }
    },
    [started] // Add 'started' to dependencies as required by ESLint
  );

  // Memoize the webcam component to prevent re-renders when timer updates
  const memoizedWebcam = useMemo(
    () => (
      <LazyWebcam
        mode={mode}
        onRepCount={handleRepCount}
        isActive={started}
        onFilterChange={handleFilterChange}
        onPoseStateChange={handlePoseStateChange}
      />
    ),
    [mode, handleRepCount, started, handleFilterChange, handlePoseStateChange]
  );

  return (
    <>
      <div id="game-container">
        <div id="banner">
          <div className="olympic-rings" aria-label="Olympic Rings">
            <div className="ring blue" />
            <div className="ring black" />
            <div className="ring red" />
            <div className="ring yellow" />
            <div className="ring green" />
          </div>

          <h1>Imperfect Form</h1>
        </div>

        {/* Wallet connection centered at the top */}
        <div id="wallet-connection" className="wallet-connection">
          <div className={finalAddress ? "wallet-connected" : "wallet-prompt"}>
            <UniversalConnectButton
              size="md"
              showProfileWhenConnected={true}
              onConnected={(address) => {
                console.log("Game: Wallet connected with address:", address);
              }}
            />
          </div>
        </div>

        <div id="screen">
          {showWelcome && (
            <div id="welcomeMessage">
              <Welcome onComplete={() => setShowWelcome(false)} />
            </div>
          )}

          {!showWelcome && !started && (
            <div id="instructions" style={{ display: "flex" }}>
              <p>
                a) <span className="button-text start">START</span> = begin
              </p>
              <p>
                b) <span className="button-text stop">STOP</span> = end
              </p>
              <p>
                c) <span className="button-text reset">RESET</span> = restart
              </p>
              <p>d) Have fun!</p>
              <p className="built-by">
                Built by{" "}
                <a
                  href="https://warpcast.com/papa"
                  target="_blank"
                  className="highlight"
                >
                  PAPA
                </a>
              </p>
            </div>
          )}

          {showLoading && (
            <LoadingScreen
              onComplete={() => {
                setShowLoading(false);
                setStarted(true);
              }}
              autoHide={true}
              hideDelay={2000}
            />
          )}

          {started && (
            <>
              {/* On mobile, arrange everything in a flex column with specific heights */}
              {isMobile ? (
                <div
                  className="w-full flex flex-col h-full"
                  style={{
                    minHeight:
                      viewportDimensions.height > 0
                        ? `${viewportDimensions.height * 0.85}px`
                        : "auto",
                  }}
                >
                  {/* Timer and rep counter at the top */}
                  <div className="flex justify-between mb-2 px-2">
                    <div className="text-xl font-bold">
                      {formatTime(timeLeft)}
                    </div>
                    <div className="text-xl font-bold">{repCount}</div>
                  </div>

                  {/* Camera takes most of the available space */}
                  <div
                    id="canvasContainer"
                    aria-label="Game Canvas"
                    className="w-full mx-auto relative border-2 border-yellow-400 flex-grow"
                    style={{
                      flex: "1",
                      minHeight: "50%", // Reduced from 60% to give more flexibility
                      maxWidth: "100%",
                      display: "flex", // Ensure proper flex behavior
                      alignItems: "center", // Center video vertically
                      justifyContent: "center", // Center video horizontally
                    }}
                  >
                    {memoizedWebcam}

                    {/* Pose loading overlay - shows on top of video while pose detection initializes */}
                    <PoseLoadingOverlay
                      poseState={poseState}
                      isVisible={started && !poseState.poseDetected}
                    />
                  </div>
                </div>
              ) : (
                // Desktop layout - use relative positioning to fit in screen container
                <div
                  id="canvasContainer"
                  aria-label="Game Canvas"
                  className="w-full h-full relative"
                >
                  {memoizedWebcam}

                  {/* Pose loading overlay - shows on top of video while pose detection initializes */}
                  <PoseLoadingOverlay
                    poseState={poseState}
                    isVisible={started && !poseState.poseDetected}
                  />
                </div>
              )}
            </>
          )}

          {/* Desktop-only timer and counter - hidden on mobile as they're repositioned */}
          {!isMobile && (
            <>
              <div
                className="timer"
                style={{ display: started ? "block" : "none" }}
                aria-live="polite"
              >
                {formatTime(timeLeft)}
              </div>
              <div
                id="repCounterContainer"
                className="rep-counter-container"
                style={{ display: started ? "block" : "none" }}
              >
                {repCount}
              </div>
            </>
          )}
        </div>

        <div
          id="controls"
          className={`${
            isMobile
              ? "grid grid-cols-2 gap-3 mt-2"
              : "flex justify-between mt-4"
          }`}
          style={{ marginBottom: isMobile ? "8px" : "0" }}
        >
          <button
            id="modeButton"
            className={`py-3 px-4 text-sm sm:text-base touch-manipulation ${
              started ? "" : ""
            }`}
            style={{ minHeight: isMobile ? "50px" : "auto" }}
            aria-label={
              started ? "Current exercise mode" : "Switch exercise mode"
            }
            onClick={handleModeChange}
          >
            {`MODE: ${mode.toUpperCase()}`}
          </button>
          <button
            id="startButton"
            className="py-3 px-4 text-sm sm:text-base touch-manipulation"
            style={{ minHeight: isMobile ? "50px" : "auto" }}
            aria-label="Start game"
            onClick={handleStart}
            disabled={started || showLoading || !finalAddress}
            title={!finalAddress ? "Connect wallet to start" : "Start game"}
          >
            START
          </button>
          <button
            id="stopButton"
            className="py-3 px-4 text-sm sm:text-base touch-manipulation"
            style={{ minHeight: isMobile ? "50px" : "auto" }}
            aria-label="Stop game"
            onClick={handleStop}
            disabled={!started}
          >
            STOP
          </button>
          <button
            id="resetButton"
            className="py-3 px-4 text-sm sm:text-base touch-manipulation"
            style={{ minHeight: isMobile ? "50px" : "auto" }}
            aria-label="Reset game"
            onClick={handleReset}
            disabled={showLoading}
          >
            RESET
          </button>

          {/* Debug button - only visible on mobile devices */}
        </div>
      </div>
      <SummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        repCount={repCount}
        timeLeft={timeLeft}
        mode={mode}
        address={finalAddress}
      />

      {/* Pose Detection Guidance Modal */}
      <PoseDetectionGuidance
        isVisible={showPoseGuidance}
        hasCamera={poseState.hasCamera}
        hasPoseDetection={poseState.hasPoseDetection}
        poseDetected={poseState.poseDetected}
        onDismiss={() => setShowPoseGuidance(false)}
      />

      {/* Expanded Leaderboard Modal */}
      <ExpandedLeaderboardModal
        pushupLeaderboard={pushupLeaderboard}
        squatLeaderboard={squatLeaderboard}
        displayNames={displayNames}
        isOpen={showExpandedLeaderboard}
        onClose={() => setShowExpandedLeaderboard(false)}
      />
    </>
  );
};

export default Game;

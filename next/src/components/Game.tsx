"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Spinner from "@/components/Spinner";
import SummaryModal from "@/components/SummaryModal";
import ExpandedLeaderboardModal from "@/components/ExpandedLeaderboardModal";
import Welcome from "@/components/Welcome";
import LoadingScreen from "@/components/LoadingScreen";
import ConnectWalletButton from "@/components/ConnectWallet";
import ChainSelector from "@/components/ChainSelector";
import { useAddress } from "@thirdweb-dev/react";

// Add type declaration for window object
declare global {
  interface Window {
    cycleWebcamFilter?: () => string;
  }
}
const Webcam = dynamic(() => import("./Webcam"), {
  ssr: false,
  loading: () => <Spinner />,
});

const Game: React.FC = () => {
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleStopRef = useRef<() => void>(() => {}); // Initialize with empty function

  // Get wallet address from ThirdWeb
  const address = useAddress();

  // Leaderboard data for the expanded modal
  // Define Score type to replace any[]
  type Score = {
    user: string;
    score: number;
    network: "polygon" | "base";
    displayName?: string;
  };

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

  // Function to start the timer
  const startTimer = () => {
    if (timerRef.current) return; // Don't start if already running

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Use the ref to call the latest version of handleStop
          if (handleStopRef.current) {
            handleStopRef.current();
          }
          return 0;
        }
        return prev - 1;
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
    },
    [started]
  );

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

  // Function to aggressively stop all cameras
  const stopAllCameras = useCallback(() => {
    // Method 1: Stop all video tracks from video elements
    const videoElements = document.getElementsByTagName("video");
    if (videoElements.length > 0) {
      for (let i = 0; i < videoElements.length; i++) {
        const video = videoElements[i];
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          const tracks = stream.getTracks();
          tracks.forEach((track) => {
            track.stop();
            console.log("Stopped track:", track.kind, track.id);
          });
          video.srcObject = null;
          video.pause();
        }
      }
    }

    // Method 2: Stop all media tracks from all devices
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => {
          track.stop();
          console.log("Stopped additional track:", track.kind, track.id);
        });
      })
      .catch(() => console.log("No additional media tracks to stop"));

    // Method 3: Cancel any animation frames that might be running
    if (window.requestAnimationFrame) {
      const highestId = window.requestAnimationFrame(() => {});
      for (let i = 0; i < highestId; i++) {
        window.cancelAnimationFrame(i);
      }
    }
  }, []);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStarted(false);
    setShowTutorial(false);
    setShowSummary(true);

    // Force camera to stop by accessing the video tracks and stopping them
    stopAllCameras();
  }, [stopAllCameras]);

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
  const handleFilterChange = (filterName: string) => {
    console.log("Game component received filter change:", filterName);
    setCurrentFilter(filterName);
  };

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
          {!address ? (
            <div className="wallet-prompt">
              <ConnectWalletButton />
            </div>
          ) : (
            <div className="wallet-connected">
              <ConnectWalletButton />
              <ChainSelector />
            </div>
          )}
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
                a) Press <span className="button-text start">START</span> to
                begin
              </p>
              <p>
                b) Press <span className="button-text stop">STOP</span> to end
              </p>
              <p>
                c) Press <span className="button-text reset">RESET</span> to
                start again
              </p>
              <p>d) Try your best, have fun!</p>
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
            <div
              id="canvasContainer"
              aria-label="Game Canvas"
              style={{
                width: "100%",
                height: "480px",
                maxWidth: "640px",
                margin: "0 auto",
                position: "relative",
                border: "2px solid yellow",
              }}
            >
              <Webcam
                mode={mode}
                onRepCount={handleRepCount}
                isActive={started}
                onFilterChange={handleFilterChange}
              />
            </div>
          )}

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
        </div>

        <div id="controls">
          <button
            id="modeButton"
            className={started ? "" : ""}
            aria-label={
              started ? "Current exercise mode" : "Switch exercise mode"
            }
            onClick={handleModeChange}
          >
            {`MODE: ${mode.toUpperCase()}`}
          </button>
          <button
            id="startButton"
            aria-label="Start game"
            onClick={handleStart}
            disabled={started || showLoading || !address}
            title={!address ? "Connect wallet to start" : "Start game"}
          >
            START
          </button>
          <button
            id="stopButton"
            aria-label="Stop game"
            onClick={handleStop}
            disabled={!started}
          >
            STOP
          </button>
          <button
            id="resetButton"
            aria-label="Reset game"
            onClick={handleReset}
            disabled={showLoading}
          >
            RESET
          </button>
        </div>
      </div>
      <SummaryModal
        open={showSummary}
        onClose={() => setShowSummary(false)}
        repCount={repCount}
        timeLeft={timeLeft}
        mode={mode}
        address={address}
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

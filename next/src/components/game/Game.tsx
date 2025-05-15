"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Spinner, LoadingScreen } from "@/components/ui";
import useDeviceDetect from "@/hooks/useDeviceDetect";
import { SummaryModal, ExpandedLeaderboardModal } from "@/components/modals";
import { Welcome } from "@/components/game";
import { WalletButton } from "@/components/wallet";
import { useNetwork } from "@/contexts/NetworkContext";
import { useAccount as useWagmiAccount } from "wagmi";
import toast from "react-hot-toast";
import { Score } from "@/types";

// Dynamically import Webcam component to avoid SSR issues with face detection
const Webcam = dynamic(() => import("./Webcam"), {
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleStopRef = useRef<() => void>(() => {}); // Initialize with empty function
  const { isMobile } = useDeviceDetect(); // Use our new device detection hook

  // Get network from context
  const { network, setNetwork } = useNetwork();

  // For Wagmi (Base), we can always call this hook
  const wagmiAccount = useWagmiAccount();
  const wagmiAddress = wagmiAccount?.address;

  // Get address based on the selected network
  let address: string | undefined = undefined;

  // For Wagmi (Base)
  if (network === "base") {
    try {
      address = wagmiAddress;
    } catch {
      // Ignoring error in render cycle
    }
  }

  // For ThirdWeb (Polygon, Monad, Celo), use the address passed as prop
  if (network === "polygon" || network === "monad" || network === "celo") {
    // If thirdwebAddress is provided as a prop, use it
    if (thirdwebAddress) {
      address = thirdwebAddress;
    }
    // Otherwise, check localStorage for a stored address
    else {
      const storedAddress = localStorage.getItem("userAddress");
      if (storedAddress) {
        address = storedAddress;
      }
    }
  }

  // Check for chain ID and force the correct network
  useEffect(() => {
    // Check if we have a chain ID that indicates Monad testnet
    const chainId = localStorage.getItem("lastChainId");
    if (chainId === "10143" && network !== "monad") {
      console.log(
        "Game: Detected Monad testnet chain ID, forcing network to monad"
      );
      setNetwork("monad");
      // No reload - just update the context
    }
  }, [network, setNetwork]);

  // Move all logging to a useEffect to prevent excessive re-renders
  useEffect(() => {
    // Only log in development environment to reduce production noise
    if (process.env.NODE_ENV === "development") {
      if (network === "base") {
        console.log("Game: Using Wagmi address for Base network:", address);
      } else if (
        network === "polygon" ||
        network === "monad" ||
        network === "celo"
      ) {
        if (thirdwebAddress) {
          console.log(
            `Game: Using ThirdWeb address from prop for ${network} network:`,
            address
          );
        } else if (address) {
          console.log(
            `Game: Using ThirdWeb address from localStorage for ${network} network:`,
            address
          );
        } else {
          console.log(
            `Game: No ThirdWeb address available for ${network} network`
          );
        }
      }

      // Log the final address being used
      console.log(
        "Game: Final address being used:",
        address,
        "Network:",
        network
      );
    }
  }, [address, network, thirdwebAddress]); // Only re-run when these values change

  // Store the address in localStorage for persistence
  useEffect(() => {
    if (address) {
      localStorage.setItem("userAddress", address);
    }
  }, [address]);

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

    // Log the address state before showing the summary
    console.log("Game: handleStop called with address:", address);

    // Only show summary if we have an address
    if (address) {
      setShowSummary(true);
    } else {
      // If no address, show a toast message
      toast.error("Please connect your wallet to submit your score");
      console.error("Please connect your wallet to submit your score");
    }

    // Force camera to stop by accessing the video tracks and stopping them
    stopAllCameras();
  }, [stopAllCameras, address]);

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
          <div className={address ? "wallet-connected" : "wallet-prompt"}>
            <WalletButton />
            {address && (
              <button
                className="reset-wallet-button"
                onClick={() => {
                  // Navigate to dedicated wallet selection page
                  window.location.href = "/select-wallet";
                }}
                title="Reset wallet connection"
              >
                Reset Wallet
              </button>
            )}
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
              className="w-full mx-auto relative border-2 border-yellow-400"
              style={{
                height: isMobile ? 'auto' : '480px',
                maxWidth: '640px',
                aspectRatio: isMobile ? '4/3' : 'auto',
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

        <div id="controls" className={`${isMobile ? 'grid grid-cols-2 gap-3 mt-4' : 'flex justify-between mt-4'}`}>
          <button
            id="modeButton"
            className={`py-3 px-4 text-sm sm:text-base touch-manipulation ${started ? '' : ''}`}
            style={{ minHeight: isMobile ? '50px' : 'auto' }}
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
            style={{ minHeight: isMobile ? '50px' : 'auto' }}
            aria-label="Start game"
            onClick={handleStart}
            disabled={started || showLoading || !address}
            title={!address ? "Connect wallet to start" : "Start game"}
          >
            START
          </button>
          <button
            id="stopButton"
            className="py-3 px-4 text-sm sm:text-base touch-manipulation"
            style={{ minHeight: isMobile ? '50px' : 'auto' }}
            aria-label="Stop game"
            onClick={handleStop}
            disabled={!started}
          >
            STOP
          </button>
          <button
            id="resetButton"
            className="py-3 px-4 text-sm sm:text-base touch-manipulation"
            style={{ minHeight: isMobile ? '50px' : 'auto' }}
            aria-label="Reset game"
            onClick={handleReset}
            disabled={showLoading}
          >
            RESET
          </button>
        </div>
      </div>
      <SummaryModal
        isOpen={showSummary}
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

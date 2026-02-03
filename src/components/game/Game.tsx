'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Spinner, UnifiedLoader } from '@/components/ui';
import useDeviceDetect from '@/hooks/useDeviceDetect';
import { useLoadingPhase } from '@/hooks/useLoadingPhase';
import { cameraManager, stopAllCameras as stopAllCamerasUtil } from '@/utils/cameraManager';
import { SummaryModal, ExpandedLeaderboardModal } from '@/components/modals';
// Welcome component consolidated into InitializationScreen - import removed
import { UniversalConnectButton } from '@/components/wallet';
import { usePlatform } from '@/contexts/PlatformContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import ModeSwitch from './ModeSwitch';
import { AgentInsightTray } from './AgentInsightTray';
import IntroDialog from '@/components/auth/IntroDialog';

import { useFullscreen } from '../../hooks/useFullscreen';
import FullscreenExitButton from '../ui/FullscreenExitButton';
import { SplitFlapInstructions } from '../ui/SplitFlapText';
import useOrientationLock from '../../hooks/useOrientationLock';
import { useUserStats } from '../../hooks/useUserStats';
import { isFarcasterMiniApp } from '../../utils/farcasterMiniApp';

import { Score } from '@/types';

// Use LazyWebcam for better performance - only loads TensorFlow when needed
const LazyWebcam = dynamic(() => import('./LazyWebcam'), {
  ssr: false,
  loading: () => <Spinner />,
});

// Add type declaration for window object
declare global {
  interface Window {
    cycleWebcamFilter?: () => string;
  }
}

interface GameProps {
  thirdwebAddress?: string;
  profileSearchTarget?: string;
}

const Game: React.FC<GameProps> = ({ thirdwebAddress, profileSearchTarget }) => {
  // --- Fullscreen integration ---
  const gameRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(gameRef);

  const [autoFs, setAutoFs] = useState<boolean>(true);

  const [currentMode, setCurrentMode] = useState<
    'instructions' | 'settings' | 'profile' | 'memory' | 'memory-detail' | 'profile-search'
  >('instructions');

  // Profile search state
  const [targetUser, setTargetUser] = useState<string | undefined>(undefined);

  // Swipe gesture handling for mobile
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const { isMobile } = useDeviceDetect();

  const minSwipeDistance = 80;
  const maxVerticalSwipe = 120;

  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile) return;
      touchEndRef.current = null;
      touchStartRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    },
    [isMobile]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !touchStartRef.current) return;
      touchEndRef.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
    },
    [isMobile]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !touchStartRef.current || !touchEndRef.current) return;

    const distanceX = touchStartRef.current.x - touchEndRef.current.x;
    const distanceY = touchStartRef.current.y - touchEndRef.current.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isVerticalSwipe = Math.abs(distanceY) > maxVerticalSwipe;

    // Don't trigger swipe if there's significant vertical movement
    if (isVerticalSwipe) return;

    const modes: (
      | 'instructions'
      | 'settings'
      | 'profile'
      | 'memory'
      | 'memory-detail'
      | 'profile-search'
    )[] = ['instructions', 'settings', 'profile', 'memory', 'memory-detail', 'profile-search'];
    const currentIndex = modes.indexOf(currentMode);

    if (isLeftSwipe && currentIndex < modes.length - 1) {
      // Swipe left → next mode
      setCurrentMode(modes[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      // Swipe right → previous mode
      setCurrentMode(modes[currentIndex - 1]);
    }
  }, [isMobile, currentMode]);

  const { lockLandscape, unlock } = useOrientationLock();
  const [isLandscapeLocked, setIsLandscapeLocked] = useState(false);

  // Get universal wallet context first
  const { wallet, user } = usePlatform();
  const { address } = wallet;

  // Get onboarding context
  const { setShouldShowTour } = useOnboarding();

  // Use the universal address - no more complex network-specific logic needed!
  const finalAddress = address || thirdwebAddress;

  // Smart default mode based on user state
  const getDefaultMode = useCallback((): 'instructions' | 'settings' | 'profile' => {
    if (finalAddress) return 'profile'; // Logged in → Show progress
    return 'instructions'; // Anonymous → Show instructions
  }, [finalAddress]);

  // Fetch user statistics from leaderboard data
  const { formattedStats, isLoading: statsLoading } = useUserStats(finalAddress);

  // Handle profile search
  const handleProfileSearch = useCallback((identifier: string) => {
    console.log('🔍 Searching for profile:', identifier);
    setTargetUser(identifier);
    setCurrentMode('profile-search');
  }, []);

  const handleWalletConnected = useCallback((address: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Game: Wallet connected with address:', address);
    }
  }, []);

  // Handle external profile search target (from leaderboard clicks)
  useEffect(() => {
    if (profileSearchTarget) {
      console.log('🔍 External profile search triggered:', profileSearchTarget);
      setTargetUser(profileSearchTarget);
      setCurrentMode('profile-search');
    }
  }, [profileSearchTarget]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pref = window.localStorage.getItem('prefAutoFullscreen');
      setAutoFs(pref === null ? true : pref === 'true');
    }
  }, []);

  // Initialize mode based on user state
  useEffect(() => {
    setCurrentMode(getDefaultMode());
  }, [getDefaultMode]);

  // Update mode when user login state changes
  useEffect(() => {
    const newDefaultMode = getDefaultMode();
    if (currentMode === 'instructions' && newDefaultMode === 'profile') {
      setCurrentMode('profile'); // Switch to profile when user logs in
    } else if (currentMode === 'profile' && newDefaultMode === 'instructions') {
      setCurrentMode('instructions'); // Switch to instructions when user logs out
    }
  }, [finalAddress, currentMode, getDefaultMode]);

  // Welcome component consolidated into InitializationScreen - showWelcome removed
  // Tutorial state is managed but not displayed in current UI
  const [, setShowTutorial] = useState(true);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [repCount, setRepCount] = useState(0);
  const [mode, setMode] = useState<'pushups' | 'squats'>('pushups');
  const [showSummary, setShowSummary] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);

  // Real-time biomechanical state for AI Agent feedback
  const [metrics, setMetrics] = useState<import('@/types/mediapipe').BiomechanicalState | null>(
    null
  );
  // Intro dialog state - now finalAddress is available
  const [showIntroDialog, setShowIntroDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const skip = localStorage.getItem('imf_skipWalletIntro');
      // Don't show if user has wallet connected or has skipped
      return !finalAddress && skip !== '1';
    }
    return false;
  });

  // Update intro dialog visibility when wallet connection changes
  useEffect(() => {
    if (finalAddress) {
      // Hide intro dialog if user connects wallet
      setShowIntroDialog(false);
    }
  }, [finalAddress]);

  // Loading overlay for desktop pose detection
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

  // Pose detection state
  const [poseState, setPoseState] = useState({
    hasCamera: false,
    hasPoseDetection: false,
    poseDetected: false,
    isLoading: false,
  });
  const [detectionProgress, setDetectionProgress] = useState<{
    phase: 'initial' | 'tensorflow-init' | 'model-download' | 'warmup' | 'ready';
    message: string;
    percentage: number;
  } | null>(null);

  // Handle pose detection progress updates
  const handleDetectionProgress = useCallback(
    (progress: {
      phase: 'initial' | 'tensorflow-init' | 'model-download' | 'warmup' | 'ready';
      message: string;
      percentage: number;
    }) => {
      console.log('⚙️  Pose detection progress:', progress);
      if (progress.phase !== 'ready') {
        setShowLoadingOverlay(true);
      } else {
        setShowLoadingOverlay(false);
      }
      setDetectionProgress(progress);
    },
    []
  );

  // Handle pose detection state changes
  const handlePoseStateChange = useCallback(
    (state: {
      hasCamera: boolean;
      hasPoseDetection: boolean;
      poseDetected: boolean;
      isLoading: boolean;
    }) => {
      // Only update showLoadingOverlay if it's actually changing to avoid unnecessary re-renders
      setPoseState((prev) => {
        // Comparison to avoid state updates if nothing changed
        if (
          prev.isLoading === state.isLoading &&
          prev.hasCamera === state.hasCamera &&
          prev.hasPoseDetection === state.hasPoseDetection &&
          prev.poseDetected === state.poseDetected
        ) {
          return prev;
        }
        return state;
      });
    },
    []
  );

  const handleMetrics = useCallback((state: import('@/types/mediapipe').BiomechanicalState) => {
    setMetrics(state);
  }, []);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleStopRef = useRef<() => void>(() => {}); // Initialize with empty function
  const timeLeftRef = useRef(timeLeft); // Add ref to track timeLeft without causing re-renders

  // Check if fullscreen is available in current context (not restricted by iframe)
  const isFullscreenAvailable = useMemo(() => {
    if (typeof window === 'undefined') return false;

    // Check if we're in a Farcaster Mini App (iframe context)
    const inFarcaster = isFarcasterMiniApp();

    // Check if fullscreen API is available and not restricted
    const hasFullscreenAPI = !!(
      document.fullscreenEnabled ||
      (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ||
      (document as Document & { mozFullScreenEnabled?: boolean }).mozFullScreenEnabled ||
      (document as Document & { msFullscreenEnabled?: boolean }).msFullscreenEnabled
    );

    // In Farcaster Mini Apps, fullscreen is typically restricted
    // unless the iframe has allowfullscreen attribute
    if (inFarcaster) {
      // Try to detect if fullscreen is actually allowed
      // This is a heuristic - we can't definitively know without trying
      try {
        // Check if we can access the fullscreen API without throwing
        const element = document.documentElement;
        const canRequest = !!(
          element.requestFullscreen ||
          (
            element as HTMLElement & {
              webkitRequestFullscreen?: () => Promise<void>;
            }
          ).webkitRequestFullscreen ||
          (
            element as HTMLElement & {
              mozRequestFullScreen?: () => Promise<void>;
            }
          ).mozRequestFullScreen ||
          (
            element as HTMLElement & {
              msRequestFullscreen?: () => Promise<void>;
            }
          ).msRequestFullscreen
        );
        return hasFullscreenAPI && canRequest;
      } catch {
        return false;
      }
    }

    return hasFullscreenAPI;
  }, []);

  // Safe state for viewport dimensions
  const [viewportDimensions, setViewportDimensions] = useState({
    height: 0,
    width: 0,
  });

  // Simplified viewport dimensions effect
  useEffect(() => {
    // Safely get viewport dimensions
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setViewportDimensions({
          height: window.innerHeight,
          width: window.innerWidth,
        });
      };

      // Initial measurement
      handleResize();

      // Update on resize
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      // Handle profile search events from leaderboard clicks
      const handleProfileSearchEvent = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.identifier) {
          console.log('🔍 Profile search event received:', customEvent.detail.identifier);
          handleProfileSearch(customEvent.detail.identifier);
        }
      };

      window.addEventListener('profileSearch', handleProfileSearchEvent);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        window.removeEventListener('profileSearch', handleProfileSearchEvent);
      };
    }
  }, []);

  // Log address changes for debugging
  useEffect(() => {
    // Only log in development environment to reduce production noise
    if (process.env.NODE_ENV === 'development') {
      console.log('Game: Using universal wallet address:', finalAddress);
    }
  }, [finalAddress]);

  // Store the address in localStorage for persistence (client-side only)
  useEffect(() => {
    if (finalAddress && typeof window !== 'undefined') {
      localStorage.setItem('userAddress', finalAddress);
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
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        fetch('/api/analytics/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: user.fid,
            eventType: 'workout_completed',
            metadata: {
              reps: count,
              exerciseMode: mode,
              duration: 120 - timeLeftRef.current, // Use ref instead of state to avoid re-renders
            },
          }),
        }).catch((err) => console.warn('Failed to track workout:', err));
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
    console.log('🛑 Stopping all cameras - using enhanced camera manager');

    // Use the enhanced camera manager for comprehensive cleanup
    const stoppedTracks = stopAllCamerasUtil();

    // Additional cleanup methods (client-side only)
    if (typeof window !== 'undefined') {
      // Cancel any animation frames that might be running
      if (window.requestAnimationFrame) {
        const highestId = window.requestAnimationFrame(() => {});
        for (let i = 0; i < highestId; i++) {
          window.cancelAnimationFrame(i);
        }
        console.log('🎬 Cancelled animation frames up to ID:', highestId);
      }

      // Force garbage collection if available (development only)
      if (process.env.NODE_ENV === 'development' && 'gc' in window) {
        try {
          (window as typeof window & { gc?: () => void }).gc?.();
          console.log('🗑️ Forced garbage collection');
        } catch {
          console.log('Garbage collection not available');
        }
      }
    }

    // Log camera status after cleanup
    const status = cameraManager.getCameraStatus();
    console.log('📊 Camera status after cleanup:', status);

    console.log(`🎯 Camera cleanup complete. Stopped ${stoppedTracks} video tracks.`);
  }, []);

  const handleStop = useCallback(() => {
    exitFullscreen();
    unlock();
    setIsLandscapeLocked(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Stagger the transitions: first hide the game, then show summary
    setStarted(false);
    setShowTutorial(false);

    // Always show summary; SummaryModal will prompt for wallet connection if needed
    console.log('Game: handleStop called with address:', finalAddress);
    console.log('Game: Opening SummaryModal with staggered transition');

    // Defer summary display by 100ms to allow game fade-out first
    const summaryTimer = setTimeout(() => {
      setShowSummary(true);
    }, 100);

    // Force camera to stop by accessing the video tracks and stopping them
    stopAllCameras();

    return () => clearTimeout(summaryTimer);
  }, [stopAllCameras, finalAddress, exitFullscreen, unlock]);

  // Update the ref whenever handleStop changes
  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]);

  const handleStart = () => {
    // Use device detection hook's isMobile value
    // Only attempt fullscreen if it's available in the current context
    if (isMobile && autoFs && isFullscreenAvailable) {
      enterFullscreen(); // Must be synchronous with user gesture
    } else if (isMobile && autoFs && !isFullscreenAvailable) {
      // Log for debugging - fullscreen not available (likely Farcaster Mini App)
      console.log(
        'Fullscreen requested but not available in current context (likely iframe restriction)'
      );
    }
    if (isMobile && (mode === 'pushups' || mode === 'squats')) {
      lockLandscape();
      setIsLandscapeLocked(true);
    }

    // Welcome component consolidated into InitializationScreen - setShowWelcome removed
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
    exitFullscreen();
    unlock();
    setIsLandscapeLocked(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRepCount(0);
    setTimeLeft(120);
    setStarted(false);
    // Welcome component consolidated into InitializationScreen - no need to reset welcome state
    setShowTutorial(true);
    setShowSummary(false);

    // Also stop the camera when resetting
    stopAllCameras();
  }, [stopAllCameras, exitFullscreen, unlock]);

  // handleModeChange function removed as it's no longer used
  // Mode switching is now handled directly by ModeSwitch component

  // Handle filter change removed (consolidated)

  // Memoize the webcam component to prevent re-renders when timer updates
  const memoizedWebcam = useMemo(
    () => (
      <LazyWebcam
        mode={mode}
        onRepCount={handleRepCount}
        isActive={started}
        onPoseStateChange={handlePoseStateChange}
        onDetectionProgress={handleDetectionProgress}
        onMetrics={handleMetrics}
      />
    ),
    [mode, handleRepCount, started, handlePoseStateChange, handleDetectionProgress, handleMetrics]
  );

  // DRY: Single source of truth for loading phase
  const loadingPhase = useLoadingPhase(poseState);

  return (
    <>
      {/* Loading overlay for desktop pose detection */}

      <div
        id="game-container"
        ref={gameRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={isMobile ? 'touch-manipulation' : ''}
      >
        {/* Top-right control buttons - orientation lock only */}
        <div className="absolute top-2 right-2 flex gap-1 z-20">
          {/* Orientation Lock Toggle - Mobile Only */}
          {isMobile && (
            <button
              onClick={() => {
                if (isLandscapeLocked) {
                  unlock();
                  setIsLandscapeLocked(false);
                } else {
                  lockLandscape();
                  setIsLandscapeLocked(true);
                }
              }}
              className="bg-white/10 backdrop-blur-sm rounded-lg p-2 hover:bg-white/20 transition-colors touch-manipulation orientation-lock-indicator touch-target"
              aria-label={isLandscapeLocked ? 'Unlock orientation' : 'Lock landscape orientation'}
              title={isLandscapeLocked ? 'Unlock orientation' : 'Lock landscape orientation'}
            >
              <span className="text-white text-lg">{isLandscapeLocked ? '🔒' : '🔓'}</span>
            </button>
          )}

          {/* Fullscreen Exit Button (only shown when in fullscreen) */}
          {isFullscreen && (
            <FullscreenExitButton
              isFullscreen={isFullscreen}
              onExit={() => {
                exitFullscreen();
                setAutoFs(false);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('prefAutoFullscreen', 'false');
                }
              }}
            />
          )}
        </div>

        <div id="banner" className="mobile-banner">
          <div className="olympic-rings mobile-olympic-rings" aria-label="Olympic Rings">
            <div className="ring blue" />
            <div className="ring black" />
            <div className="ring red" />
            <div className="ring yellow" />
            <div className="ring green" />
          </div>

          <h1 className="mobile-banner">Imperfect Form</h1>
        </div>

        {/* Wallet connection with fullscreen toggle */}
        <div id="wallet-connection" className="wallet-connection mobile-wallet-connection">
          <div
            className={`flex items-center gap-2 ${finalAddress ? 'wallet-connected' : 'wallet-prompt'}`}
          >
            <UniversalConnectButton
              size="md"
              showProfileWhenConnected={true}
              currentMode={currentMode}
              onModeChange={setCurrentMode}
              workoutStarted={started}
              onConnected={handleWalletConnected}
            />
            {/* Fullscreen Toggle - alongside connect button */}
            {isFullscreenAvailable && (
              <button
                onClick={() => {
                  if (isFullscreen) {
                    exitFullscreen();
                  } else {
                    enterFullscreen();
                  }
                }}
                className="bg-white/10 backdrop-blur-sm rounded-lg p-2 hover:bg-white/20 transition-colors touch-manipulation"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                <span className="text-white text-lg">{isFullscreen ? '⛶' : '⛶'}</span>
              </button>
            )}
          </div>
        </div>

        <div id="screen">
          {/* Welcome component consolidated into InitializationScreen */}

          {!started && (
            <div className={showLoading ? 'selection-screen-exit' : ''}>
              <SplitFlapInstructions
                mode={currentMode}
                onModeChange={setCurrentMode}
                autoFs={autoFs}
                setAutoFs={setAutoFs}
                isFullscreenAvailable={isFullscreenAvailable}
                formattedStats={formattedStats}
                isLoadingStats={statsLoading}
                targetUser={targetUser}
                onProfileSearch={handleProfileSearch}
              />
            </div>
          )}

          {showLoading && (
            <UnifiedLoader
              phase="initial"
              isVisible={showLoading}
              isOverlay={false}
              onComplete={() => {
                setShowLoading(false);
                setStarted(true);
              }}
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
                        : 'auto',
                  }}
                >
                  {/* Timer and rep counter at the top */}
                  <div className="flex justify-between mb-2 px-2">
                    <div className="text-xl font-bold">{formatTime(timeLeft)}</div>
                    <div className="text-xl font-bold">{repCount}</div>
                  </div>

                  {/* Camera takes most of the available space */}
                  <div
                    id="canvasContainer"
                    aria-label="Game Canvas"
                    className="w-full mx-auto relative border-2 border-yellow-400 flex-grow"
                    style={{
                      flex: '1',
                      minHeight: '50%', // Reduced from 60% to give more flexibility
                      maxWidth: '100%',
                      display: 'flex', // Ensure proper flex behavior
                      alignItems: 'center', // Center video vertically
                      justifyContent: 'center', // Center video horizontally
                    }}
                  >
                    {memoizedWebcam}

                    {/* Pose loading overlay - shows on top of video while pose detection initializes */}
                    {/* Show while loading pose detection or when camera is ready but pose not detected yet */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <UnifiedLoader
                        phase={
                          !poseState.hasCamera
                            ? 'camera'
                            : !poseState.hasPoseDetection
                              ? 'ai'
                              : !poseState.poseDetected
                                ? 'positioning'
                                : 'ready'
                        }
                        progress={detectionProgress?.percentage}
                        title={
                          detectionProgress?.phase === 'tensorflow-init' ||
                          detectionProgress?.phase === 'model-download'
                            ? 'Loading AI Engine'
                            : undefined
                        }
                        subtitle={detectionProgress?.message}
                        isVisible={
                          started && (!poseState.hasPoseDetection || !poseState.poseDetected)
                        }
                        isOverlay={true}
                      />
                    </div>

                    {/* Debug: Show overlay visibility state */}
                    {process.env.NODE_ENV === 'development' &&
                      started &&
                      !poseState.poseDetected && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white text-xs p-2 rounded z-50">
                          Debug: Overlay visible (started={started.toString()}, poseDetected=
                          {poseState.poseDetected.toString()})
                        </div>
                      )}
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

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <UnifiedLoader
                      phase={
                        !poseState.hasCamera
                          ? 'camera'
                          : !poseState.hasPoseDetection
                            ? 'ai'
                            : !poseState.poseDetected
                              ? 'positioning'
                              : 'ready'
                      }
                      progress={detectionProgress?.percentage}
                      title={
                        detectionProgress?.phase === 'tensorflow-init' ||
                        detectionProgress?.phase === 'model-download'
                          ? 'Loading AI Engine'
                          : undefined
                      }
                      subtitle={detectionProgress?.message}
                      isVisible={
                        started && (!poseState.hasPoseDetection || !poseState.poseDetected)
                      }
                      isOverlay={true}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Desktop-only timer and counter - hidden on mobile as they're repositioned */}
          {!isMobile && (
            <>
              <div
                className="timer"
                style={{ display: started ? 'block' : 'none' }}
                aria-live="polite"
              >
                {formatTime(timeLeft)}
              </div>
              <div
                id="repCounterContainer"
                className="rep-counter-container"
                style={{ display: started ? 'block' : 'none' }}
              >
                {repCount}
              </div>
            </>
          )}
        </div>

        <div
          id="controls"
          className={`${isMobile ? 'mobile-controls' : 'mt-4'} controls-container`}
          style={{ marginBottom: isMobile ? '8px' : '0' }}
        >
          {started ? (
            <div className="controls-enter w-full flex gap-4 items-center">
              <div className="flex-grow">
                <AgentInsightTray metrics={metrics} mode={mode} />
              </div>
              <button
                id="stopButton"
                className="py-3 px-6 text-sm sm:text-base touch-manipulation font-bold mobile-controls-button touch-target stop-button-discrete"
                aria-label="Stop game"
                onClick={handleStop}
              >
                STOP
              </button>
            </div>
          ) : (
            <div
              className={`flex justify-between w-full h-full items-center controls-enter ${showLoading ? 'controls-exit' : ''}`}
            >
              <ModeSwitch
                value={mode}
                disabled={started}
                onChange={setMode}
                className={isMobile ? 'mobile-mode-switch' : ''}
              />
              <div className="flex gap-2">
                <button
                  id="startButton"
                  className="py-3 px-4 text-sm sm:text-base touch-manipulation font-bold mobile-controls-button touch-target"
                  style={{ minHeight: isMobile ? '50px' : 'auto' }}
                  aria-label="Start game"
                  onClick={handleStart}
                  disabled={started || showLoading || !finalAddress}
                  title={
                    !finalAddress
                      ? 'Sign in to start'
                      : started
                        ? 'Game already started'
                        : 'Start game'
                  }
                >
                  START
                </button>
                <button
                  id="resetButton"
                  className="py-3 px-4 text-sm sm:text-base touch-manipulation font-bold mobile-controls-button touch-target"
                  style={{ minHeight: isMobile ? '50px' : 'auto' }}
                  aria-label="Reset game"
                  onClick={handleReset}
                  disabled={showLoading}
                >
                  RESET
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showIntroDialog && (
        <IntroDialog
          open={showIntroDialog}
          onOpenChange={(open) => {
            setShowIntroDialog(open);
            if (!open) {
              // Trigger tour after intro dialog is closed
              setTimeout(() => setShouldShowTour(true), 500);
            }
          }}
          onFarcaster={() => {
            // Placeholder: Open farcaster auth, then hide dialog
            window.open('/api/auth/farcaster', '_self');
            setShowIntroDialog(false);
            // Trigger tour after auth flow
            setTimeout(() => setShouldShowTour(true), 1000);
          }}
          onWallet={() => {
            // Placeholder: Simulate connect, then hide dialog
            setShowIntroDialog(false);
            // Trigger tour after wallet connection
            setTimeout(() => setShouldShowTour(true), 500);
          }}
          onSkip={() => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('imf_skipWalletIntro', '1');
              // Dispatch storage event to update onboarding context
              window.dispatchEvent(
                new StorageEvent('storage', {
                  key: 'imf_skipWalletIntro',
                  newValue: '1',
                })
              );
            }
            setShowIntroDialog(false);
            // Trigger tour after skip
            setTimeout(() => setShouldShowTour(true), 500);
          }}
        />
      )}

      <SummaryModal
        isOpen={showSummary}
        onClose={() => {
          console.log('Game: Closing SummaryModal');
          setShowSummary(false);
        }}
        onViewLeaderboard={() => {
          console.log('Game: Closing SummaryModal and opening Leaderboard');
          setShowSummary(false);
          setShowExpandedLeaderboard(true);
        }}
        repCount={repCount}
        timeLeft={timeLeft}
        mode={mode}
        address={finalAddress}
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

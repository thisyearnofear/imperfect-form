'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { UnifiedLoader } from '@/components/ui';
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
import useSwipeGesture from '@/hooks/useSwipeGesture';
import { GameControls } from './GameControls';

import IntroDialog from '@/components/auth/IntroDialog';
import { GameHUD, RepFeedbackOverlay } from './GameHUD';
import { GameLoadingOverlay, DebugOverlay } from './GameOverlay';

import { useFullscreen } from '../../hooks/useFullscreen';
import FullscreenExitButton from '../ui/FullscreenExitButton';
import { SplitFlapInstructions } from '../ui/SplitFlapText';
import useOrientationLock from '../../hooks/useOrientationLock';
import { useUserStats } from '../../hooks/useUserStats';
import { useXpProgress } from '../../hooks/useXpProgress';
import { isFarcasterMiniApp } from '../../utils/farcasterMiniApp';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import {
  saveLocalWorkout,
  getPersonalBestWorkout,
  getWorkoutTrace,
  saveWorkoutTrace,
} from '@/services/integrations/WorkoutDataAdapter';
import { ghostService } from '@/services/GhostService';
import { getChampionTrace, isChampion } from '@/constants/championTraces';

import { Score } from '@/types';

// Use LazyWebcam for better performance - only loads TensorFlow when needed
const LazyWebcam = dynamic(() => import('./LazyWebcam'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin shadow-[0_0_15px_rgba(252,177,49,0.3)]" />
        <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest animate-pulse">
          Initializing Engine...
        </span>
      </div>
    </div>
  ),
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

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  const [currentMode, setCurrentMode] = useState<
    'instructions' | 'settings' | 'profile' | 'memory' | 'memory-detail' | 'profile-search'
  >('instructions');

  // Profile search state
  const [targetUser, setTargetUser] = useState<string | undefined>(undefined);

  const [sessionSummary, setSessionSummary] = useState<
    import('@/services/sessionLogger').SessionSummary | null
  >(null);

  const [pbTrace, setPbTrace] = useState<import('@/types/workout').SessionSnapshot[] | null>(null);
  const [raceTrace, setRaceTrace] = useState<import('@/types/workout').SessionSnapshot[] | null>(
    null
  );
  const [isRace, setIsRace] = useState(false);

  // Handle raceGhost custom event from Leaderboard
  useEffect(() => {
    const handleRaceGhost = async (event: any) => {
      const { address: targetAddress, mode: targetMode } = event.detail;
      console.log(`👻 Game received raceGhost event for ${targetAddress} in ${targetMode}`);

      let traceToLoad = null;

      // 1. Check if it's a champion trace
      if (isChampion(targetAddress)) {
        console.log('🏆 Loading Champion trace...');
        const compressedTrace = getChampionTrace(targetAddress);
        if (compressedTrace) {
          traceToLoad = ghostService.decompress(compressedTrace);
        }
      }
      // 2. Check if it's the current user and fetch local PB trace
      else if (finalAddress && targetAddress.toLowerCase() === finalAddress.toLowerCase()) {
        console.log('👤 Loading Personal Best trace...');
        try {
          const pb = await getPersonalBestWorkout(finalAddress, targetMode);
          if (pb) {
            const pbTraceData = await getWorkoutTrace(pb.id);
            if (pbTraceData) {
              traceToLoad = pbTraceData;
            }
          }
        } catch (error) {
          console.error('Failed to load PB trace:', error);
        }
      }

      if (traceToLoad && traceToLoad.length > 0) {
        console.log('✅ Ghost trace loaded, starting race!');
        setRaceTrace(traceToLoad);
        setIsRace(true);
        setMode(targetMode);
        // Trigger game start
        setStarted(true);
        setTimeLeft(120);
        setRepCount(0);
      } else {
        console.error('❌ Failed to load ghost trace');
      }
    };

    window.addEventListener('raceGhost', handleRaceGhost);
    return () => window.removeEventListener('raceGhost', handleRaceGhost);
  }, [finalAddress]);

  // Extract race trace from URL on mount
  const searchParams = useSearchParams();
  useEffect(() => {
    const raceParam = searchParams.get('race');
    const modeParam = searchParams.get('mode') as 'pushups' | 'squats' | null;

    if (raceParam) {
      try {
        const decodedTrace = ghostService.decompress(raceParam);
        if (decodedTrace && decodedTrace.length > 0) {
          console.log('👻 Race trace loaded from URL:', decodedTrace.length, 'frames');
          setRaceTrace(decodedTrace);
          setIsRace(true);

          // Override mode if specified in URL
          if (modeParam && (modeParam === 'pushups' || modeParam === 'squats')) {
            setMode(modeParam);
            console.log('🎮 Race mode set to:', modeParam);
          }
        }
      } catch (error) {
        console.error('Failed to decode race trace from URL:', error);
      }
    }
  }, [searchParams]);

  const handleSessionEnd = useCallback(
    (summary: import('@/services/sessionLogger').SessionSummary) => {
      console.log('📊 Session ended with summary:', summary);
      setSessionSummary(summary);

      // Auto-save workout locally for freemium model
      if (summary.repCount > 0) {
        const workoutId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `session-${Date.now()}`;

        const exerciseMode = (summary.mode as 'pushups' | 'squats') || 'pushups';

        // Check if this is a new PB BEFORE saving the current one
        getPersonalBestWorkout(finalAddress, exerciseMode).then((pb) => {
          const isNewPB = !pb || summary.repCount > pb.reps;

          saveLocalWorkout({
            id: workoutId,
            reps: summary.repCount,
            timestamp: summary.startTime,
            synced: false,
            type: exerciseMode,
            userAddress: finalAddress,
          })
            .then(async () => {
              console.log('✅ Workout auto-saved locally:', workoutId);

              if (isNewPB) {
                console.log('🔥 NEW PERSONAL BEST! Saving trace...');
                await saveWorkoutTrace(workoutId, summary.trace);
              }
            })
            .catch((err) => console.error('❌ Failed to auto-save workout:', err));
        });
      }
    },
    [finalAddress]
  );

  // Swipe gesture handling for mobile
  const { isMobile, isClient } = useDeviceDetect();

  // Swipe gesture handling for mobile using custom hook
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeGesture(
    ['instructions', 'settings', 'profile', 'memory', 'memory-detail', 'profile-search'],
    currentMode,
    setCurrentMode
  );

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

  // Get user level for feature unlocking
  const { progress: xpProgress } = useXpProgress();

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

      const voicePref = window.localStorage.getItem('prefVoiceEnabled');
      setVoiceEnabled(voicePref === null ? true : voicePref === 'true');
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
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);

  // Real-time biomechanical state for AI Agent feedback
  const [metrics, setMetrics] = useState<import('@/types/mediapipe').BiomechanicalState | null>(
    null
  );

  // Haptic feedback for rep counting
  const { triggerRepFeedback } = useHapticFeedback();

  // Visual rep feedback state
  const [repFeedback, setRepFeedback] = useState<{ show: boolean; count: number }>({
    show: false,
    count: 0,
  });
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
    phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
    message: string;
    percentage: number;
  } | null>(null);

  // Handle pose detection progress updates
  const handleDetectionProgress = useCallback(
    (progress: {
      phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
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
      const prevCount = repCount;
      setRepCount(count);

      // Trigger feedback when rep count increases
      if (count > prevCount && count > 0) {
        // Haptic feedback
        triggerRepFeedback();

        // Visual feedback
        setRepFeedback({ show: true, count });
        setTimeout(() => setRepFeedback((prev) => ({ ...prev, show: false })), 1000);
      }

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
    [started, mode, user?.fid, repCount, triggerRepFeedback] // Remove timeLeft from dependencies
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

  const handleStart = async () => {
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

    // Fetch PB trace for ghost mode if user level is 3+
    try {
      if (xpProgress.currentLevel >= 3) {
        const pb = await getPersonalBestWorkout(finalAddress, mode);
        if (pb && pb.hasTrace) {
          console.log('👻 Loading PB trace for Ghost Mode...');
          const trace = await getWorkoutTrace(pb.id);
          setPbTrace(trace);
        } else {
          setPbTrace(null);
        }
      } else {
        console.log('🔒 Ghost Mode locked (Level 3 required)');
        setPbTrace(null);
      }
    } catch (err) {
      console.error('❌ Failed to load PB trace:', err);
      setPbTrace(null);
    }

    // Welcome component consolidated into InitializationScreen - setShowWelcome removed
    setShowTutorial(false); // Hide tutorial when starting
    setStarted(true);

    // Reset counters
    setRepCount(0);
    setTimeLeft(120);
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
    setIsRace(false);
    setRaceTrace(null);
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
  // When racing against a ghost, prioritize raceTrace over pbTrace
  const activeTrace = raceTrace || pbTrace;

  const memoizedWebcam = useMemo(
    () => (
      <LazyWebcam
        mode={mode}
        onRepCount={handleRepCount}
        isActive={started}
        onPoseStateChange={handlePoseStateChange}
        onDetectionProgress={handleDetectionProgress}
        onMetrics={handleMetrics}
        onSessionEnd={handleSessionEnd}
        pbTrace={activeTrace || undefined}
      />
    ),
    [
      mode,
      handleRepCount,
      started,
      handlePoseStateChange,
      handleDetectionProgress,
      handleMetrics,
      handleSessionEnd,
      activeTrace,
    ]
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
            <div className="">
              <SplitFlapInstructions
                mode={currentMode}
                onModeChange={setCurrentMode}
                autoFs={autoFs}
                setAutoFs={setAutoFs}
                voiceEnabled={voiceEnabled}
                setVoiceEnabled={setVoiceEnabled}
                isFullscreenAvailable={isFullscreenAvailable}
                formattedStats={formattedStats}
                isLoadingStats={statsLoading}
                targetUser={targetUser}
                onProfileSearch={handleProfileSearch}
              />
            </div>
          )}

          {started && (
            <>
              {isMobile ? (
                /* Mobile layout - HUD Block Layout (Stable) */
                <div className="w-full flex flex-col items-center justify-start relative h-full">
                  {/* HUD placed statically above the video to prevent z-index/layering issues on iOS */}
                  <GameHUD
                    mode={mode}
                    timeLeft={timeLeft}
                    repCount={repCount}
                    formatTime={formatTime}
                    isOverlay={isFullscreen}
                    isRace={isRace}
                  />

                  <div
                    id="canvasContainerMobile"
                    aria-label="Game Canvas Mobile"
                    className={`w-full relative flex-grow rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black/50 ${isFullscreen ? 'video-container-fs' : ''}`}
                    style={{
                      width: '100%',
                      minHeight: '300px',
                      // Allow container to fill remaining space but respect aspect ratio logic in Webcam
                    }}
                  >
                    {memoizedWebcam}

                    <GameLoadingOverlay
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
                      isVisible={
                        started && (!poseState.hasPoseDetection || !poseState.poseDetected)
                      }
                    />

                    <RepFeedbackOverlay show={repFeedback.show} count={repFeedback.count} />

                    <DebugOverlay started={started} poseDetected={poseState.poseDetected} />

                    {/* Pose Detection Status Indicator */}
                    <div
                      className={`pose-status-indicator ${poseState.poseDetected ? 'detected' : 'not-detected'}`}
                    >
                      {poseState.poseDetected ? '👤 POSE DETECTED' : '⚠️ NO POSE DETECTED'}
                    </div>
                  </div>
                </div>
              ) : (
                /* Desktop layout - HUD Block Layout */
                <div className="w-full h-full flex flex-col items-center justify-start relative">
                  <GameHUD
                    mode={mode}
                    timeLeft={timeLeft}
                    repCount={repCount}
                    formatTime={formatTime}
                    isOverlay={false}
                    isRace={isRace}
                  />

                  <div
                    id="canvasContainerDesktop"
                    aria-label="Game Canvas Desktop"
                    className="w-full relative flex-grow rounded-lg overflow-hidden border border-white/10 bg-black/50"
                  >
                    {memoizedWebcam}

                    <GameLoadingOverlay
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
                      isVisible={
                        started && (!poseState.hasPoseDetection || !poseState.poseDetected)
                      }
                      isOverlay={true}
                    />

                    <DebugOverlay started={started} poseDetected={poseState.poseDetected} />
                    <RepFeedbackOverlay show={repFeedback.show} count={repFeedback.count} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <GameControls
          started={started}
          isMobile={isMobile}
          metrics={metrics}
          mode={mode}
          voiceEnabled={voiceEnabled}
          repCount={repCount}
          userId={wallet.address || undefined}
          finalAddress={finalAddress}
          onStop={handleStop}
          onStart={handleStart}
          onReset={handleReset}
          onModeChange={setMode}
        />
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
        onPlayAgain={() => {
          console.log('Game: Play Again clicked');
          handleReset();
        }}
        repCount={repCount}
        timeLeft={timeLeft}
        mode={mode}
        address={finalAddress}
        sessionSummary={sessionSummary}
        isRace={isRace}
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

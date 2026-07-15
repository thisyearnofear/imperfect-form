'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { UnifiedLoader } from '@/components/ui';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import useDeviceDetect from '@/hooks/useDeviceDetect';
import { useLoadingPhase } from '@/hooks/useLoadingPhase';
import { SummaryModal, ExpandedLeaderboardModal } from '@/components/modals';
// Welcome component consolidated into InitializationScreen - import removed
import { UniversalConnectButton } from '@/components/wallet';
import { usePlatform } from '@/contexts/PlatformContext';
import ModeSwitch from './ModeSwitch';
import { AgentInsightTray } from './AgentInsightTray';
import useSwipeGesture from '@/hooks/useSwipeGesture';
import { GameControls } from './GameControls';

import IntroDialog from '@/components/auth/IntroDialog';
import CameraPrimer, {
  shouldShowCameraPrimer,
  markCameraPrimerSeen,
} from '@/components/recovery/CameraPrimer';
import RecoveryCard from '@/components/recovery/RecoveryCard';
import { useCoachPersonality } from '@/hooks/useCoachPersonality';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import { speakCoachLine } from '@/lib/tts';
import { coachStation } from '@/services/coachStation';
// session-register.css loaded from root layout

import { useFullscreen } from '../../hooks/useFullscreen';
import FullscreenExitButton from '../ui/FullscreenExitButton';
import { SplitFlapInstructions } from '../ui/SplitFlapText';
import useOrientationLock from '../../hooks/useOrientationLock';
import { useUserStats } from '../../hooks/useUserStats';
import { useXpProgress } from '../../hooks/useXpProgress';
import { isFarcasterMiniApp } from '../../utils/farcasterMiniApp';
import { useRepCounter } from '../../hooks/useRepCounter';
import { useCameraSetup } from '../../hooks/useCameraSetup';
import { GameCanvas } from './GameCanvas';
import {
  saveLocalWorkout,
  getPersonalBestWorkout,
  getWorkoutTrace,
  saveWorkoutTrace,
  migrateGuestWorkouts,
} from '@/services/integrations/WorkoutDataAdapter';
import { getEffectiveUserId } from '@/services/guestIdentity';
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
}

const Game: React.FC<GameProps> = ({ thirdwebAddress }) => {
  // Get universal wallet context first
  const { wallet, user } = usePlatform();
  const { address } = wallet;
  const finalAddress = address || thirdwebAddress;
  const { intent: sessionIntent, register: sessionRegister } = useSessionIntent();
  const [calmSessionActive, setCalmSessionActive] = useState(false);

  // --- Fullscreen integration ---
  const gameRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen(gameRef);

  const [autoFs, setAutoFs] = useState<boolean>(true);

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  const [currentMode, setCurrentMode] = useState<'instructions' | 'settings' | 'profile'>(
    'instructions'
  );

  const [sessionSummary, setSessionSummary] = useState<
    import('@/services/sessionLogger').SessionSummary | null
  >(null);

  const [pbTrace, setPbTrace] = useState<import('@/types/workout').SessionSnapshot[] | null>(null);
  const [raceTrace, setRaceTrace] = useState<import('@/types/workout').SessionSnapshot[] | null>(
    null
  );
  const [isRace, setIsRace] = useState(false);

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

        // Guests get a stable local ID so PBs/XP/ghosts work without a wallet
        const effectiveUserId = getEffectiveUserId(finalAddress);

        // Check if this is a new PB BEFORE saving the current one
        getPersonalBestWorkout(effectiveUserId, exerciseMode).then((pb) => {
          const isNewPB = !pb || summary.repCount > pb.reps;

          saveLocalWorkout({
            id: workoutId,
            reps: summary.repCount,
            timestamp: summary.startTime,
            synced: false,
            type: exerciseMode,
            userAddress: effectiveUserId,
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
    ['instructions', 'settings', 'profile'],
    currentMode,
    setCurrentMode
  );

  const { lockLandscape, unlock } = useOrientationLock();
  const [isLandscapeLocked, setIsLandscapeLocked] = useState(false);

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

  const handleWalletConnected = useCallback((address: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Game: Wallet connected with address:', address);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pref = window.localStorage.getItem('prefAutoFullscreen');
      setAutoFs(pref === null ? true : pref === 'true');

      const voicePref = window.localStorage.getItem('prefVoiceEnabled');
      setVoiceEnabled(voicePref === null ? true : voicePref === 'true');
    }
  }, []);

  // Voice sync: station `demonstration` events → TTS while the arm moves
  useEffect(() => {
    if (!coachStation.enabled) return;
    return coachStation.onDemonstration((event) => {
      if (!voiceEnabled) return;
      void speakCoachLine(event.narration, {
        voiceEnabled: true,
        personality: event.personality,
      });
    });
  }, [voiceEnabled]);

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
  const [showCameraPrimer, setShowCameraPrimer] = useState(false);
  const pendingStartRef = useRef<{ trace?: any; isRace?: boolean } | undefined>(undefined);
  const [timeLeft, setTimeLeft] = useState(120);
  // repCount managed by useRepCounter below
  const [mode, setMode] = useState<import('@/utils/biomechanics').ExerciseMode>('pushups');
  const [showSummary, setShowSummary] = useState(false);
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const [personality] = useCoachPersonality();

  // Rep counting, haptic + visual feedback via hook
  const {
    repCount,
    repFeedback,
    onRepDetected: handleRepCount,
    resetReps,
  } = useRepCounter(
    () => {
      if (!timerRef.current) startTimer();
    },
    (count, exerciseMode) => {
      if (user?.fid) {
        fetch('/api/analytics/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: user.fid,
            eventType: 'workout_completed',
            metadata: { reps: count, exerciseMode, duration: 120 - timeLeftRef.current },
          }),
        }).catch((err) => console.warn('Failed to track workout:', err));
      }
    },
    started,
    mode
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

  // Update intro dialog visibility when wallet connection changes,
  // and merge any guest-era workouts into the connected address (Ring 0 -> 1)
  useEffect(() => {
    if (finalAddress) {
      // Hide intro dialog if user connects wallet
      setShowIntroDialog(false);
      migrateGuestWorkouts(finalAddress).catch((err) =>
        console.warn('Guest workout migration failed:', err)
      );
    }
  }, [finalAddress]);

  // Pose detection — extracted into usePoseDetection hook
  const {
    poseState,
    detectionProgress,
    metrics,
    showLoadingOverlay,
    handlePoseStateChange,
    handleDetectionProgress,
    handleMetrics,
  } = usePoseDetection();
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

  // Camera setup and viewport tracking
  const { stopAllCameras } = useCameraSetup();

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

  const handleStop = useCallback(() => {
    exitFullscreen();
    unlock();
    setIsLandscapeLocked(false);
    if (timerRef.current) clearInterval(timerRef.current);

    // Stagger the transitions: first hide the game, then show summary
    setStarted(false);
    setShowTutorial(false);

    // Physical AI: end-of-session signal (no-op unless station URL configured)
    coachStation.sendSessionEvent('session_end', mode, personality);

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
  }, [stopAllCameras, finalAddress, exitFullscreen, unlock, mode, personality]);

  // Update the ref whenever handleStop changes
  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]);

  const handleStart = useCallback(
    async (options?: { trace?: any; isRace?: boolean }) => {
      // Breathe intent: calm recovery path — no camera, no workout boot
      if (sessionIntent === 'recover') {
        setCalmSessionActive(true);
        return;
      }

      // First use: show the calm camera primer before the browser's permission
      // prompt fires. Synchronous check - the fullscreen call below must stay
      // within this user gesture.
      if (shouldShowCameraPrimer()) {
        pendingStartRef.current = options;
        setShowCameraPrimer(true);
        return;
      }

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

      // Fetch PB trace for ghost mode if user level is 3+ AND we're not already in a race
      const effectiveIsRace = options?.isRace ?? isRace;
      const effectiveRaceTrace = options?.trace ?? raceTrace;

      try {
        if (xpProgress.currentLevel >= 3 && !effectiveIsRace && !effectiveRaceTrace) {
          const pb = await getPersonalBestWorkout(getEffectiveUserId(finalAddress), mode);
          if (pb && pb.hasTrace) {
            console.log('👻 Loading PB trace for Ghost Mode...');
            const trace = await getWorkoutTrace(pb.id);
            setPbTrace(trace);
          } else {
            setPbTrace(null);
          }
        } else if (effectiveIsRace || effectiveRaceTrace) {
          console.log('🏁 Racing against a ghost trace, skipping standard PB load');
          setPbTrace(null);
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

      // Physical AI: session start (no-op unless station URL configured)
      coachStation.sendSessionEvent('session_start', mode, personality);

      // Reset counters
      resetReps();
      setTimeLeft(120);
    },
    [
      sessionIntent,
      isMobile,
      autoFs,
      isFullscreenAvailable,
      enterFullscreen,
      mode,
      lockLandscape,
      xpProgress.currentLevel,
      isRace,
      raceTrace,
      finalAddress,
      personality,
      resetReps,
    ]
  );

  // --- Ghost Mode & Race Integration ---

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
          const pb = await getPersonalBestWorkout(getEffectiveUserId(finalAddress), targetMode);
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

        // Trigger game start using the official handleStart
        handleStart({ trace: traceToLoad, isRace: true });
      } else {
        console.error('❌ Failed to load ghost trace');
      }
    };

    window.addEventListener('raceGhost', handleRaceGhost);
    return () => window.removeEventListener('raceGhost', handleRaceGhost);
  }, [finalAddress, handleStart]);

  // Extract race trace from URL on mount
  const searchParams = useSearchParams();
  useEffect(() => {
    const raceParam = searchParams.get('race');
    const modeParam = searchParams.get('mode');

    if (raceParam) {
      try {
        const decodedTrace = ghostService.decompress(raceParam);
        if (decodedTrace && decodedTrace.length > 0) {
          console.log('👻 Race trace loaded from URL:', decodedTrace.length, 'frames');
          setRaceTrace(decodedTrace);
          setIsRace(true);

          // Override mode if specified in URL
          if (
            modeParam === 'pushups' ||
            modeParam === 'squats' ||
            modeParam === 'pullups' ||
            modeParam === 'jumps' ||
            modeParam === 'curls'
          ) {
            setMode(modeParam);
            console.log('🎮 Race mode set to:', modeParam);
          }
        }
      } catch (error) {
        console.error('Failed to decode race trace from URL:', error);
      }
    }
  }, [searchParams]);

  // Moved memoized webcam after handler functions are defined

  // Function to start the timer
  const startTimer = useCallback(() => {
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
  }, [handleStop]);

  // handleRepCount is provided by useRepCounter as onRepDetected

  const handleReset = useCallback(() => {
    exitFullscreen();
    unlock();
    setIsLandscapeLocked(false);
    if (timerRef.current) clearInterval(timerRef.current);
    resetReps();
    setTimeLeft(120);
    setStarted(false);
    setCalmSessionActive(false);
    setIsRace(false);
    setRaceTrace(null);
    // Welcome component consolidated into InitializationScreen - no need to reset welcome state
    setShowTutorial(true);
    setShowSummary(false);

    // Also stop the camera when resetting
    stopAllCameras();
  }, [stopAllCameras, exitFullscreen, unlock, resetReps]);

  // Leaving Breathe intent closes the calm panel (register commit stays until they re-pick)
  useEffect(() => {
    if (sessionIntent !== 'recover') setCalmSessionActive(false);
  }, [sessionIntent]);

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
        data-register={sessionRegister}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`${isMobile ? 'touch-manipulation' : ''}${showCameraPrimer ? ' pointer-events-none' : ''}`}
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

        <div id="screen" data-register={sessionRegister}>
          {/* Welcome component consolidated into InitializationScreen */}

          {!started && !calmSessionActive && (
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
              />
            </div>
          )}

          {calmSessionActive && !started && (
            <div id="instructions" className="!bg-transparent">
              <RecoveryCard
                mode={mode}
                variant="panel"
                onDismiss={() => setCalmSessionActive(false)}
              />
            </div>
          )}

          {started && (
            <GameCanvas
              mode={mode}
              timeLeft={timeLeft}
              repCount={repCount}
              repFeedback={repFeedback}
              formatTime={formatTime}
              isFullscreen={isFullscreen}
              isRace={isRace}
              isMobile={isMobile}
              poseState={poseState}
              detectionProgress={detectionProgress}
              webcam={memoizedWebcam}
            />
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
          calmSessionActive={calmSessionActive}
          onStop={handleStop}
          onStart={handleStart}
          onReset={handleReset}
          onModeChange={setMode}
        />
      </div>
      {showCameraPrimer && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-teal-500/20 bg-teal-500/5 overflow-y-auto max-h-[calc(100vh-2rem)]">
            <CameraPrimer
              onEnable={() => {
                markCameraPrimerSeen();
                setShowCameraPrimer(false);
                // Re-enter the start flow in this click's gesture context so
                // fullscreen/orientation still work
                handleStart(pendingStartRef.current);
              }}
              onCancel={() => {
                setShowCameraPrimer(false);
                pendingStartRef.current = undefined;
              }}
            />
          </div>
        </div>
      )}
      {showIntroDialog && (
        <IntroDialog
          open={showIntroDialog}
          onOpenChange={(open) => {
            setShowIntroDialog(open);
            if (!open) {
            }
          }}
          onFarcaster={() => {
            // Placeholder: Open farcaster auth, then hide dialog
            window.open('/api/auth/farcaster', '_self');
            setShowIntroDialog(false);
          }}
          onWallet={() => {
            // Placeholder: Simulate connect, then hide dialog
            setShowIntroDialog(false);
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

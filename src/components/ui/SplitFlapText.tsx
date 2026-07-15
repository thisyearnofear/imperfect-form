'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '@/styles/split-flap.css';
import { usePlatform } from '@/contexts/PlatformContext';
import { getLocalWorkouts, markWorkoutSynced } from '@/services/integrations/WorkoutDataAdapter';
import { LocalWorkout } from '@/types/workout';
import { submitScoreDirect } from '@/utils/directSubmission';
import { getNetworkByChainId } from '@/config/networks';
import toast from 'react-hot-toast';
import { useXpProgress } from '@/hooks/useXpProgress';

interface SplitFlapTextProps {
  text: string;
  isAnimating?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
  delay?: number;
}

const SplitFlapText: React.FC<SplitFlapTextProps> = ({
  text,
  isAnimating = false,
  onAnimationComplete,
  className = '',
  delay = 0,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (text === displayText) {
      return;
    }

    if (isAnimating) {
      setIsFlipping(true);

      const timer = setTimeout(() => {
        setDisplayText(text);
        setIsFlipping(false);
        onAnimationComplete?.();
      }, 300 + delay);

      return () => clearTimeout(timer);
    } else {
      setDisplayText(text);
      setIsFlipping(false);
    }
  }, [text, isAnimating, displayText, onAnimationComplete, delay]);

  return (
    <span className={`split-flap-text ${isFlipping ? 'flipping' : ''} ${className}`}>
      {displayText}
    </span>
  );
};

type InstructionMode = 'instructions' | 'settings' | 'profile';

interface InstructionItem {
  key: string;
  text: string;
  desc: string;
  hideKey?: boolean;
}

interface SplitFlapInstructionsProps {
  mode: InstructionMode;
  onModeChange: (mode: InstructionMode) => void;
  autoFs: boolean;
  setAutoFs: (value: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (value: boolean) => void;
  isFullscreenAvailable?: boolean;
  formattedStats?: {
    workouts: string;
    bestScore: string;
    streak: string;
    summary: string;
  } | null;
  isLoadingStats?: boolean;
}

export const SplitFlapInstructions: React.FC<SplitFlapInstructionsProps> = ({
  mode,
  onModeChange,
  autoFs,
  setAutoFs,
  voiceEnabled,
  setVoiceEnabled,
  isFullscreenAvailable = true,
  formattedStats,
  isLoadingStats,
}) => {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { progress } = useXpProgress();
  const { wallet, platform, farcasterProvider } = usePlatform();

  const [unsyncedWorkouts, setUnsyncedWorkouts] = useState<LocalWorkout[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    if (mode === 'profile') {
      getLocalWorkouts().then((workouts) => {
        setUnsyncedWorkouts(workouts.filter((w) => !w.synced));
      });
    }
  }, [mode]);

  const handleSyncAll = async () => {
    if (unsyncedWorkouts.length === 0 || !wallet.isConnected || isSyncingAll) return;

    setIsSyncingAll(true);
    let successCount = 0;

    const chainId = wallet.chainId;
    if (!chainId) {
      toast.error('Network not detected');
      setIsSyncingAll(false);
      return;
    }

    const networkConfig = getNetworkByChainId(chainId);
    const provider =
      platform === 'farcaster' && farcasterProvider
        ? farcasterProvider
        : typeof window !== 'undefined'
          ? (window as any).ethereum
          : null;

    if (!provider) {
      toast.error('Wallet provider not available');
      setIsSyncingAll(false);
      return;
    }

    const loadingToast = toast.loading(`Syncing ${unsyncedWorkouts.length} sessions...`);

    for (const workout of unsyncedWorkouts) {
      try {
        const pushups = workout.type === 'pushups' ? workout.reps : 0;
        const squats = workout.type === 'squats' ? workout.reps : 0;

        const result = await submitScoreDirect(
          provider,
          pushups,
          squats,
          networkConfig?.contractAddress || '',
          chainId,
          false,
          null
        );

        if (result.success) {
          await markWorkoutSynced(workout.id, result.transactionHash!, networkConfig?.name as any);
          successCount++;
        }
      } catch (err) {
        console.error('Failed to sync workout:', workout.id, err);
      }
    }

    toast.dismiss(loadingToast);
    if (successCount > 0) {
      toast.success(`Successfully synced ${successCount} workouts!`);
      const updated = await getLocalWorkouts();
      setUnsyncedWorkouts(updated.filter((w) => !w.synced));
    } else {
      toast.error('Failed to sync workouts.');
    }
    setIsSyncingAll(false);
  };

  const currentInstructions = useMemo(() => {
    const instructionConfigs: Record<InstructionMode, InstructionItem[]> = {
      instructions: [
        {
          key: '🏋️',
          text: 'Real-time pose detection',
          desc: 'AI-powered form analysis',
          hideKey: true,
        },
        {
          key: '🏆',
          text: 'Onchain leaderboards',
          desc: 'Transparent competition',
          hideKey: true,
        },
        {
          key: '🎯',
          text: 'Pushups & Squats',
          desc: 'Tracked challenges',
          hideKey: true,
        },
        {
          key: '⚡',
          text: 'HAVE FUN!',
          desc: 'Stay hard',
          hideKey: true,
        },
      ],
      settings: [
        {
          key: 'a',
          text: 'FULLSCREEN',
          desc: !isFullscreenAvailable ? 'unavailable' : autoFs ? 'enabled' : 'disabled',
        },
        { key: 'b', text: 'VOICE COACH', desc: voiceEnabled ? 'enabled' : 'disabled' },
        { key: 'c', text: 'THEME', desc: 'retro edition' },
        { key: 'd', text: 'Back to profile!', desc: '' },
      ],
      profile: [
        {
          key: 'L',
          text: 'LEVEL',
          desc: isLoadingStats ? 'Loading...' : `Lvl ${progress.currentLevel}`,
          hideKey: true,
        },
        {
          key: 'a',
          text: 'WORKOUTS',
          desc: isLoadingStats ? 'Loading...' : formattedStats?.workouts || 'No data yet',
          hideKey: true,
        },
        {
          key: 'b',
          text: 'BEST SCORE',
          desc: isLoadingStats ? 'Loading...' : formattedStats?.bestScore || 'No workouts',
          hideKey: true,
        },
        {
          key: 'c',
          text: 'STREAK',
          desc: isLoadingStats ? 'Loading...' : formattedStats?.streak || 'Start today!',
          hideKey: true,
        },
        ...(unsyncedWorkouts.length > 0
          ? [
              {
                key: 's',
                text: 'PENDING',
                desc: `${unsyncedWorkouts.length} to sync →`,
                hideKey: true,
              },
            ]
          : []),
      ],
    };

    return instructionConfigs[mode];
  }, [
    mode,
    formattedStats,
    isLoadingStats,
    autoFs,
    isFullscreenAvailable,
    unsyncedWorkouts.length,
    progress.currentLevel,
    voiceEnabled,
  ]);

  useEffect(() => {
    setIsAnimating(true);
    setAnimationStep(0);

    const timers = currentInstructions.map((_, index) =>
      setTimeout(() => {
        setAnimationStep((prev) => prev + 1);
        if (index === currentInstructions.length - 1) {
          setTimeout(() => setIsAnimating(false), 100);
        }
      }, index * 150)
    );

    return () => timers.forEach(clearTimeout);
  }, [currentInstructions]);

  const handleItemClick = (key: string) => {
    switch (mode) {
      case 'settings':
        if (key === 'a' && isFullscreenAvailable) {
          setAutoFs(!autoFs);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('prefAutoFullscreen', (!autoFs).toString());
          }
        } else if (key === 'b') {
          setVoiceEnabled(!voiceEnabled);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('prefVoiceEnabled', (!voiceEnabled).toString());
          }
        } else if (key === 'd') {
          onModeChange('profile');
        }
        break;

      case 'profile':
        if (key === 's') {
          handleSyncAll();
        }
        break;

      case 'instructions':
        break;
    }
  };

  return (
    <div id="instructions" style={{ display: 'flex', flexDirection: 'column' }}>
      {currentInstructions.map((instruction, index) => (
        <p
          key={instruction.key}
          className={`feature-instruction ${
            mode === 'profile'
              ? 'profile-instruction clickable'
              : mode === 'settings'
                ? 'settings-instruction clickable'
                : ''
          } ${!instruction.desc && mode === 'profile' ? 'single-action' : ''}`}
          onClick={() => handleItemClick(instruction.key)}
          style={{
            cursor:
              (mode === 'settings' && (instruction.key === 'a' || instruction.key === 'd')) ||
              (mode === 'profile' && instruction.key === 's')
                ? 'pointer'
                : 'default',
            transition: 'all 0.3s ease',
            animation:
              mode === 'instructions'
                ? `slideInFeature 0.6s ease-out ${index * 0.2}s forwards`
                : 'none',
            opacity: mode === 'instructions' ? 0 : 1,
          }}
        >
          {!instruction.hideKey && `${instruction.key}) `}
          {instruction.hideKey && mode === 'instructions' && (
            <span className="feature-emoji">{instruction.key}</span>
          )}
          <span
            className={`button-text ${
              instruction.key === 'a'
                ? 'start'
                : instruction.key === 'b'
                  ? 'stop'
                  : instruction.key === 'c'
                    ? 'reset'
                    : instruction.key === '⚡'
                      ? 'fun-highlight'
                      : instruction.key === 's' && mode === 'profile'
                        ? 'nav-highlight'
                        : ''
            }`}
          >
            <SplitFlapText
              text={instruction.text}
              isAnimating={isAnimating && animationStep > index}
              delay={index * 50}
            />
          </span>
          {instruction.desc && instruction.desc.trim() && (
            <>
              {' '}
              <span
                className={`feature-desc ${
                  instruction.key === '🏋️'
                    ? 'ai-highlight'
                    : instruction.key === '🏆'
                      ? 'blockchain-highlight'
                      : instruction.key === '🎯'
                        ? 'challenge-highlight'
                        : ''
                }`}
              >
                <SplitFlapText
                  text={instruction.desc}
                  isAnimating={isAnimating && animationStep > index}
                  delay={index * 50 + 100}
                />
              </span>
            </>
          )}
        </p>
      ))}

      {mode === 'instructions' && (
        <p
          className="built-by feature-instruction"
          style={{
            animation: 'slideInFeature 0.6s ease-out 1s forwards',
            opacity: 0,
          }}
        >
          Built by{' '}
          <a href="https://warpcast.com/papa" target="_blank" className="highlight">
            <SplitFlapText text="PAPA" isAnimating={isAnimating && animationStep > 3} delay={400} />
          </a>
        </p>
      )}
    </div>
  );
};

export default SplitFlapText;

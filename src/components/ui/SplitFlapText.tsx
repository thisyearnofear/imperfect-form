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
import { PreStartFoyer } from '@/components/home/PreStartFoyer';
import {
  nextTtsPreference,
  ttsPreferenceLabel,
  type TtsProviderPreference,
} from '@/config/ttsProviders';
import { getStoredTtsPreference, setStoredTtsPreference } from '@/lib/tts';
import { getUiSoundPreferred, setUiSoundPreferred } from '@/lib/uiSound';

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
  const [ttsPref, setTtsPref] = useState<TtsProviderPreference>('auto');
  const [uiSoundOn, setUiSoundOn] = useState(true);
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

  useEffect(() => {
    setUiSoundOn(getUiSoundPreferred());
  }, []);

  useEffect(() => {
    setTtsPref(getStoredTtsPreference());
  }, []);

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
      // Day-0 foyer is PreStartFoyer — no puerile feature list.
      instructions: [],
      settings: [
        {
          key: 'a',
          text: 'FULLSCREEN',
          desc: !isFullscreenAvailable ? 'unavailable' : autoFs ? 'enabled' : 'disabled',
        },
        { key: 'b', text: 'VOICE COACH', desc: voiceEnabled ? 'enabled' : 'disabled' },
        { key: 'c', text: 'VOICE ENGINE', desc: ttsPreferenceLabel(ttsPref) },
        { key: 'd', text: 'UI SOUND', desc: uiSoundOn ? 'enabled' : 'disabled' },
        { key: 'e', text: 'Back to profile!', desc: '' },
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
    ttsPref,
    uiSoundOn,
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
        } else if (key === 'c') {
          const next = nextTtsPreference(ttsPref);
          setTtsPref(next);
          setStoredTtsPreference(next);
        } else if (key === 'd') {
          const next = !uiSoundOn;
          setUiSoundOn(next);
          setUiSoundPreferred(next);
        } else if (key === 'e') {
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

  if (mode === 'instructions') {
    return <PreStartFoyer />;
  }

  return (
    <div id="instructions" style={{ display: 'flex', flexDirection: 'column' }}>
      {currentInstructions.map((instruction, index) => (
        <p
          key={`${instruction.key}-${instruction.text}`}
          className={`feature-instruction ${
            mode === 'profile' ? 'profile-instruction clickable' : 'settings-instruction clickable'
          } ${!instruction.desc && mode === 'profile' ? 'single-action' : ''}`}
          onClick={() => handleItemClick(instruction.key)}
          style={{
            cursor:
              (mode === 'settings' &&
                (instruction.key === 'a' ||
                  instruction.key === 'b' ||
                  instruction.key === 'c' ||
                  instruction.key === 'd' ||
                  instruction.key === 'e')) ||
              (mode === 'profile' && instruction.key === 's')
                ? 'pointer'
                : 'default',
            transition: 'opacity 0.3s ease, transform 0.2s ease',
            opacity: 1,
          }}
        >
          {!instruction.hideKey && `${instruction.key}) `}
          <span
            className={`button-text ${
              instruction.key === 'a'
                ? 'start'
                : instruction.key === 'b'
                  ? 'stop'
                  : instruction.key === 'c'
                    ? 'reset'
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
              <span className="feature-desc">
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
    </div>
  );
};

export default SplitFlapText;

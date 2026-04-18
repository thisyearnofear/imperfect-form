'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '@/styles/split-flap.css';
import { usePlatform } from '@/contexts/PlatformContext';
import { useEnhancedProfile, type EnhancedProfile } from '@/hooks/useEnhancedProfile';
import {
  ProfileSearch,
  ProfileDisplay,
  ProfileComparison,
  ProfileActions,
} from '@/components/profile';
import { getLocalWorkouts, markWorkoutSynced } from '@/services/integrations/WorkoutDataAdapter';
import { LocalWorkout } from '@/types/workout';
import { submitScoreDirect } from '@/utils/directSubmission';
import { getNetworkByChainId } from '@/config/networks';
import { CONTRACT_ADDRESSES } from '@/config/contract-addresses';
import toast from 'react-hot-toast';

// Memory API integration is now handled inline

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
      // No change needed
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
      // No timer to clean up
    }
  }, [text, isAnimating, displayText, onAnimationComplete, delay]);

  return (
    <span className={`split-flap-text ${isFlipping ? 'flipping' : ''} ${className}`}>
      {displayText}
    </span>
  );
};

type InstructionMode =
  | 'instructions'
  | 'settings'
  | 'profile'
  | 'memory'
  | 'memory-detail'
  | 'profile-search';

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
  // New props for profile search
  targetUser?: string;
  onProfileSearch?: (identifier: string) => void;
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
  targetUser,
  onProfileSearch,
}) => {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
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
          networkConfig.contractAddress,
          chainId,
          false,
          null
        );

        if (result.success) {
          await markWorkoutSynced(workout.id, result.transactionHash!, networkConfig.name as any);
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

  // Use our new enhanced profile hook
  // Explicitly convert null to undefined to match hook expectations
  const walletAddressForHook = wallet?.address ?? undefined;
  const targetIdentifierForHook = targetUser || walletAddressForHook;

  const userProfile = useEnhancedProfile(targetIdentifierForHook);
  const { profile: memoryData, loading: loadingMemory } = userProfile;

  // Get current user's profile for comparison
  const currentUserProfile = useEnhancedProfile(walletAddressForHook);
  const { profile: currentUserData } = currentUserProfile;

  // Configuration-driven instruction sets with optimized memoization
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
        {
          key: 'd',
          text: 'MORE →',
          desc: '',
          hideKey: true,
        },
      ],
      memory: [
        {
          key: 'd',
          text: '← BACK',
          desc: 'SEARCH | MORE →',
          hideKey: true,
        },
      ],
      'profile-search': [
        {
          key: 'd',
          text: '← BACK',
          desc: '',
          hideKey: true,
        },
      ],
      'memory-detail': [
        {
          key: 'd',
          text: '← BACK',
          desc: '',
          hideKey: true,
        },
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
  ]);

  useEffect(() => {
    // Trigger animation when mode changes
    setIsAnimating(true);
    setAnimationStep(0);

    // Stagger the animations
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
          // Only allow toggling if fullscreen is available
          setAutoFs(!autoFs);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('prefAutoFullscreen', (!autoFs).toString());
          }
        } else if (key === 'b') {
          // Toggle voice enabled
          setVoiceEnabled(!voiceEnabled);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('prefVoiceEnabled', (!voiceEnabled).toString());
          }
        } else if (key === 'd') {
          onModeChange('profile'); // Back to profile (new default)
        }
        break;

      case 'memory-detail':
        if (key === 'd') {
          // Switch back to memory view
          onModeChange('memory');
        }
        break;

      case 'profile':
        if (key === 'd') {
          // Switch to memory profile view
          onModeChange('memory');
        } else if (key === 's') {
          // Sync all unsynced workouts
          handleSyncAll();
        }
        break;

      case 'memory':
        if (key === 'd') {
          // Switch back to profile view
          onModeChange('profile');
        } else if (key === 'e') {
          // Switch to memory detail view
          onModeChange('memory-detail');
        } else if (key === 's') {
          // Switch to profile search
          onModeChange('profile-search');
        }
        break;

      case 'profile-search':
        if (key === 'd') {
          // Switch back to memory view
          onModeChange('memory');
        } else if (key === 'r' && userProfile.refreshProfile) {
          // Refresh current profile
          userProfile.refreshProfile();
        }
        break;

      case 'instructions':
        // Instructions are read-only, no click actions
        break;
    }
  };

  return (
    <div id="instructions" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Profile Search UI */}
      {mode === 'profile-search' && (
        <div className="space-y-3 mb-4">
          <ProfileSearch
            onSearch={onProfileSearch || (() => {})}
            loading={loadingMemory}
            error={userProfile.error}
          />

          {/* Contextual breadcrumb for profile search */}
          {targetUser && targetUser !== wallet?.address && (
            <div className="profile-instruction">
              <span className="text-[#fcb131]/70 text-xs">← Viewing profile from search</span>
            </div>
          )}

          {memoryData && (
            <div className="space-y-1 pt-2 border-t border-[#fcb131]/20">
              <div className="profile-instruction">
                <span className="button-text start">FOUND</span> ={' '}
                <span
                  className="text-green-400 font-bold transform hover:scale-105 transition-transform duration-200 cursor-pointer relative"
                  onClick={() => {
                    if (memoryData?.identifier) {
                      navigator.clipboard.writeText(memoryData.identifier);
                      // Optional: Add visual feedback
                      // You could add a toast notification here
                    }
                  }}
                  title="Click to copy full address"
                >
                  {memoryData.primaryIdentity?.username ||
                    (memoryData?.identifier?.length > 20
                      ? `${memoryData.identifier.substring(0, 6)}...${memoryData.identifier.substring(memoryData.identifier.length - 4)}`
                      : memoryData.identifier)}
                </span>
              </div>

              {/* Loading shimmer effect */}
              {loadingMemory && (
                <div className="h-2 bg-gradient-to-r from-[#fcb131]/20 via-[#fcb131]/40 to-[#fcb131]/20 rounded animate-pulse"></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Memory profile content - styled like settings mode */}
      {mode === 'memory' && (
        <div className="space-y-1">
          {/* Contextual breadcrumb */}
          {targetUser && targetUser !== wallet?.address && (
            <div className="profile-instruction">
              <span className="text-[#fcb131]/70 text-xs">← Viewing profile from search</span>
            </div>
          )}

          <ProfileDisplay
            profile={memoryData!}
            loading={loadingMemory}
            isCurrentUser={!targetUser || targetUser === wallet?.address}
          />

          {/* Performance comparison - only show when viewing another user */}
          {targetUser && targetUser !== wallet?.address && currentUserData && memoryData && (
            <ProfileComparison targetProfile={memoryData} currentProfile={currentUserData} />
          )}

          {/* Quick actions - only show when viewing another user */}
          {targetUser && targetUser !== wallet?.address && memoryData && (
            <ProfileActions profile={memoryData} />
          )}
        </div>
      )}

      {/* Memory detail view - additional identity information */}
      {mode === 'memory-detail' && (
        <div className="space-y-1">
          {memoryData?.identities
            .filter((id) => id.platform === 'solana')
            .map((identity, idx) => (
              <p key={`solana-${idx}`} className="profile-instruction">
                <span className="button-text start">SOLANA</span> ={' '}
                <span
                  className="text-[#fcb131] font-mono cursor-pointer hover:text-yellow-400 transition-colors px-2 py-1 bg-yellow-900/20 hover:bg-yellow-700/30 rounded border border-yellow-600/30"
                  onClick={() => navigator.clipboard.writeText(identity.id)}
                >
                  {identity.id.slice(0, 10)}...{identity.id.slice(-4)}
                </span>
              </p>
            ))}
          {memoryData?.identities
            .filter((id) => id.platform === 'ens')
            .map((identity, idx) => (
              <p key={`ens-${idx}`} className="profile-instruction">
                <span className="button-text stop">ENS</span> ={' '}
                <span
                  className="text-[#fcb131] font-mono cursor-pointer hover:text-yellow-400 transition-colors px-2 py-1 bg-yellow-900/20 hover:bg-yellow-700/30 rounded border border-yellow-600/30"
                  onClick={() => navigator.clipboard.writeText(identity.id)}
                >
                  {identity.id}
                </span>
              </p>
            ))}
          {memoryData?.identities
            .filter((id) => id.platform === 'basenames')
            .map((identity, idx) => (
              <p key={`basename-${idx}`} className="profile-instruction">
                <span className="button-text reset">BASENAME</span> ={' '}
                <span
                  className="text-[#fcb131] font-mono cursor-pointer hover:text-yellow-400 transition-colors px-2 py-1 bg-yellow-900/20 hover:bg-yellow-700/30 rounded border border-yellow-600/30"
                  onClick={() => navigator.clipboard.writeText(identity.id)}
                >
                  {identity.id}
                </span>
              </p>
            ))}
          {memoryData?.identities
            .filter((id) => id.platform === 'zora')
            .map((identity, idx) => (
              <p key={`zora-${idx}`} className="profile-instruction">
                <span className="button-text fun-highlight">ZORA</span> ={' '}
                <a
                  href={identity.url || `https://zora.co/@${identity.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:text-orange-300 underline transition-colors px-2 py-1 bg-orange-900/20 hover:bg-orange-700/30 rounded border border-orange-600/30"
                >
                  {identity.username || identity.id}
                </a>
              </p>
            ))}
          {memoryData?.identities
            .filter((id) => id.platform === 'github')
            .map((identity, idx) => (
              <p key={`github-${idx}`} className="profile-instruction">
                <span className="button-text fun-highlight">GITHUB</span> ={' '}
                <a
                  href={identity.url || `https://github.com/${identity.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white underline transition-colors px-2 py-1 bg-gray-900/20 hover:bg-gray-700/30 rounded border border-gray-600/30"
                >
                  {identity.username || identity.id}
                </a>
              </p>
            ))}
        </div>
      )}

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
          onClick={(e) => {
            // Only handle the main click if not clicking on sub-buttons in memory or profile-search mode
            if (
              !((mode === 'memory' || mode === 'profile-search') && e.target !== e.currentTarget)
            ) {
              handleItemClick(instruction.key);
            }
          }}
          style={{
            cursor:
              (mode === 'settings' && (instruction.key === 'a' || instruction.key === 'd')) ||
              (mode === 'profile' && (instruction.key === 'd' || instruction.key === 's')) ||
              (mode === 'memory' && (instruction.key === 'd' || instruction.key === 'e')) ||
              (mode === 'profile-search' && instruction.key === 'd')
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
          {mode === 'memory' ? (
            <div className="flex flex-row items-center justify-center gap-1">
              <span
                className={`button-text nav-highlight px-3 py-1 border border-gray-500/50 rounded text-xs cursor-pointer min-w-[70px] text-center hover:bg-gray-700/20`}
                onClick={() => handleItemClick(instruction.key)}
              >
                <SplitFlapText
                  text={instruction.text}
                  isAnimating={isAnimating && animationStep > index}
                  delay={index * 50}
                />
              </span>
              <span className="text-gray-500 select-none px-1">|</span>
              <span
                className={`px-3 py-1 border rounded text-xs cursor-pointer min-w-[70px] text-center border-[#fcb131]/50 text-[#fcb131] hover:bg-[#fcb131]/20`}
                onClick={() => onModeChange('profile-search')}
              >
                <SplitFlapText
                  text="SEARCH"
                  isAnimating={isAnimating && animationStep > index}
                  delay={index * 50 + 30}
                />
              </span>
              <span className="text-gray-500 select-none px-1">|</span>
              <span
                className={`px-3 py-1 border rounded text-xs cursor-pointer min-w-[70px] text-center border-green-500/50 text-green-400 hover:bg-green-500/20`}
                onClick={() => onModeChange('memory-detail')}
              >
                <SplitFlapText
                  text="MORE →"
                  isAnimating={isAnimating && animationStep > index}
                  delay={index * 50 + 60}
                />
              </span>
            </div>
          ) : mode === 'profile-search' ? (
            <div className="flex flex-row items-center justify-center gap-1">
              <span
                className={`button-text nav-highlight px-3 py-1 border border-gray-500/50 rounded text-xs cursor-pointer min-w-[70px] text-center hover:bg-gray-700/20`}
                onClick={() => handleItemClick(instruction.key)}
              >
                <SplitFlapText
                  text={instruction.text}
                  isAnimating={isAnimating && animationStep > index}
                  delay={index * 50}
                />
              </span>
              {instruction.key === 'd' && (
                <>
                  <span className="text-gray-500 select-none px-1">|</span>
                  <span
                    className={`px-3 py-1 border rounded text-xs cursor-pointer min-w-[70px] text-center border-blue-500/55 text-blue-400 hover:bg-blue-500/25 transition-all duration-200`}
                    onClick={() => {
                      // Reset to current user's profile by passing the wallet address
                      // This will load the current user's profile instead of refreshing the searched profile
                      if (onProfileSearch && wallet?.address) {
                        onProfileSearch(wallet.address);
                      }
                    }}
                  >
                    <SplitFlapText
                      text="RESET"
                      isAnimating={isAnimating && animationStep > index}
                      delay={index * 50 + 30}
                    />
                  </span>
                </>
              )}
            </div>
          ) : (
            <>
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
                          : (instruction.key === 'd' || instruction.key === 's') &&
                              (mode === 'profile' || mode === 'memory-detail')
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
                    className={`feature-desc cursor-pointer ${
                      instruction.key === '🏋️'
                        ? 'ai-highlight'
                        : instruction.key === '🏆'
                          ? 'blockchain-highlight'
                          : instruction.key === '🎯'
                            ? 'challenge-highlight'
                            : ''
                    }`}
                    onClick={() => {
                      // No click action needed for other modes
                    }}
                  >
                    <SplitFlapText
                      text={instruction.desc}
                      isAnimating={isAnimating && animationStep > index}
                      delay={index * 50 + 100}
                    />
                  </span>
                </>
              )}
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

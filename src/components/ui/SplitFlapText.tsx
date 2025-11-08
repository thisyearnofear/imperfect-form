'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '@/styles/split-flap.css';
import { usePlatform } from '@/contexts/PlatformContext';
import { getMemoryClient, type IdentityNode } from '@/services/memoryApi';

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

type InstructionMode = 'instructions' | 'settings' | 'profile' | 'memory' | 'memory-detail';

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
  isFullscreenAvailable = true,
  formattedStats,
  isLoadingStats,
}) => {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { wallet, user: farcasterUser } = usePlatform();
  const [memoryData, setMemoryData] = useState<{
    identities: IdentityNode[];
    socialStats: { totalFollowers: number; platforms: string[] };
  } | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);

  // Load memory data when entering memory mode
  useEffect(() => {
    if (mode === 'memory' && wallet?.address && !memoryData && !loadingMemory) {
      const loadMemoryData = async () => {
        setLoadingMemory(true);
        try {
          const client = getMemoryClient();
          if (client && wallet.address) {
            const walletIdentityGraph = await client.getIdentityGraphByWallet(wallet.address);
            if (Array.isArray(walletIdentityGraph)) {
              const identities = walletIdentityGraph;
              const socialStats = {
                totalFollowers: identities.reduce(
                  (total: number, id: IdentityNode) => total + (id.social?.followers || 0),
                  0
                ),
                platforms: [...new Set(identities.map((id: IdentityNode) => id.platform))],
              };
              setMemoryData({ identities, socialStats });
            }
          }
        } catch (error) {
          console.warn('Failed to load memory data:', error);
        } finally {
          setLoadingMemory(false);
        }
      };
      loadMemoryData();
    }
  }, [mode, wallet?.address, memoryData, loadingMemory]);

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
        { key: 'b', text: 'ORIENTATION', desc: 'auto-lock' },
        { key: 'c', text: 'THEME', desc: 'retro' },
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
          desc: '',
          hideKey: true,
        },
        {
          key: 'e',
          text: 'MORE →',
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
  }, [mode, formattedStats, isLoadingStats, autoFs, isFullscreenAvailable]);

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
        }
        break;

      case 'memory':
        if (key === 'd') {
          // Switch back to profile view
          onModeChange('profile');
        } else if (key === 'e') {
          // Switch to memory detail view
          onModeChange('memory-detail');
        }
        break;

      case 'memory-detail':
        if (key === 'd') {
          // Switch back to memory view
          onModeChange('memory');
        }
        break;

      case 'instructions':
        // Instructions are read-only, no click actions
        break;
    }
  };

  return (
    <div id="instructions" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Memory profile content - styled like settings mode */}
      {mode === 'memory' && (
        <div className="space-y-1">
          <p className="profile-instruction">
            <span className="button-text start">WALLET</span> ={' '}
            <span
              className="text-[#fcb131] font-mono cursor-pointer hover:text-yellow-400 transition-colors"
              onClick={() =>
                navigator.clipboard.writeText(
                  wallet?.address || '0x55A5705453Ee82c742274154136Fce8149597058'
                )
              }
            >
              {wallet?.address
                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                : '0x55A5...7058'}
            </span>
          </p>
          <p className="profile-instruction">
            <span className="button-text stop">🟣 FARCASTER</span> ={' '}
            <span
              className="text-purple-300 cursor-pointer hover:text-purple-100 transition-colors"
              onClick={() =>
                window.open(`https://farcaster.xyz/${farcasterUser?.username || 'papa'}`, '_blank')
              }
            >
              {memoryData
                ? memoryData.identities
                    .find((id) => id.platform === 'farcaster')
                    ?.social?.followers?.toLocaleString() || '0'
                : 'Loading...'}{' '}
              followers
            </span>
          </p>
          <p className="profile-instruction">
            <span className="button-text reset">🐦 TWITTER</span> ={' '}
            <span
              className="text-blue-300 cursor-pointer hover:text-blue-100 transition-colors"
              onClick={() =>
                window.open(
                  `https://x.com/${memoryData?.identities.find((id) => id.platform === 'twitter')?.username || 'unknown'}`,
                  '_blank'
                )
              }
            >
              {memoryData
                ? memoryData.identities
                    .find((id) => id.platform === 'twitter')
                    ?.social?.followers?.toLocaleString() || '0'
                : 'Loading...'}{' '}
              followers
            </span>
          </p>
          <p className="profile-instruction">
            <span className="button-text fun-highlight">👁️ LENS</span> ={' '}
            <span
              className="text-cyan-300 cursor-pointer hover:text-cyan-100 transition-colors"
              onClick={() =>
                window.open(
                  `https://hey.xyz/u/${memoryData?.identities.find((id) => id.platform === 'lens')?.username || 'unknown'}`,
                  '_blank'
                )
              }
            >
              {memoryData
                ? memoryData.identities
                    .find((id) => id.platform === 'lens')
                    ?.social?.followers?.toLocaleString() || '0'
                : 'Loading...'}{' '}
              followers
            </span>
          </p>
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
          }`}
          onClick={() => {
            if (instruction.key === 'd' && mode === 'memory') {
              // Handle both BACK and MORE clicks on the same line
              // The click handler will determine which part was clicked
              handleItemClick(instruction.key);
            } else {
              handleItemClick(instruction.key);
            }
          }}
          style={{
            cursor:
              (mode === 'settings' && (instruction.key === 'a' || instruction.key === 'd')) ||
              (mode === 'profile' && instruction.key === 'd') ||
              (mode === 'memory' && (instruction.key === 'd' || instruction.key === 'e'))
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
                    ? mode === 'memory'
                      ? 'memory-highlight'
                      : 'reset'
                    : instruction.key === '⚡'
                      ? 'fun-highlight'
                      : instruction.key === 'd' &&
                          (mode === 'profile' || mode === 'memory' || mode === 'memory-detail')
                        ? 'nav-highlight'
                        : instruction.key === 'e' && mode === 'memory'
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
          {instruction.desc && (
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
                        : instruction.key === 'e' && mode === 'memory'
                          ? 'text-green-400 hover:text-green-300 underline transition-colors'
                          : ''
                }`}
                onClick={() => {
                  if (instruction.key === 'e' && mode === 'memory') {
                    onModeChange('memory-detail');
                  }
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

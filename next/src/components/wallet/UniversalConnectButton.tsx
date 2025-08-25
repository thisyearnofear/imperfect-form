'use client';

import React, { useState, useEffect } from 'react';
import { chainConfigs } from '@/utils/chainSwitching';
import { usePlatform } from '@/contexts/PlatformContext';
import { Spinner } from '@/components/ui';
import useDeviceDetect from '@/hooks/useDeviceDetect';
import { getBestDisplayName } from '@/utils/web3bio';
import { useClientOnly } from '@/hooks/useClientOnly';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { useRobustThemeSwitching } from '@/hooks/useRobustThemeSwitching';
import { useVerificationStatus } from '@/components/verification/hooks/useVerificationStatus';
import VerificationBadge from '@/components/verification/VerificationBadge';

interface UniversalConnectButtonProps {
  onConnected?: (address: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProfileWhenConnected?: boolean;
  // New props for mode management
  currentMode?: 'instructions' | 'settings' | 'profile';
  onModeChange?: (mode: 'instructions' | 'settings' | 'profile') => void;
  workoutStarted?: boolean;
}

/**
 * Universal Connect Button - One button that works everywhere
 * Maintains your existing awesome UI/UX while simplifying the backend
 */
export default function UniversalConnectButton({
  onConnected,
  className = '',
  size = 'md',
  showProfileWhenConnected = true,
  currentMode = 'instructions',
  onModeChange,
  workoutStarted = false,
}: UniversalConnectButtonProps) {
  const { platform, user, wallet, actions, isReady } = usePlatform();
  const { isConnected, address, chainId, isConnecting } = wallet;
  const { currentTheme } = useEnhancedChainTheme();
  const {
    switchToChain,
    isLoading: isThemeSwitching,
    error: themeSwitchingError,
    getAvailableThemes,
    retry: retryThemeSwitch,
  } = useRobustThemeSwitching();
  const isInFarcaster = platform === 'farcaster';
  const farcasterUser = user;
  const displayName =
    user?.displayName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : undefined);
  const { connect, disconnect } = actions;

  const { isMobile, isWalletBrowser } = useDeviceDetect();
  const hasMounted = useClientOnly();
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string | undefined>();
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);

  // Check verification status for connected user
  const { isVerified } = useVerificationStatus();

  // Get network name from chainId using centralized config
  const getNetworkName = (id: number | undefined) => {
    if (!id) return 'Unknown';
    for (const [, config] of Object.entries(chainConfigs)) {
      if (config.id === id) {
        return config.name;
      }
    }
    return 'Unknown';
  };

  const networkName = getNetworkName(chainId || undefined);

  // Debug chainId changes (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('UniversalConnectButton: ChainId changed to', chainId, 'Network:', networkName);
    }
  }, [chainId, networkName]);

  // Helper function to get theme colors
  const getThemeColor = (themeId: string) => {
    const colorMap = {
      base: '#0052ff',
      polygon: '#8247e5',
      celo: '#10b981',
      monad: '#555555',
    };
    return colorMap[themeId as keyof typeof colorMap] || '#fcb131';
  };

  const handleNetworkSwitch = async (targetChainId: number) => {
    console.log('UniversalConnectButton: Switching to chain', targetChainId);
    setShowNetworkSwitcher(false);

    // Use the robust theme switching system
    const success = await switchToChain(targetChainId);

    if (!success) {
      console.error('UniversalConnectButton: Network switch failed');
      // Show retry option if there's an error
      if (themeSwitchingError) {
        setTimeout(() => {
          const shouldRetry = window.confirm(
            `Failed to switch network: ${themeSwitchingError}\n\nWould you like to retry?`
          );
          if (shouldRetry) {
            retryThemeSwitch();
          }
        }, 1000);
      }
    }
  };

  // Resolve ENS/web3bio display name
  useEffect(() => {
    if (address && hasMounted) {
      // Priority 1: Farcaster username if in mini app
      if (isInFarcaster && farcasterUser?.username) {
        setResolvedDisplayName(`@${farcasterUser.username}`);
        return;
      }

      // Priority 2: Farcaster display name
      if (isInFarcaster && farcasterUser?.displayName) {
        setResolvedDisplayName(farcasterUser.displayName);
        return;
      }

      // Priority 3: Web3bio/ENS resolution
      getBestDisplayName(address)
        .then((name) => {
          if (name && name !== address) {
            setResolvedDisplayName(name);
          } else {
            // Fallback to shortened address
            setResolvedDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
          }
        })
        .catch(() => {
          // Fallback to shortened address on error
          setResolvedDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
        });
    }
  }, [address, isInFarcaster, farcasterUser, hasMounted]);

  // Call onConnected when address changes
  useEffect(() => {
    if (address && onConnected) {
      onConnected(address);
    }
  }, [address, onConnected]);

  // Loading state during initialization
  if (!hasMounted || !isReady) {
    return (
      <div className={`flex items-center justify-center ${getSizeClasses(size)} ${className}`}>
        <Spinner />
      </div>
    );
  }

  // Connected state with profile display
  if (isConnected && address && showProfileWhenConnected) {
    return (
      <div className={`flex items-center gap-2 ${className} relative`}>
        {/* User Profile Display - keeping your existing styling */}
        <div
          className={`
          flex items-center gap-2 bg-green-900/50 border border-green-500 rounded-lg px-3 py-2 
          transition-all hover:bg-green-800/50 hover:border-green-400
          ${getSizeClasses(size)}
        `}
        >
          {/* Farcaster Profile Picture */}
          {farcasterUser?.pfpUrl && (
            <div
              className="w-6 h-6 rounded-full border border-green-400 bg-cover bg-center"
              style={{ backgroundImage: `url(${farcasterUser.pfpUrl})` }}
            />
          )}

          {/* User Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className="font-bold text-sm"
                style={{
                  color: '#fcb131',
                  textShadow: '0 0 12px rgba(252, 177, 49, 0.8), 0 0 24px rgba(252, 177, 49, 0.4)',
                  background:
                    'linear-gradient(135deg, rgba(252, 177, 49, 0.1), rgba(252, 177, 49, 0.05))',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid rgba(252, 177, 49, 0.2)',
                }}
              >
                {resolvedDisplayName || displayName}
              </span>
              <VerificationBadge isVerified={isVerified} size="sm" />
            </div>
            {isInFarcaster && farcasterUser?.username && (
              <span className="text-green-400 text-xs">@{farcasterUser.username}</span>
            )}
          </div>

          {/* Network Indicator - Simplified */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <button
              onClick={() => setShowNetworkSwitcher(!showNetworkSwitcher)}
              className="text-xs text-green-300 hover:text-green-200 transition-colors cursor-pointer font-medium"
              title={`Current: ${networkName} - Click to switch networks`}
            >
              {networkName}
            </button>
          </div>
        </div>

        {/* Horizontal Network Switcher - Expands left and right */}
        {showNetworkSwitcher && (
          <>
            {/* Backdrop to close switcher */}
            <div className="fixed inset-0 z-[2100]" onClick={() => setShowNetworkSwitcher(false)} />
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[2101]">
              <div className="flex items-center gap-2 bg-black/95 border-2 border-[#fcb131] rounded-lg p-3 shadow-[0_0_20px_rgba(252,177,49,0.5)] backdrop-blur-sm">
                {getAvailableThemes().map((theme) => {
                  const isCurrentTheme = currentTheme.id === theme.id;
                  const isLoading = isThemeSwitching;

                  return (
                    <button
                      key={theme.id}
                      onClick={() => handleNetworkSwitch(theme.chainId)}
                      disabled={isCurrentTheme || isLoading}
                      className={`
                        flex flex-col items-center gap-1 p-3 rounded-lg text-xs font-bold
                        transition-all duration-200 border-2 min-w-[60px]
                        ${
                          isCurrentTheme
                            ? 'bg-[#fcb131]/20 border-[#fcb131] text-[#fcb131] cursor-default'
                            : 'bg-black/50 border-gray-600 text-gray-300 hover:bg-[#fcb131]/10 hover:border-[#fcb131]/50 hover:text-[#fcb131]'
                        }
                        ${isLoading ? 'opacity-50 cursor-wait' : ''}
                      `}
                      title={`Switch to ${theme.name}`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{
                          backgroundColor: isCurrentTheme
                            ? currentTheme.palette.primary
                            : getThemeColor(theme.id),
                        }}
                      />
                      <span className="text-[10px] leading-tight text-center">
                        {theme.name.split(' ')[0]}
                      </span>

                      {isCurrentTheme && <div className="text-[#fcb131] text-xs">✓</div>}

                      {isLoading && (
                        <div className="w-3 h-3 border border-[#fcb131] border-t-transparent rounded-full animate-spin" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Error Display */}
              {themeSwitchingError && (
                <div className="mt-2 p-2 bg-red-900/90 border border-red-500 rounded text-xs text-red-300 max-w-xs">
                  <div className="font-medium mb-1">Switch Failed</div>
                  <div className="text-red-400 text-[10px]">{themeSwitchingError}</div>
                  <button
                    onClick={retryThemeSwitch}
                    className="mt-1 text-red-300 hover:text-red-200 underline text-xs"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Profile Button */}
        {onModeChange && (
          <button
            onClick={() =>
              !workoutStarted &&
              onModeChange(currentMode === 'profile' ? 'instructions' : 'profile')
            }
            disabled={workoutStarted}
            className={`
              px-3 py-2 rounded-lg text-sm font-bold
              transition-all duration-200 hover:scale-105 active:scale-95
              border
              ${
                workoutStarted
                  ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed opacity-50'
                  : currentMode === 'profile'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 border-purple-400 text-white hover:from-purple-700 hover:to-blue-700 hover:border-purple-300 shadow-lg shadow-purple-500/25'
                    : 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-400/50 text-purple-200 hover:from-purple-600/40 hover:to-blue-600/40 hover:border-purple-300'
              }
            `}
            title={workoutStarted ? 'Profile disabled during workout' : 'View Profile'}
          >
            👤
          </button>
        )}

        {/* Settings Button */}
        {onModeChange && (
          <button
            onClick={() =>
              !workoutStarted && onModeChange(currentMode === 'settings' ? 'profile' : 'settings')
            }
            disabled={workoutStarted}
            className={`
              px-3 py-2 rounded-lg text-sm font-bold
              transition-all duration-200 hover:scale-105 active:scale-95
              border
              ${
                workoutStarted
                  ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed opacity-50'
                  : currentMode === 'settings'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 border-yellow-400 text-white hover:from-yellow-600 hover:to-orange-600 hover:border-yellow-300 shadow-lg shadow-yellow-500/25'
                    : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/50 text-yellow-200 hover:from-yellow-500/40 hover:to-orange-500/40 hover:border-yellow-300'
              }
            `}
            title={workoutStarted ? 'Settings disabled during workout' : 'Settings'}
          >
            ⚙️
          </button>
        )}

        {/* Disconnect Button - maintaining your button styling */}
        <button
          onClick={disconnect}
          className="
            bg-red-600 hover:bg-red-700 active:bg-red-800
            text-white px-3 py-2 rounded-lg text-sm
            transition-all duration-200 hover:scale-105 active:scale-95
            border border-red-500 hover:border-red-400
            font-bold
          "
          title="Disconnect wallet"
        >
          ✕
        </button>
      </div>
    );
  }

  // Handle connect with debug logging
  const handleConnect = async () => {
    console.log('🔗 UniversalConnectButton: Connect clicked', {
      platform,
      isConnected,
      isConnecting,
      isReady,
    });
    try {
      // On desktop/mobile, this will now open the wallet selector modal
      // The `connect` function in the context handles the logic.
      await connect();
    } catch (error) {
      console.error('🔗 UniversalConnectButton: Connect error', error);
    }
  };

  // Connection Button - maintaining your existing beautiful styling
  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`
        relative overflow-hidden font-bold rounded-lg transition-all duration-300
        ${getSizeClasses(size)}
        ${
          isConnecting
            ? 'bg-gray-600 cursor-not-allowed border border-gray-500'
            : `
            bg-gradient-to-r from-purple-900 to-blue-900 
            hover:from-purple-800 hover:to-blue-800 
            active:from-purple-700 active:to-blue-700
            border border-purple-500 hover:border-purple-400
            active:scale-95 hover:scale-105
            shadow-lg hover:shadow-xl hover:shadow-purple-500/25
          `
        }
        ${className}
      `}
    >
      {isConnecting ? (
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <span className="animate-shimmer">
            {getConnectingText(isInFarcaster, isWalletBrowser)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {/* Context-aware icon with animation */}
          <span className="text-lg animate-bounce">
            {getContextIcon(isInFarcaster, isWalletBrowser, isMobile)}
          </span>

          {/* Context-aware text */}
          <span className="animate-shimmer">
            {getConnectText(isInFarcaster, farcasterUser, isWalletBrowser)}
          </span>
        </div>
      )}

      {/* Animated gradient overlay - keeping your existing effect */}
      {!isConnecting && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"></div>
      )}

      {/* Pulse animation for extra flair */}
      {!isConnected && !isConnecting && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 animate-pulse"></div>
      )}
    </button>
  );
}

// Helper function to get size-specific classes
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'px-3 py-1.5 text-sm';
    case 'lg':
      return 'px-6 py-4 text-lg';
    default:
      return 'px-4 py-2 text-base';
  }
}

// Context-aware icons
function getContextIcon(
  isInFarcaster: boolean,
  isWalletBrowser: boolean,
  isMobile: boolean
): string {
  if (isInFarcaster) return '🎭';
  if (isWalletBrowser) return '📱';
  if (isMobile) return '🔗';
  return '🚀';
}

// Context-aware connect text
function getConnectText(
  isInFarcaster: boolean,
  farcasterUser: { displayName?: string; username?: string } | null,
  isWalletBrowser: boolean
): string {
  if (isInFarcaster && farcasterUser?.username) {
    return `GM @${farcasterUser.username}! Sign In`;
  }
  if (isInFarcaster && farcasterUser?.displayName) {
    return `GM ${farcasterUser.displayName}! Sign In`;
  }
  if (isInFarcaster) {
    return 'GM Anon! Sign In';
  }
  if (isWalletBrowser) {
    return 'Sign In';
  }
  return 'Sign In';
}

// Context-aware connecting text
function getConnectingText(isInFarcaster: boolean, isWalletBrowser: boolean): string {
  if (isInFarcaster) return 'Connecting...';
  if (isWalletBrowser) return 'Opening...';
  return 'Connecting...';
}

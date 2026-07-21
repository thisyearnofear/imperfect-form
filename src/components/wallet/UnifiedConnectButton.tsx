'use client';

import React, { useState, useEffect } from 'react';
import { chainConfigs, SupportedChain } from '@/utils/chainSwitching';
import { usePlatform, useWallet, usePlatformFeatures } from '@/contexts/PlatformContext';
import { Spinner } from '@/components/ui';
import { getBestDisplayName } from '@/utils/web3bio';
import { useClientOnly } from '@/hooks/useClientOnly';
import ChainSelector from '@/components/network/ChainSelector';
import { recoverWalletConnection } from '@/utils/walletConnectionRecovery';
import toast from 'react-hot-toast';

interface UnifiedConnectButtonProps {
  onConnected?: (address: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showProfileWhenConnected?: boolean;
  // Enhanced props for clean 4-section layout
  currentMode?: 'instructions' | 'settings' | 'profile';
  onModeChange?: (mode: 'instructions' | 'settings' | 'profile') => void;
  workoutStarted?: boolean;
}

/**
 * ENHANCED UnifiedConnectButton - Enhanced with wallet recovery functionality
 * Following Core Principles: Enhanced existing component instead of creating new one
 */
export default function UnifiedConnectButton({
  onConnected,
  className = '',
  size = 'md',
  showProfileWhenConnected = true,
  currentMode = 'instructions',
  onModeChange,
  workoutStarted = false,
}: UnifiedConnectButtonProps) {
  const { platform, user, isReady } = usePlatform();
  const { isConnected, address, chainId, isConnecting, connect, disconnect } = useWallet();
  const { canSwitchChains } = usePlatformFeatures();
  const hasMounted = useClientOnly();
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string | undefined>();
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);

  // ENHANCEMENT: Add wallet recovery state
  const [isRecovering, setIsRecovering] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');

  // Get network name from chainId using centralized config
  const getNetworkName = (id: number | null) => {
    if (!id) return 'Unknown';
    for (const [, config] of Object.entries(chainConfigs)) {
      if (config.id === id) {
        return config.name;
      }
    }
    return 'Unknown';
  };

  const networkName = getNetworkName(chainId);

  // Resolve display name
  useEffect(() => {
    if (!address) {
      setResolvedDisplayName(undefined);
      return;
    }

    const resolveDisplayName = async () => {
      try {
        // Use Farcaster user name if available
        if (user?.displayName) {
          setResolvedDisplayName(user.displayName);
          return;
        }

        // Try to resolve ENS/other names
        const resolved = await getBestDisplayName(address);
        setResolvedDisplayName(resolved || `${address.slice(0, 6)}...${address.slice(-4)}`);
      } catch {
        setResolvedDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
      }
    };

    resolveDisplayName();
  }, [address, user]);

  // Call onConnected when address changes
  useEffect(() => {
    if (address && onConnected) {
      onConnected(address);
    }
  }, [address, onConnected]);

  // Handle connection with recovery
  const handleConnect = async () => {
    try {
      setConnectionError('');

      // First try normal connection
      const success = await connect();

      // If success is false, it means either:
      // 1. Connection failed
      // 2. No connectorId was provided, so the modal was opened (this is NOT a failure)
      if (!success) {
        // We only want to attempt recovery if we actually failed to connect with a specific provider
        // or if the modal didn't open.
        // For now, let's just avoid recovery if connect() returns false,
        // as PlatformContext.connect() returns false when it opens the modal.
        return;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Connection failed';
      setConnectionError(errorMsg);
      toast.error('Connection failed');
    } finally {
      setIsRecovering(false);
    }
  };

  // ENHANCEMENT: Add wallet recovery function
  const handleRecovery = async () => {
    setIsRecovering(true);
    setConnectionError('');

    try {
      const result = await recoverWalletConnection({
        maxRetries: 3,
        enableCleanup: true,
        enableFarcasterValidation: true,
        showToasts: true,
      });

      if (result.success) {
        toast.success('Wallet connection restored!');
      } else {
        setConnectionError(result.error || 'Recovery failed');
        toast.error('Unable to restore wallet connection');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Recovery failed';
      setConnectionError(errorMsg);
      toast.error('Wallet recovery failed');
    } finally {
      setIsRecovering(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setShowNetworkSwitcher(false);
  };

  // Size classes
  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-2 px-3 text-sm',
    lg: 'py-3 px-4 text-base',
  };

  // Platform-specific styling
  const getPlatformStyles = () => {
    switch (platform) {
      case 'farcaster':
        return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700';
      case 'mobile':
        return 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700';
      case 'desktop':
        return 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700';
      case 'pwa':
        return 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700';
      default:
        return 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800';
    }
  };

  // Don't render until mounted to prevent hydration issues
  if (!hasMounted || !isReady) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gray-300 animate-pulse rounded-lg`}>
        <div className="w-24 h-6 bg-gray-400 rounded"></div>
      </div>
    );
  }

  // ENHANCEMENT: Responsive 4-section layout with mobile-optimized two-row design
  if (isConnected && address && showProfileWhenConnected) {
    return (
      <div className={`${className} relative`}>
        {/* Mobile: Two-row layout for better spacing and readability */}
        <div className="block sm:hidden">
          {/* Row 1: Username and Network */}
          <div className="flex items-center gap-2 mb-2">
            {/* Section 1: User Profile Display */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 flex-1 min-w-0">
              <span className="text-white text-sm font-medium truncate block">
                {resolvedDisplayName || `${address.slice(0, 6)}...${address.slice(-4)}`}
              </span>
            </div>

            {/* Section 2: Network Switcher - Show full network name on mobile */}
            <button
              onClick={() => setShowNetworkSwitcher(!showNetworkSwitcher)}
              className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors touch-manipulation flex-shrink-0"
              aria-label={`Switch network (${networkName})`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    chainId === chainConfigs[SupportedChain.CELO].id
                      ? 'bg-green-400'
                      : chainId === chainConfigs[SupportedChain.POLYGON].id
                        ? 'bg-purple-400'
                        : chainId === chainConfigs[SupportedChain.BASE].id
                          ? 'bg-blue-400'
                          : chainId === chainConfigs[SupportedChain.MONAD].id
                            ? 'bg-yellow-400'
                            : chainId === chainConfigs[SupportedChain.AVALANCHE].id
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                  }`}
                ></div>
                {/* ENHANCEMENT: Always show full network name on mobile */}
                <span className="text-white text-sm font-medium">{networkName}</span>
              </div>
            </button>
          </div>

          {/* Row 2: Profile and Settings */}
          <div className="flex items-center gap-2">
            {/* Section 3: Profile Button */}
            {onModeChange && (
              <button
                onClick={() => {
                  if (workoutStarted) return;
                  if (currentMode === 'profile') {
                    handleDisconnect();
                  } else {
                    onModeChange('profile');
                  }
                }}
                disabled={workoutStarted}
                className={`bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors touch-manipulation flex-1 ${
                  currentMode === 'profile' ? 'bg-white/30' : ''
                } ${workoutStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={currentMode === 'profile' ? 'Logout' : 'Open profile'}
              >
                <span className="text-white text-sm font-medium">
                  {currentMode === 'profile' ? 'Logout' : 'Profile'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop/Tablet: Single row layout (original design) */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Section 1: User Profile Display */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 min-w-0">
            <span className="text-white text-sm font-medium truncate block max-w-[120px]">
              {resolvedDisplayName || `${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
          </div>

          {/* Section 2: Network Switcher */}
          <button
            onClick={() => setShowNetworkSwitcher(!showNetworkSwitcher)}
            className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors touch-manipulation"
            aria-label={`Switch network (${networkName})`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  chainId === chainConfigs[SupportedChain.CELO].id
                    ? 'bg-green-400'
                    : chainId === chainConfigs[SupportedChain.POLYGON].id
                      ? 'bg-purple-400'
                      : chainId === chainConfigs[SupportedChain.BASE].id
                        ? 'bg-blue-400'
                        : chainId === chainConfigs[SupportedChain.MONAD].id
                          ? 'bg-yellow-400'
                          : chainId === chainConfigs[SupportedChain.AVALANCHE].id
                            ? 'bg-red-500'
                            : 'bg-gray-400'
                }`}
              ></div>
              <span className="text-white text-sm">{networkName}</span>
            </div>
          </button>

          {/* Section 3: Profile Button */}
          {onModeChange && (
            <button
              onClick={() => {
                if (workoutStarted) return;
                if (currentMode === 'profile') {
                  handleDisconnect();
                } else {
                  onModeChange('profile');
                }
              }}
              disabled={workoutStarted}
              className={`bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors touch-manipulation ${
                currentMode === 'profile' ? 'bg-white/30' : ''
              } ${workoutStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label={currentMode === 'profile' ? 'Logout' : 'Open profile'}
            >
              <span className="text-white text-sm">
                {currentMode === 'profile' ? 'Logout' : 'Profile'}
              </span>
            </button>
          )}
        </div>

        {/* Network switcher - use proper ChainSelector dialog */}
        {showNetworkSwitcher && canSwitchChains && (
          <ChainSelector onClose={() => setShowNetworkSwitcher(false)} />
        )}

        {/* Simple disconnect option when network switcher is active */}
        {showNetworkSwitcher && (
          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[9998] min-w-32">
            <div className="p-2">
              <button
                onClick={handleDisconnect}
                className="w-full text-left px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Connection state with enhanced error handling
  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={isConnecting || isRecovering}
        className={`
          ${sizeClasses[size]}
          ${getPlatformStyles()}
          ${className}
          text-white font-semibold rounded-lg
          transition-all duration-200 transform hover:scale-105
          shadow-lg hover:shadow-xl
          flex items-center justify-center space-x-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
          w-full
        `}
      >
        {isConnecting || isRecovering ? (
          <>
            <Spinner />
            <span className="sm:hidden">{isRecovering ? 'Recovering...' : 'Connecting...'}</span>
            <span className="hidden sm:inline">
              {isRecovering ? 'Recovering...' : 'Connecting...'}
            </span>
          </>
        ) : (
          <>
            <span className="sm:hidden">Connect</span>
            <span className="hidden sm:inline">Connect Wallet</span>
          </>
        )}
      </button>

      {/* ENHANCEMENT: Show connection error and recovery option */}
      {connectionError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-700 dark:text-red-300 text-sm mb-2">{connectionError}</p>
          <button
            onClick={handleRecovery}
            disabled={isRecovering}
            className="text-red-600 dark:text-red-400 text-sm font-medium hover:underline disabled:opacity-50"
          >
            {isRecovering ? 'Recovering...' : 'Try Recovery'}
          </button>
        </div>
      )}
    </div>
  );
}

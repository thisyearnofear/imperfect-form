'use client';

import React, { useState, useEffect } from 'react';
import { chainConfigs, SupportedChain } from '@/utils/chainSwitching';
import { usePlatform, useWallet, usePlatformFeatures } from '@/contexts/PlatformContext';
import { Spinner } from '@/components/ui';
import { getBestDisplayName } from '@/utils/web3bio';
import { useClientOnly } from '@/hooks/useClientOnly';
import ChainSelector from '@/components/network/ChainSelector';

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
 * ENHANCED UnifiedConnectButton - Restored clean 4-section layout
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

  // Handle connection
  const handleConnect = () => {
    connect();
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

  // ENHANCED: Clean 4-section layout when connected
  if (isConnected && address && showProfileWhenConnected) {
    return (
      <div className={`${className} flex items-center gap-2 relative`}>
        {/* Section 1: User Profile Display */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
          <span className="text-white text-sm font-medium">
            {resolvedDisplayName || `${address.slice(0, 6)}...${address.slice(-4)}`}
          </span>
        </div>

        {/* Section 2: Network Switcher */}
        <button
          onClick={() => setShowNetworkSwitcher(!showNetworkSwitcher)}
          className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                chainId === chainConfigs[SupportedChain.CELO].id
                  ? 'bg-green-400'
                  : chainId === chainConfigs[SupportedChain.POLYGON].id
                    ? 'bg-purple-400'
                    : chainId === chainConfigs[SupportedChain.BASE].id
                      ? 'bg-blue-400'
                      : chainId === chainConfigs[SupportedChain.MONAD].id
                        ? 'bg-yellow-400'
                        : 'bg-gray-400'
              }`}
            ></div>
            <span className="text-white text-sm">{networkName}</span>
          </div>
        </button>

        {/* Section 3: Profile Button */}
        {onModeChange && (
          <button
            onClick={() =>
              !workoutStarted &&
              onModeChange(currentMode === 'profile' ? 'instructions' : 'profile')
            }
            disabled={workoutStarted}
            className={`bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors ${
              currentMode === 'profile' ? 'bg-white/30' : ''
            } ${workoutStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-white text-sm">Profile</span>
          </button>
        )}

        {/* Section 4: Settings Button */}
        {onModeChange && (
          <button
            onClick={() =>
              !workoutStarted &&
              onModeChange(currentMode === 'settings' ? 'instructions' : 'settings')
            }
            disabled={workoutStarted}
            className={`bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors ${
              currentMode === 'settings' ? 'bg-white/30' : ''
            } ${workoutStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-white text-sm">Settings</span>
          </button>
        )}

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

  // Connection state
  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`
        ${sizeClasses[size]}
        ${getPlatformStyles()}
        ${className}
        text-white font-semibold rounded-lg
        transition-all duration-200 transform hover:scale-105
        shadow-lg hover:shadow-xl
        flex items-center justify-center space-x-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      `}
    >
      {isConnecting ? (
        <>
          <Spinner />
          <span className="sm:hidden">Connecting...</span>
          <span className="hidden sm:inline">Connecting...</span>
        </>
      ) : (
        <>
          {/* Platform-specific icon */}
          {platform === 'farcaster' && <span>🎯</span>}
          {platform === 'mobile' && <span>📱</span>}
          {platform === 'desktop' && <span>💻</span>}
          {platform === 'pwa' && <span>🚀</span>}

          {/* Responsive connect text */}
          <span className="sm:hidden">Connect</span>
          <span className="hidden sm:inline">
            Connect {platform === 'farcaster' ? 'Farcaster' : 'Wallet'}
          </span>
        </>
      )}
    </button>
  );
}

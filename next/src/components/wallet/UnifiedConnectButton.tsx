"use client";

import React, { useState, useEffect } from "react";
import { usePlatform, useWallet, usePlatformFeatures } from "@/contexts/PlatformContext";
import { Spinner } from "@/components/ui";
import useDeviceDetect from "@/hooks/useDeviceDetect";
import { getBestDisplayName } from "@/utils/web3bio";
import { useClientOnly } from "@/hooks/useClientOnly";

interface UnifiedConnectButtonProps {
  onConnected?: (address: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showProfileWhenConnected?: boolean;
}

/**
 * Unified Connect Button - Clean, performant, single source of truth
 * Replaces multiple wallet button components with one unified interface
 */
export default function UnifiedConnectButton({
  onConnected,
  className = "",
  size = "md",
  showProfileWhenConnected = true,
}: UnifiedConnectButtonProps) {
  const { platform, user, isReady } = usePlatform();
  const { isConnected, address, chainId, isConnecting, connect, disconnect } = useWallet();
  const { canSwitchChains, defaultChain, preferredChains } = usePlatformFeatures();
  
  const { isMobile } = useDeviceDetect();
  const hasMounted = useClientOnly();
  const [resolvedDisplayName, setResolvedDisplayName] = useState<string | undefined>();
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);

  // Get network name from chainId
  const getNetworkName = (id: number | null) => {
    switch (id) {
      case 84532:
        return "Base Sepolia";
      case 137:
        return "Polygon";
      case 42220:
        return "Celo";
      case 10143:
        return "Monad Testnet";
      default:
        return "Unknown";
    }
  };

  const networkName = getNetworkName(chainId);
  const isOnPreferredChain = chainId ? preferredChains.includes(chainId) : false;

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
  const handleConnect = async () => {
    const success = await connect();
    if (!success) {
      console.error("Connection failed");
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    setShowNetworkSwitcher(false);
  };

  // Size classes
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  // Platform-specific styling
  const getPlatformStyles = () => {
    switch (platform) {
      case "farcaster":
        return "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700";
      case "mobile":
        return "bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700";
      case "desktop":
        return "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700";
      case "pwa":
        return "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700";
      default:
        return "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800";
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

  // Connected state
  if (isConnected && address && showProfileWhenConnected) {
    return (
      <div className={`${className} relative`}>
        <button
          onClick={() => setShowNetworkSwitcher(!showNetworkSwitcher)}
          className={`
            ${sizeClasses[size]}
            ${getPlatformStyles()}
            text-white font-semibold rounded-lg
            transition-all duration-200 transform hover:scale-105
            shadow-lg hover:shadow-xl
            flex items-center space-x-2
            ${!isOnPreferredChain ? "ring-2 ring-yellow-400" : ""}
          `}
        >
          {/* Platform indicator */}
          <div className="flex items-center space-x-2">
            {platform === "farcaster" && (
              <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
            )}
            {platform === "mobile" && (
              <div className="w-2 h-2 bg-green-300 rounded-full"></div>
            )}
            {platform === "desktop" && (
              <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
            )}
            {platform === "pwa" && (
              <div className="w-2 h-2 bg-orange-300 rounded-full"></div>
            )}
            
            <span className="truncate max-w-32">
              {resolvedDisplayName || `${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
          </div>

          {/* Network indicator */}
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${
              chainId === 42220 ? "bg-green-400" :
              chainId === 137 ? "bg-purple-400" :
              chainId === 84532 ? "bg-blue-400" :
              chainId === 10143 ? "bg-yellow-400" :
              "bg-gray-400"
            }`}></div>
            {!isMobile && (
              <span className="text-xs opacity-75">{networkName}</span>
            )}
          </div>
        </button>

        {/* Network switcher dropdown */}
        {showNetworkSwitcher && canSwitchChains && (
          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-48">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">
                Switch Network
              </div>
              
              {preferredChains.map((chain) => (
                <button
                  key={chain}
                  onClick={() => {
                    // TODO: Implement chain switching
                    setShowNetworkSwitcher(false);
                  }}
                  className={`
                    w-full text-left px-3 py-2 rounded-md text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    flex items-center space-x-2
                    ${chainId === chain ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""}
                  `}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    chain === 42220 ? "bg-green-400" :
                    chain === 137 ? "bg-purple-400" :
                    chain === 84532 ? "bg-blue-400" :
                    chain === 10143 ? "bg-yellow-400" :
                    "bg-gray-400"
                  }`}></div>
                  <span>{getNetworkName(chain)}</span>
                  {chainId === chain && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
              
              <hr className="my-2 border-gray-200 dark:border-gray-700" />
              
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
          <span>Connecting...</span>
        </>
      ) : (
        <>
          {/* Platform-specific icon */}
          {platform === "farcaster" && <span>🎯</span>}
          {platform === "mobile" && <span>📱</span>}
          {platform === "desktop" && <span>💻</span>}
          {platform === "pwa" && <span>🚀</span>}
          
          <span>
            Connect {platform === "farcaster" ? "Farcaster" : "Wallet"}
          </span>
        </>
      )}
    </button>
  );
}

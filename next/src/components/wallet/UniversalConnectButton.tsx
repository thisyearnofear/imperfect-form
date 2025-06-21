"use client";

import React, { useState, useEffect } from "react";
import { chainConfigs, SupportedChain } from "@/utils/chainSwitching";
import { usePlatform, useWalletSelector } from "@/contexts/PlatformContext";
import { Spinner } from "@/components/ui";
import useDeviceDetect from "@/hooks/useDeviceDetect";
import { getBestDisplayName } from "@/utils/web3bio";
import { useClientOnly } from "@/hooks/useClientOnly";

interface UniversalConnectButtonProps {
  onConnected?: (address: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showProfileWhenConnected?: boolean;
}

/**
 * Universal Connect Button - One button that works everywhere
 * Maintains your existing awesome UI/UX while simplifying the backend
 */
export default function UniversalConnectButton({
  onConnected,
  className = "",
  size = "md",
  showProfileWhenConnected = true,
}: UniversalConnectButtonProps) {
  const { platform, user, wallet, actions, isReady } = usePlatform();
  const { isConnected, address, chainId, isConnecting } = wallet;
  const isInFarcaster = platform === "farcaster";
  const farcasterUser = user;
  const displayName =
    user?.displayName ||
    (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : undefined);
  const { connect, disconnect, switchChain } = actions;
  const { setOpen: setWalletSelectorOpen } = useWalletSelector();

  const { isMobile, isWalletBrowser } = useDeviceDetect();
  const hasMounted = useClientOnly();
  const [resolvedDisplayName, setResolvedDisplayName] = useState<
    string | undefined
  >();
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);

  // Get network name from chainId using centralized config
  const getNetworkName = (id: number | undefined) => {
    if (!id) return "Unknown";
    for (const [, config] of Object.entries(chainConfigs)) {
      if (config.id === id) {
        return config.name;
      }
    }
    return "Unknown";
  };

  const networkName = getNetworkName(chainId || undefined);

  // Debug chainId changes (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        "UniversalConnectButton: ChainId changed to",
        chainId,
        "Network:",
        networkName
      );
    }
  }, [chainId, networkName]);

  // Available networks for switching using centralized config
  const networks = [
    {
      id: chainConfigs[SupportedChain.BASE].id,
      name: chainConfigs[SupportedChain.BASE].name,
      color: "blue",
    },
    {
      id: chainConfigs[SupportedChain.POLYGON].id,
      name: chainConfigs[SupportedChain.POLYGON].name,
      color: "purple",
    },
    {
      id: chainConfigs[SupportedChain.CELO].id,
      name: chainConfigs[SupportedChain.CELO].name,
      color: "green",
    },
    {
      id: chainConfigs[SupportedChain.MONAD].id,
      name: chainConfigs[SupportedChain.MONAD].name,
      color: "yellow",
    },
  ];

  const handleNetworkSwitch = async (targetChainId: number) => {
    console.log("UniversalConnectButton: Switching to chain", targetChainId);
    setShowNetworkSwitcher(false);
    try {
      await switchChain(targetChainId);
      console.log("UniversalConnectButton: Switch completed");
    } catch (error) {
      console.error("UniversalConnectButton: Switch failed", error);
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
            setResolvedDisplayName(
              `${address.slice(0, 6)}...${address.slice(-4)}`
            );
          }
        })
        .catch(() => {
          // Fallback to shortened address on error
          setResolvedDisplayName(
            `${address.slice(0, 6)}...${address.slice(-4)}`
          );
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
      <div
        className={`flex items-center justify-center ${getSizeClasses(
          size
        )} ${className}`}
      >
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
            <span className="text-green-300 font-medium text-sm animate-shimmer">
              {resolvedDisplayName || displayName}
            </span>
            {isInFarcaster && farcasterUser?.username && (
              <span className="text-green-400 text-xs">
                @{farcasterUser.username}
              </span>
            )}
          </div>

          {/* Network Indicator - Clickable */}
          <div className="flex flex-col items-end relative">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Connected</span>
            </div>
            <button
              onClick={() => setShowNetworkSwitcher(!showNetworkSwitcher)}
              className="text-xs text-green-300 opacity-75 hover:opacity-100 transition-opacity cursor-pointer hover:underline"
              title={`Current: ${networkName} (ID: ${chainId}) - Click to switch`}
            >
              {networkName} ↑
            </button>
          </div>
        </div>

        {/* Network Switcher Dropdown - Outside profile box for better z-index */}
        {showNetworkSwitcher && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-[2100]"
              onClick={() => setShowNetworkSwitcher(false)}
            />
            <div className="absolute bottom-full right-0 mb-2 bg-black border border-gray-700 rounded-lg shadow-xl z-[2101] min-w-[280px]">
              <div className="p-3">
                <div className="text-xs text-gray-400 mb-3 px-1 text-center">
                  Switch Network (Current: {networkName})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {networks.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => handleNetworkSwitch(network.id)}
                      className={`
                        text-left px-2 py-2 rounded text-xs transition-colors
                        ${
                          chainId === network.id
                            ? "bg-green-900 text-green-300 cursor-default"
                            : "hover:bg-gray-800 text-gray-300 hover:text-white"
                        }
                      `}
                      disabled={chainId === network.id}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2 h-2 rounded-full bg-${network.color}-400 flex-shrink-0`}
                        ></div>
                        <span className="truncate text-xs">{network.name}</span>
                        {chainId === network.id && (
                          <span className="ml-auto text-xs">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
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
    console.log("🔗 UniversalConnectButton: Connect clicked", {
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
      console.error("🔗 UniversalConnectButton: Connect error", error);
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
            ? "bg-gray-600 cursor-not-allowed border border-gray-500"
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
function getSizeClasses(size: "sm" | "md" | "lg"): string {
  switch (size) {
    case "sm":
      return "px-3 py-1.5 text-sm";
    case "lg":
      return "px-6 py-4 text-lg";
    default:
      return "px-4 py-2 text-base";
  }
}

// Context-aware icons
function getContextIcon(
  isInFarcaster: boolean,
  isWalletBrowser: boolean,
  isMobile: boolean
): string {
  if (isInFarcaster) return "🎭";
  if (isWalletBrowser) return "📱";
  if (isMobile) return "🔗";
  return "🚀";
}

// Context-aware connect text
function getConnectText(
  isInFarcaster: boolean,
  farcasterUser: { displayName?: string; username?: string } | null,
  isWalletBrowser: boolean
): string {
  if (isInFarcaster && farcasterUser?.username) {
    return `GM @${farcasterUser.username}! Connect Wallet`;
  }
  if (isInFarcaster && farcasterUser?.displayName) {
    return `GM ${farcasterUser.displayName}! Connect Wallet`;
  }
  if (isInFarcaster) {
    return "GM Anon! Connect Wallet";
  }
  if (isWalletBrowser) {
    return "Connect Wallet";
  }
  return "Connect Wallet";
}

// Context-aware connecting text
function getConnectingText(
  isInFarcaster: boolean,
  isWalletBrowser: boolean
): string {
  if (isInFarcaster) return "Connecting...";
  if (isWalletBrowser) return "Opening...";
  return "Connecting...";
}

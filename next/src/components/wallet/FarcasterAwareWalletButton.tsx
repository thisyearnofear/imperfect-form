"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePlatform } from "@/contexts/PlatformContext";
import { createRemoteLogger } from "@/utils/remoteLogger";

// Initialize logger for Farcaster-aware wallet button
const logger = createRemoteLogger("FarcasterAwareWalletButton");

interface FarcasterAwareWalletButtonProps {
  className?: string;
  onWalletConnected?: (
    address: string,
    source: "farcaster" | "external"
  ) => void;
  onWalletDisconnected?: () => void;
}

/**
 * Smart wallet button that prioritizes Farcaster wallet when in mini app context
 * Now simplified to use the unified PlatformContext
 */
export function FarcasterAwareWalletButton({
  className = "",
  onWalletConnected,
  onWalletDisconnected,
}: FarcasterAwareWalletButtonProps) {
  const { platform, user, wallet, actions, error } = usePlatform();
  const { address, isConnecting } = wallet;
  const { connect, disconnect } = actions;
  const isInMiniApp = platform === "farcaster";

  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");

  // Determine the active wallet address and source
  const activeWalletAddress = address;
  const walletSource: "farcaster" | "external" | null =
    platform === "farcaster" ? "farcaster" : address ? "external" : null;

  // Update connection state based on wallet status
  useEffect(() => {
    if (isConnecting) {
      setConnectionState("connecting");
    } else if (activeWalletAddress) {
      setConnectionState("connected");
    } else if (error) {
      setConnectionState("error");
    } else {
      setConnectionState("idle");
    }
  }, [isConnecting, activeWalletAddress, error]);

  // Track if we've already notified about the current connection
  const [hasNotifiedConnection, setHasNotifiedConnection] = useState(false);

  // Notify parent component when wallet connection changes (only once per connection)
  useEffect(() => {
    if (activeWalletAddress && walletSource && !hasNotifiedConnection) {
      logger.info("Wallet connected", {
        address: activeWalletAddress,
        source: walletSource,
        isInMiniApp,
      });
      onWalletConnected?.(activeWalletAddress, walletSource);
      setHasNotifiedConnection(true);
    } else if (
      !activeWalletAddress &&
      connectionState === "idle" &&
      hasNotifiedConnection
    ) {
      logger.info("Wallet disconnected");
      onWalletDisconnected?.();
      setHasNotifiedConnection(false);
    }
  }, [
    activeWalletAddress,
    walletSource,
    connectionState,
    isInMiniApp,
    hasNotifiedConnection,
    onWalletConnected,
    onWalletDisconnected,
  ]);

  // Handle wallet connection - simplified with unified context
  const handleConnect = async () => {
    try {
      setConnectionState("connecting");
      logger.info("Attempting wallet connection", { platform, isInMiniApp });

      const success = await connect();
      if (success) {
        logger.info("Wallet connected successfully", { address, platform });
      } else {
        logger.warn("Wallet connection failed");
        setConnectionState("error");
      }
    } catch (error) {
      logger.error("Wallet connection failed", error);
      setConnectionState("error");
    }
  };

  // Handle wallet disconnection - simplified with unified context
  const handleDisconnect = async () => {
    logger.info("Disconnecting wallet", { source: walletSource });
    await disconnect();
    setConnectionState("idle");
  };

  // Render button based on connection state
  const renderButtonContent = () => {
    switch (connectionState) {
      case "connecting":
        return (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Connecting...</span>
          </div>
        );

      case "connected":
        return (
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center space-x-2">
              {walletSource === "farcaster" &&
              user &&
              typeof user === "object" &&
              user !== null &&
              "pfpUrl" in user &&
              "displayName" in user &&
              "username" in user ? (
                <div className="flex items-center space-x-2">
                  <Image
                    src={(user as { pfpUrl: string }).pfpUrl}
                    alt={(user as { displayName: string }).displayName}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="text-sm font-medium">
                    @{(user as { username: string }).username}
                  </span>
                </div>
              ) : null}
              <span className="text-sm">
                {activeWalletAddress?.slice(0, 6)}...
                {activeWalletAddress?.slice(-4)}
              </span>
            </div>
            {walletSource === "farcaster" && (
              <span className="text-xs opacity-75">Farcaster Wallet</span>
            )}
          </div>
        );

      case "error":
        return (
          <div className="flex items-center space-x-2 text-red-300">
            <span>⚠️</span>
            <span>Connection Failed</span>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center space-y-1">
            <div className="flex items-center space-x-2">
              {isInMiniApp && (
                <Image
                  src="/assets/farcaster.svg"
                  alt="Farcaster"
                  width={20}
                  height={20}
                />
              )}
              <span className="font-bold text-lg">
                {isInMiniApp ? "Farcaster Wallet" : "Connect Wallet"}
              </span>
            </div>
            {isInMiniApp && (
              <div className="flex flex-wrap gap-1 justify-center mt-1">
                <span className="text-xs bg-purple-800 text-white px-2 py-1 rounded">
                  Polygon
                </span>
                <span className="text-xs bg-yellow-800 text-white px-2 py-1 rounded">
                  Monad
                </span>
                <span className="text-xs bg-green-800 text-white px-2 py-1 rounded">
                  Celo
                </span>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <button
      onClick={
        connectionState === "connected" ? handleDisconnect : handleConnect
      }
      disabled={connectionState === "connecting"}
      className={`
        relative px-6 py-3 rounded-lg font-medium transition-all duration-200
        ${
          connectionState === "connected"
            ? "bg-green-600 hover:bg-green-700 text-white"
            : connectionState === "error"
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }
        ${
          connectionState === "connecting"
            ? "opacity-75 cursor-not-allowed"
            : ""
        }
        ${className}
      `}
    >
      {renderButtonContent()}
    </button>
  );
}

/**
 * Compact version of the Farcaster-aware wallet button for mobile
 * Now simplified to use the unified PlatformContext
 */
export function CompactFarcasterWalletButton({
  className = "",
  onWalletConnected,
}: Pick<FarcasterAwareWalletButtonProps, "className" | "onWalletConnected">) {
  const { platform, user, wallet, actions } = usePlatform();
  const { address, isConnecting } = wallet;
  const { connect } = actions;
  const isInMiniApp = platform === "farcaster";

  const activeWalletAddress = address;
  const walletSource: "farcaster" | "external" | null =
    platform === "farcaster" ? "farcaster" : address ? "external" : null;

  const handleConnect = async () => {
    const success = await connect();
    if (success && address) {
      onWalletConnected?.(address, walletSource || "external");
    }
  };

  if (isConnecting) {
    return (
      <div className={`flex items-center justify-center p-2 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (activeWalletAddress) {
    return (
      <div className={`flex items-center space-x-2 p-2 ${className}`}>
        {walletSource === "farcaster" &&
        user &&
        typeof user === "object" &&
        user !== null &&
        "pfpUrl" in user &&
        "displayName" in user ? (
          <Image
            src={(user as { pfpUrl: string }).pfpUrl}
            alt={(user as { displayName: string }).displayName}
            width={24}
            height={24}
            className="rounded-full"
          />
        ) : null}
        <span className="text-sm font-medium">
          {activeWalletAddress.slice(0, 6)}...{activeWalletAddress.slice(-4)}
        </span>
        {walletSource === "farcaster" && (
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
            FC
          </span>
        )}
      </div>
    );
  }

  if (isInMiniApp) {
    return (
      <button
        onClick={handleConnect}
        className={`
          flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700
          text-white rounded-lg text-sm font-medium transition-colors
          ${className}
        `}
      >
        <Image
          src="/assets/farcaster.svg"
          alt="Farcaster"
          width={16}
          height={16}
        />
        <span>Connect</span>
      </button>
    );
  }

  return null;
}

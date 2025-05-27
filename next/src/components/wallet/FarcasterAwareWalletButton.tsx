"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useFarcasterWallet } from "./FarcasterWalletProvider";
import { useConnect, useAccount, useDisconnect } from "wagmi";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
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
 */
export function FarcasterAwareWalletButton({
  className = "",
  onWalletConnected,
  onWalletDisconnected,
}: FarcasterAwareWalletButtonProps) {
  const {
    isInMiniApp,
    user,
    walletAddress: farcasterWalletAddress,
    isLoading: farcasterLoading,
    error: farcasterError,
    connectWallet: connectFarcasterWallet,
  } = useFarcasterWallet();

  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { setWalletProvider } = useWalletProvider();

  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");

  // Determine the active wallet address and source
  const activeWalletAddress = farcasterWalletAddress || wagmiAddress;
  const walletSource: "farcaster" | "external" | null = farcasterWalletAddress
    ? "farcaster"
    : wagmiAddress
    ? "external"
    : null;

  // Update connection state based on wallet status
  useEffect(() => {
    if (farcasterLoading || isConnecting) {
      setConnectionState("connecting");
    } else if (activeWalletAddress) {
      setConnectionState("connected");
    } else if (farcasterError) {
      setConnectionState("error");
    } else {
      setConnectionState("idle");
    }
  }, [farcasterLoading, isConnecting, activeWalletAddress, farcasterError]);

  // Notify parent component when wallet connection changes
  useEffect(() => {
    if (activeWalletAddress && walletSource) {
      logger.info("Wallet connected", {
        address: activeWalletAddress,
        source: walletSource,
        isInMiniApp,
      });
      onWalletConnected?.(activeWalletAddress, walletSource);
    } else if (!activeWalletAddress && connectionState === "idle") {
      logger.info("Wallet disconnected");
      onWalletDisconnected?.();
    }
  }, [
    activeWalletAddress,
    walletSource,
    connectionState,
    isInMiniApp,
    onWalletConnected,
    onWalletDisconnected,
  ]);

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      setConnectionState("connecting");

      // First, try to find the Farcaster connector in Wagmi connectors
      const farcasterConnector = connectors.find(
        (connector) =>
          connector.id === "farcasterFrame" ||
          connector.name.toLowerCase().includes("farcaster")
      );

      if (farcasterConnector && isInMiniApp) {
        // Use the official Farcaster Wagmi connector
        logger.info(
          "Attempting Farcaster wallet connection via Wagmi connector"
        );

        try {
          connect({ connector: farcasterConnector });
          return; // Let Wagmi handle the connection state
        } catch (farcasterError) {
          logger.error("Farcaster Wagmi connector failed", farcasterError);
        }
      }

      // Fallback: Try the manual Farcaster SDK approach if in mini app
      if (isInMiniApp) {
        logger.info(
          "Attempting Farcaster wallet connection via SDK (fallback)"
        );

        // Add timeout to prevent hanging (reduced to 8 seconds)
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error("Farcaster wallet connection timeout after 8 seconds")
              ),
            8000
          );
        });

        try {
          const farcasterAddress = await Promise.race([
            connectFarcasterWallet(),
            timeoutPromise,
          ]);

          if (farcasterAddress) {
            logger.info("Farcaster wallet connected successfully via SDK", {
              address: farcasterAddress,
            });
            // Set wallet provider to farcaster when connected
            setWalletProvider("farcaster");
            setConnectionState("connected");
            return;
          } else {
            logger.warn(
              "Farcaster wallet connection returned null - this may indicate the user rejected the connection"
            );
            throw new Error("Farcaster wallet connection returned null");
          }
        } catch (timeoutError) {
          logger.error(
            "Farcaster wallet connection timeout or error",
            timeoutError
          );
          // Don't continue to fallback if it's a timeout - let user try again
          if (
            timeoutError instanceof Error &&
            timeoutError.message.includes("timeout")
          ) {
            setConnectionState("error");
            return;
          }
        }

        logger.warn(
          "Farcaster wallet connection failed, falling back to external wallet"
        );
      }

      // Final fallback to external wallet connection
      const injectedConnector = connectors.find(
        (connector) => connector.type === "injected"
      );

      if (injectedConnector) {
        logger.info("Connecting external wallet", {
          connectorType: injectedConnector.type,
          connectorName: injectedConnector.name,
        });
        connect({ connector: injectedConnector });
      } else {
        throw new Error("No wallet connector available");
      }
    } catch (error) {
      logger.error("Wallet connection failed", error);
      setConnectionState("error");
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    logger.info("Disconnecting wallet", { source: walletSource });

    if (isWagmiConnected) {
      disconnect();
    }

    // Note: Farcaster wallet disconnection is handled by the mini app itself
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
              {walletSource === "farcaster" && user && (
                <div className="flex items-center space-x-2">
                  <Image
                    src={user.pfpUrl}
                    alt={user.displayName}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="text-sm font-medium">@{user.username}</span>
                </div>
              )}
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
          <div className="flex items-center space-x-2">
            {isInMiniApp && (
              <Image
                src="/assets/farcaster.svg"
                alt="Farcaster"
                width={20}
                height={20}
              />
            )}
            <span>
              {isInMiniApp ? "Connect Farcaster Wallet" : "Connect Wallet"}
            </span>
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
 */
export function CompactFarcasterWalletButton({
  className = "",
  onWalletConnected,
}: Pick<FarcasterAwareWalletButtonProps, "className" | "onWalletConnected">) {
  const {
    isInMiniApp,
    user,
    walletAddress: farcasterWalletAddress,
    isLoading: farcasterLoading,
    connectWallet: connectFarcasterWallet,
  } = useFarcasterWallet();

  const { address: wagmiAddress } = useAccount();
  const activeWalletAddress = farcasterWalletAddress || wagmiAddress;
  const walletSource: "farcaster" | "external" | null = farcasterWalletAddress
    ? "farcaster"
    : wagmiAddress
    ? "external"
    : null;

  const handleConnect = async () => {
    if (isInMiniApp) {
      const address = await connectFarcasterWallet();
      if (address) {
        onWalletConnected?.(address, "farcaster");
      }
    }
  };

  if (farcasterLoading) {
    return (
      <div className={`flex items-center justify-center p-2 ${className}`}>
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (activeWalletAddress) {
    return (
      <div className={`flex items-center space-x-2 p-2 ${className}`}>
        {walletSource === "farcaster" && user && (
          <Image
            src={user.pfpUrl}
            alt={user.displayName}
            width={24}
            height={24}
            className="rounded-full"
          />
        )}
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

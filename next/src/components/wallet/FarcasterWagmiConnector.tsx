"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { createRemoteLogger } from "@/utils/remoteLogger";

// Initialize logger
const logger = createRemoteLogger("FarcasterWagmiConnector");

interface FarcasterWagmiConnectorProps {
  className?: string;
  onWalletConnected?: (address: string) => void;
  onWalletDisconnected?: () => void;
}

/**
 * Farcaster wallet connector using the official Wagmi connector approach
 * This replaces the manual SDK approach with the recommended method
 */
export function FarcasterWagmiConnector({
  className = "",
  onWalletConnected,
  onWalletDisconnected,
}: FarcasterWagmiConnectorProps) {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");

  // Find the Farcaster frame connector
  const farcasterConnector = connectors.find(
    (connector) =>
      connector.id === "farcasterFrame" || connector.name.includes("Farcaster")
  );

  // Update connection state based on Wagmi state
  useEffect(() => {
    if (isPending) {
      setConnectionState("connecting");
    } else if (isConnected && address) {
      setConnectionState("connected");
      onWalletConnected?.(address);
    } else if (error) {
      setConnectionState("error");
    } else {
      setConnectionState("idle");
    }
  }, [isPending, isConnected, address, error, onWalletConnected]);

  // Handle disconnection
  useEffect(() => {
    if (!isConnected && connectionState === "connected") {
      onWalletDisconnected?.();
      setConnectionState("idle");
    }
  }, [isConnected, connectionState, onWalletDisconnected]);

  const handleConnect = async () => {
    if (!farcasterConnector) {
      logger.error("Farcaster connector not found");
      setConnectionState("error");
      return;
    }

    try {
      logger.info("Connecting with Farcaster connector");
      connect({ connector: farcasterConnector });
    } catch (err) {
      logger.error("Failed to connect with Farcaster connector", err);
      setConnectionState("error");
    }
  };

  const handleDisconnect = () => {
    logger.info("Disconnecting Farcaster wallet");
    disconnect();
  };

  // If already connected, show connected state
  if (isConnected && address) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2 bg-purple-900/50 border border-purple-500 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-purple-200">
            🎭 {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs bg-red-800 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Show connection button
  return (
    <div className={`${className}`}>
      <button
        onClick={handleConnect}
        disabled={connectionState === "connecting" || !farcasterConnector}
        className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-400 rounded-lg px-4 py-3 transition-all hover:from-purple-800 hover:to-pink-800 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {connectionState === "connecting" ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-white font-medium">Connecting...</span>
          </>
        ) : (
          <>
            <span className="text-2xl">🎭</span>
            <div className="flex flex-col items-start">
              <span className="text-white font-bold text-sm">
                Farcaster Wallet
              </span>
              <span className="text-purple-200 text-xs">
                {farcasterConnector
                  ? "Connect your Warpcast wallet"
                  : "Not available"}
              </span>
            </div>
          </>
        )}
      </button>

      {connectionState === "error" && (
        <div className="mt-2 text-red-400 text-xs text-center">
          {error?.message || "Failed to connect Farcaster wallet"}
        </div>
      )}

      {!farcasterConnector && (
        <div className="mt-2 text-yellow-400 text-xs text-center">
          Farcaster connector not available. Make sure you&apos;re accessing
          this from a Farcaster mini app.
        </div>
      )}
    </div>
  );
}

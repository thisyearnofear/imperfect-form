"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlatform } from "@/contexts/PlatformContext";
import { createRemoteLogger } from "@/utils/remoteLogger";

const logger = createRemoteLogger("AuthenticationFlow");

export type AuthenticationState = 
  | "initializing"     // Platform is loading
  | "unauthenticated"  // No wallet connected
  | "authenticating"   // Connection in progress
  | "authenticated"    // Wallet connected and verified
  | "error";           // Authentication failed

export interface AuthenticationStatus {
  state: AuthenticationState;
  address: string | null;
  platform: string;
  isAutoConnecting: boolean;
  error: string | null;
  canAutoConnect: boolean;
  shouldShowConnectButton: boolean;
}

/**
 * Unified authentication flow hook
 * Handles both Farcaster auto-connect and manual web app connection
 */
export function useAuthenticationFlow() {
  const { platform, isReady, wallet, actions, user, error: platformError } = usePlatform();
  const [authState, setAuthState] = useState<AuthenticationState>("initializing");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);

  // Determine if platform supports auto-connect
  const canAutoConnect = platform === "farcaster";

  // Auto-connect logic for Farcaster
  useEffect(() => {
    if (!isReady) return;

    const attemptAutoConnect = async () => {
      // Only auto-connect in Farcaster and only once
      if (!canAutoConnect || hasAttemptedAutoConnect) return;
      
      setHasAttemptedAutoConnect(true);
      setIsAutoConnecting(true);
      setAuthState("authenticating");
      
      logger.info("Attempting auto-connect for Farcaster mini app");

      try {
        const success = await actions.connect();
        
        if (success) {
          logger.info("Auto-connect successful");
          // State will be updated by the wallet state effect below
        } else {
          logger.warn("Auto-connect failed");
          setAuthState("unauthenticated");
          setAuthError("Auto-connect failed. Please try manual connection.");
        }
      } catch (error) {
        logger.error("Auto-connect error:", error);
        setAuthState("error");
        setAuthError(error instanceof Error ? error.message : "Auto-connect failed");
      } finally {
        setIsAutoConnecting(false);
      }
    };

    attemptAutoConnect();
  }, [isReady, canAutoConnect, hasAttemptedAutoConnect, actions]);

  // Update auth state based on wallet connection status
  useEffect(() => {
    if (!isReady) {
      setAuthState("initializing");
      return;
    }

    if (platformError) {
      setAuthState("error");
      setAuthError(platformError);
      return;
    }

    if (wallet.isConnecting && !isAutoConnecting) {
      setAuthState("authenticating");
      setAuthError(null);
      return;
    }

    if (wallet.isConnected && wallet.address) {
      setAuthState("authenticated");
      setAuthError(null);
      logger.info("Authentication successful", {
        address: wallet.address,
        platform,
        provider: wallet.provider
      });
      return;
    }

    // Not connected
    if (!isAutoConnecting) {
      setAuthState("unauthenticated");
      setAuthError(null);
    }
  }, [isReady, wallet, platformError, isAutoConnecting, platform]);

  // Manual connect function for web apps
  const connect = useCallback(async (): Promise<boolean> => {
    if (authState === "authenticating") return false;

    setAuthState("authenticating");
    setAuthError(null);

    try {
      const success = await actions.connect();
      
      if (!success) {
        setAuthState("unauthenticated");
        setAuthError("Connection failed. Please try again.");
      }
      
      return success;
    } catch (error) {
      logger.error("Manual connect error:", error);
      setAuthState("error");
      setAuthError(error instanceof Error ? error.message : "Connection failed");
      return false;
    }
  }, [authState, actions]);

  // Disconnect function
  const disconnect = useCallback(() => {
    actions.disconnect();
    setAuthState("unauthenticated");
    setAuthError(null);
    setHasAttemptedAutoConnect(false); // Allow retry
  }, [actions]);

  // Retry function for failed states
  const retry = useCallback(() => {
    setAuthError(null);
    if (canAutoConnect) {
      setHasAttemptedAutoConnect(false); // Reset auto-connect
    } else {
      setAuthState("unauthenticated");
    }
  }, [canAutoConnect]);

  const status: AuthenticationStatus = {
    state: authState,
    address: wallet.address,
    platform,
    isAutoConnecting,
    error: authError,
    canAutoConnect,
    shouldShowConnectButton: authState === "unauthenticated" && !isAutoConnecting,
  };

  return {
    status,
    connect,
    disconnect,
    retry,
    user,
    wallet,
  };
}

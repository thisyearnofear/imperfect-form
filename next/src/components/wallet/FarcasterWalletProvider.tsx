"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { usePlatform } from "@/contexts/PlatformContext";
import { FarcasterContext } from "@/components/providers";
import { createRemoteLogger } from "@/utils/remoteLogger";

// Initialize logger for Farcaster wallet provider
const logger = createRemoteLogger("FarcasterWalletProvider");

// Create context for Farcaster wallet functionality
const FarcasterWalletContext = createContext<FarcasterContext | null>(null);

interface FarcasterWalletProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the app to provide Farcaster wallet functionality
 */
export function FarcasterWalletProvider({
  children,
}: FarcasterWalletProviderProps) {
  const { platform, user, wallet, actions, isReady, error } = usePlatform();

  // Convert to legacy interface
  const farcasterContext: FarcasterContext = {
    isInMiniApp: platform === "farcaster",
    user: user,
    walletAddress: platform === "farcaster" ? wallet.address : null,
    chainId: platform === "farcaster" ? wallet.chainId : null,
    isLoading: !isReady,
    error,
    connectWallet: async () => {
      const success = await actions.connect();
      return success ? wallet.address : null;
    },
    signMessage: async (message: string) => {
      console.warn("signMessage not implemented in new context");
      return null;
    },
    sendTransaction: async (to: string, value: string, data?: string) => {
      console.warn("sendTransaction not implemented in new context");
      return null;
    },
    switchChain: actions.switchChain,
  };

  // Log provider initialization
  React.useEffect(() => {
    logger.info("FarcasterWalletProvider initialized", {
      isInMiniApp: farcasterContext.isInMiniApp,
      hasUser: !!farcasterContext.user,
      hasWallet: !!farcasterContext.walletAddress,
      isLoading: farcasterContext.isLoading,
    });
  }, [farcasterContext]);

  return (
    <FarcasterWalletContext.Provider value={farcasterContext}>
      {children}
    </FarcasterWalletContext.Provider>
  );
}

/**
 * Hook to access Farcaster wallet context
 */
export function useFarcasterWallet(): FarcasterContext {
  const context = useContext(FarcasterWalletContext);

  if (!context) {
    // Return a default context if not within provider
    logger.warn("useFarcasterWallet called outside of FarcasterWalletProvider");
    return {
      isInMiniApp: false,
      user: null,
      walletAddress: null,
      chainId: null,
      isLoading: false,
      error: null,
      connectWallet: async () => {
        logger.warn("connectWallet called outside of Farcaster context");
        return null;
      },
      signMessage: async () => {
        logger.warn("signMessage called outside of Farcaster context");
        return null;
      },
      sendTransaction: async () => {
        logger.warn("sendTransaction called outside of Farcaster context");
        return null;
      },
      switchChain: async () => {
        logger.warn("switchChain called outside of Farcaster context");
        return false;
      },
    };
  }

  return context;
}

/**
 * Higher-order component to provide Farcaster wallet functionality
 */
export function withFarcasterWallet<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <FarcasterWalletProvider>
      <Component {...props} />
    </FarcasterWalletProvider>
  );

  WrappedComponent.displayName = `withFarcasterWallet(${
    Component.displayName || Component.name
  })`;

  return WrappedComponent;
}

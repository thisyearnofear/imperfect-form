"use client";

/**
 * Backward Compatibility Layer
 * Provides legacy hook exports so existing components continue to work
 * while we gradually migrate to the new PlatformContext
 */

import { usePlatform } from "@/contexts/PlatformContext";

// Legacy useUniversalWallet hook
export function useUniversalWallet() {
  const { platform, user, wallet, actions, isReady } = usePlatform();

  return {
    // Connection state
    isConnected: wallet.isConnected,
    address: wallet.address,
    chainId: wallet.chainId,
    isConnecting: wallet.isConnecting,

    // User info
    displayName:
      user?.displayName ||
      (wallet.address
        ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
        : undefined),
    isInFarcaster: platform === "farcaster",
    farcasterUser: user,

    // Actions
    connect: actions.connect,
    disconnect: actions.disconnect,
    switchToOptimalChain: actions.switchChain, // Legacy name mapping

    // UI state
    isReady,
  };
}

// Legacy useWalletProvider hook
export function useWalletProvider() {
  const { wallet } = usePlatform();

  return {
    walletProvider:
      wallet.provider || (wallet.isConnected ? "universal" : null),
    isConnected: wallet.isConnected,
    userAddress: wallet.address,
    // Legacy methods that do nothing (for compatibility)
    setWalletProvider: () => {},
    resetAll: () => {},
    disconnect: () => {},
    setIsConnected: () => {},
    setUserAddress: () => {},
    changeWalletProvider: () => {},
    isWalletProviderSelected: wallet.isConnected,
  };
}

// Legacy useFarcasterContext hook
export function useFarcasterContext() {
  const { platform, user, wallet, actions, isReady, error } = usePlatform();

  return {
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
    signMessage: async () => {
      // TODO: Implement if needed
      console.warn("signMessage not implemented in compatibility layer");
      return null;
    },
    sendTransaction: async () => {
      // TODO: Implement if needed
      console.warn("sendTransaction not implemented in compatibility layer");
      return null;
    },
    switchChain: actions.switchChain,
  };
}

// Legacy useMiniApp hook
export function useMiniApp() {
  const { platform, user, features, actions, isReady, error } = usePlatform();

  return {
    // Core features
    isInMiniApp: platform === "farcaster",
    user: user,
    isLoading: !isReady,
    error,

    // Enhanced features
    canSendNotifications: features.canNotify,
    canAccessWallet: platform === "farcaster",
    canShareContent: features.canShare,

    // Actions
    sendNotification: actions.sendNotification,
    shareWorkout: async (
      reps: number,
      exerciseMode: string,
      timeSpent: string
    ) => {
      return actions.share({
        text: `I just completed ${reps} ${exerciseMode} in ${timeSpent} on Imperfect Form! 💪\n\nJoin the Onchain Olympics at https://imperfectform.fun`,
        url: "https://imperfectform.fun",
      });
    },
    addMiniApp: actions.addToHome,
    openInBrowser: () => {
      if (typeof window !== "undefined") {
        window.open(window.location.href, "_blank");
      }
    },
  };
}

// Legacy useNetwork hook
export function useNetwork() {
  const { wallet } = usePlatform();

  // Map chain IDs to network names for backward compatibility
  const getNetworkName = (id: number | null) => {
    switch (id) {
      case 84532:
        return "base";
      case 137:
        return "polygon";
      case 42220:
        return "celo";
      case 10143:
        return "monad";
      default:
        return "celo"; // Default to CELO for all contexts
    }
  };

  return {
    network: getNetworkName(wallet.chainId),
    setNetwork: () => {}, // Legacy - auto-handled now
    isNetworkSelected: true, // Always true now
  };
}

// Export types for compatibility
export type { PlatformContextType as UniversalWalletContextType } from "@/contexts/PlatformContext";

// Legacy type exports
export interface FarcasterContext {
  isInMiniApp: boolean;
  user: unknown;
  walletAddress: string | null;
  chainId: number | null;
  isLoading: boolean;
  error: string | null;
  connectWallet: () => Promise<string | null>;
  signMessage: (message: string) => Promise<string | null>;
  sendTransaction: (
    to: string,
    value: string,
    data?: string
  ) => Promise<string | null>;
  switchChain: (chainId: number) => Promise<boolean>;
}

// Re-export the new hooks for components that want to migrate
export {
  usePlatform,
  useWallet,
  usePlatformFeatures,
} from "@/contexts/PlatformContext";

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import toast from "react-hot-toast";
import { createRemoteLogger } from "@/utils/remoteLogger";

const logger = createRemoteLogger("PlatformContext");

// Platform types
export type Platform = "farcaster" | "mobile" | "desktop" | "pwa";
export type WalletProvider = "farcaster" | "wagmi" | null;

// Unified interfaces
export interface PlatformUser {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  address?: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: WalletProvider;
  isConnecting: boolean;
}

export interface PlatformFeatures {
  canNotify: boolean;
  canShare: boolean;
  canAddToHome: boolean;
  canSwitchChains: boolean;
  preferredChains: number[];
  defaultChain: number;
}

export interface PlatformActions {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<boolean>;
  share: (content: ShareContent) => Promise<boolean>;
  addToHome: () => Promise<boolean>;
  sendNotification: (title: string, body: string) => Promise<boolean>;
}

export interface ShareContent {
  text: string;
  url?: string;
  imageUrl?: string;
}

// Main context interface
export interface PlatformContextType {
  // Platform detection
  platform: Platform;
  isReady: boolean;

  // User state
  user: PlatformUser | null;

  // Wallet state
  wallet: WalletState;

  // Platform features
  features: PlatformFeatures;

  // Actions
  actions: PlatformActions;

  // Error state
  error: string | null;
}

// Platform configurations
const PLATFORM_CONFIGS: Record<Platform, Partial<PlatformFeatures>> = {
  farcaster: {
    canNotify: true,
    canShare: true,
    canAddToHome: true,
    canSwitchChains: true,
    preferredChains: [42220, 137, 10143], // CELO, Polygon, Monad
    defaultChain: 42220, // CELO
  },
  mobile: {
    canNotify: false,
    canShare: true,
    canAddToHome: true,
    canSwitchChains: false,
    preferredChains: [42220, 84532], // CELO, Base
    defaultChain: 42220, // CELO
  },
  desktop: {
    canNotify: false,
    canShare: false,
    canAddToHome: false,
    canSwitchChains: true,
    preferredChains: [84532, 137, 42220, 10143], // Base, Polygon, CELO, Monad
    defaultChain: 84532, // Base
  },
  pwa: {
    canNotify: true,
    canShare: true,
    canAddToHome: false,
    canSwitchChains: true,
    preferredChains: [42220, 84532], // CELO, Base
    defaultChain: 42220, // CELO
  },
};

// Context creation
const PlatformContext = createContext<PlatformContextType | null>(null);

// Platform detection utilities
const detectPlatform = (): Platform => {
  if (typeof window === "undefined") return "desktop";

  // Check for Farcaster Mini App
  const isFarcaster =
    /farcaster|warpcast/i.test(navigator.userAgent) ||
    window.location.search.includes("frame=") ||
    window.location.search.includes("farcaster") ||
    document.referrer.includes("warpcast.com") ||
    document.referrer.includes("farcaster.xyz");

  if (isFarcaster) return "farcaster";

  // Check for PWA
  const isPWA = window.matchMedia("(display-mode: standalone)").matches;
  if (isPWA) return "pwa";

  // Check for mobile
  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  if (isMobile) return "mobile";

  return "desktop";
};

// Farcaster SDK types
interface FarcasterSDK {
  context: Promise<{ user?: PlatformUser }>;
  wallet?: {
    ethProvider: {
      request: (params: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on?: (event: string, handler: (data: unknown) => void) => void;
    };
  };
  actions: {
    ready: () => Promise<void>;
    share?: (content: {
      text: string;
      embeds: { url: string }[];
    }) => Promise<void>;
    addMiniApp?: () => Promise<void>;
    sendNotification?: (params: {
      title: string;
      body: string;
    }) => Promise<void>;
  };
}

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  // Platform detection
  const [platform] = useState<Platform>(() => detectPlatform());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User state
  const [user, setUser] = useState<PlatformUser | null>(null);

  // Farcaster SDK state
  const [farcasterSDK, setFarcasterSDK] = useState<FarcasterSDK | null>(null);
  const [farcasterWallet, setFarcasterWallet] = useState<{
    address: string | null;
    chainId: number | null;
  }>({ address: null, chainId: null });

  // Wagmi hooks
  const {
    connect: wagmiConnect,
    connectors,
    isPending: isWagmiConnecting,
  } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();

  // Platform configuration
  const config = PLATFORM_CONFIGS[platform];
  const features: PlatformFeatures = {
    canNotify: config.canNotify ?? false,
    canShare: config.canShare ?? false,
    canAddToHome: config.canAddToHome ?? false,
    canSwitchChains: config.canSwitchChains ?? true,
    preferredChains: config.preferredChains ?? [42220],
    defaultChain: config.defaultChain ?? 42220,
  };

  // Unified wallet state
  const wallet: WalletState = {
    isConnected:
      platform === "farcaster"
        ? !!farcasterWallet.address || isWagmiConnected
        : isWagmiConnected,
    address:
      platform === "farcaster" && farcasterWallet.address
        ? farcasterWallet.address
        : wagmiAddress || null,
    chainId:
      platform === "farcaster" && farcasterWallet.chainId
        ? farcasterWallet.chainId
        : wagmiChainId || null,
    provider:
      platform === "farcaster" && farcasterWallet.address
        ? "farcaster"
        : isWagmiConnected
        ? "wagmi"
        : null,
    isConnecting: isWagmiConnecting,
  };

  // Initialize platform-specific features
  useEffect(() => {
    const initializePlatform = async () => {
      try {
        setError(null);

        if (platform === "farcaster") {
          await initializeFarcaster();
        }

        setIsReady(true);
        logger.info(`Platform initialized: ${platform}`, { features, wallet });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Platform initialization failed";
        setError(errorMessage);
        logger.error("Platform initialization failed", err);
        setIsReady(true); // Still set ready to prevent blocking
      }
    };

    initializePlatform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]); // features and wallet are derived from platform, so platform is sufficient

  // Initialize Farcaster SDK
  const initializeFarcaster = async () => {
    try {
      const { sdk } = await import("@farcaster/frame-sdk");
      setFarcasterSDK(sdk as unknown as FarcasterSDK); // Type assertion for SDK compatibility

      // Get user context
      try {
        const context = await sdk.context;
        if (context?.user) {
          setUser(context.user);
        }
      } catch (contextError) {
        logger.warn("Failed to get Farcaster user context", contextError);
      }

      // Initialize wallet if available
      if (sdk.wallet?.ethProvider) {
        try {
          // Get existing accounts first
          let accounts = (await sdk.wallet.ethProvider.request({
            method: "eth_accounts",
          })) as string[];

          // If no accounts are connected, try to request accounts (auto-connect in mini app)
          if (!accounts || accounts.length === 0) {
            logger.info(
              "No accounts found, attempting to request accounts in Farcaster mini app"
            );
            try {
              accounts = (await sdk.wallet.ethProvider.request({
                method: "eth_requestAccounts",
              })) as string[];
            } catch (requestError) {
              logger.warn(
                "Failed to request accounts, wallet may not be available",
                requestError
              );
            }
          }

          if (accounts && accounts.length > 0) {
            setFarcasterWallet((prev) => ({ ...prev, address: accounts[0] }));
            logger.info("Farcaster wallet address set:", accounts[0]);

            // Get chain ID
            const hexChainId = (await sdk.wallet.ethProvider.request({
              method: "eth_chainId",
            })) as string;
            const chainId = parseInt(hexChainId, 16);
            setFarcasterWallet((prev) => ({ ...prev, chainId }));
            logger.info("Farcaster wallet chain ID set:", chainId);
          } else {
            logger.warn("No Farcaster wallet accounts available");
          }

          // Set up chain change listener
          sdk.wallet.ethProvider.on?.("chainChanged", (chainId: string) => {
            const newChainId = parseInt(chainId, 16);
            setFarcasterWallet((prev) => ({ ...prev, chainId: newChainId }));
            logger.info("Farcaster wallet chain changed", newChainId);
          });
        } catch (walletError) {
          logger.error("Failed to initialize Farcaster wallet", walletError);
        }
      } else {
        logger.warn("Farcaster SDK wallet provider not available");
      }

      logger.info("Farcaster SDK initialized successfully");
    } catch (err) {
      logger.error("Failed to initialize Farcaster SDK", err);
      throw err;
    }
  };

  // Actions implementation
  const connect = useCallback(async (): Promise<boolean> => {
    try {
      if (platform === "farcaster" && farcasterSDK?.wallet) {
        // Try Farcaster wallet first using the new API
        let provider = null;

        // Use the new getEthereumProvider() method (with type assertion for new API)
        const walletWithNewAPI = farcasterSDK.wallet as {
          getEthereumProvider?: () => Promise<unknown>;
        };
        if (walletWithNewAPI.getEthereumProvider) {
          try {
            provider = await walletWithNewAPI.getEthereumProvider();
          } catch (error) {
            logger.warn("Failed to get provider via new API:", error);
          }
        }

        // Fallback to legacy API
        if (!provider && farcasterSDK.wallet.ethProvider) {
          provider = farcasterSDK.wallet.ethProvider;
        }

        if (provider && typeof provider === "object" && "request" in provider) {
          const accounts = (await (
            provider as {
              request: (args: { method: string }) => Promise<string[]>;
            }
          ).request({
            method: "eth_requestAccounts",
          })) as string[];

          if (accounts && accounts.length > 0) {
            setFarcasterWallet((prev) => ({ ...prev, address: accounts[0] }));

            // Get chain ID
            const hexChainId = (await (
              provider as {
                request: (args: { method: string }) => Promise<string>;
              }
            ).request({
              method: "eth_chainId",
            })) as string;
            const chainId = parseInt(hexChainId, 16);
            setFarcasterWallet((prev) => ({ ...prev, chainId }));

            toast.success("Farcaster wallet connected!");
            return true;
          }
        }
      }

      // Fallback to Wagmi
      const targetConnector =
        connectors.find((c) =>
          platform === "desktop"
            ? c.id === "coinbaseWallet"
            : c.id === "injected"
        ) || connectors[0];

      await wagmiConnect({ connector: targetConnector });
      toast.success("Wallet connected!");
      return true;
    } catch (err) {
      logger.error("Connection failed", err);
      toast.error("Connection failed. Please try again.");
      return false;
    }
  }, [platform, farcasterSDK, connectors, wagmiConnect]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    if (platform === "farcaster") {
      setFarcasterWallet({ address: null, chainId: null });
    }
    toast.success("Wallet disconnected");
  }, [wagmiDisconnect, platform]);

  const switchChain = useCallback(
    async (targetChainId: number): Promise<boolean> => {
      try {
        if (platform === "farcaster" && farcasterSDK?.wallet?.ethProvider) {
          await farcasterSDK.wallet.ethProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });

          setFarcasterWallet((prev) => ({ ...prev, chainId: targetChainId }));
          toast.success("Chain switched successfully!");
          return true;
        }

        // Fallback to Wagmi
        await wagmiSwitchChain({ chainId: targetChainId });
        toast.success("Chain switched successfully!");
        return true;
      } catch (err) {
        logger.error("Chain switch failed", err);
        toast.error("Failed to switch chain");
        return false;
      }
    },
    [platform, farcasterSDK, wagmiSwitchChain]
  );

  const share = useCallback(
    async (content: ShareContent): Promise<boolean> => {
      try {
        if (platform === "farcaster" && farcasterSDK?.actions?.share) {
          await farcasterSDK.actions.share({
            text: content.text,
            embeds: content.url ? [{ url: content.url }] : [],
          });
          return true;
        }

        // Fallback to Web Share API
        if (navigator.share) {
          await navigator.share({
            title: "Imperfect Form",
            text: content.text,
            url: content.url || window.location.href,
          });
          return true;
        }

        // Fallback to clipboard
        await navigator.clipboard.writeText(
          `${content.text} ${content.url || ""}`
        );
        toast.success("Copied to clipboard!");
        return true;
      } catch (err) {
        logger.error("Share failed", err);
        return false;
      }
    },
    [platform, farcasterSDK]
  );

  const addToHome = useCallback(async (): Promise<boolean> => {
    try {
      if (platform === "farcaster" && farcasterSDK?.actions?.addMiniApp) {
        await farcasterSDK.actions.addMiniApp();
        return true;
      }

      // For PWA, trigger install prompt
      // This would need to be implemented with beforeinstallprompt event
      toast("Add to home screen from your browser menu");
      return false;
    } catch (err) {
      logger.error("Add to home failed", err);
      return false;
    }
  }, [platform, farcasterSDK]);

  const sendNotification = useCallback(
    async (title: string, body: string): Promise<boolean> => {
      try {
        if (
          platform === "farcaster" &&
          farcasterSDK?.actions?.sendNotification
        ) {
          await farcasterSDK.actions.sendNotification({ title, body });
          return true;
        }

        // Fallback to browser notifications
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body });
          return true;
        }

        return false;
      } catch (err) {
        logger.error("Notification failed", err);
        return false;
      }
    },
    [platform, farcasterSDK]
  );

  const actions: PlatformActions = {
    connect,
    disconnect,
    switchChain,
    share,
    addToHome,
    sendNotification,
  };

  const contextValue: PlatformContextType = {
    platform,
    isReady,
    user,
    wallet,
    features,
    actions,
    error,
  };

  return (
    <PlatformContext.Provider value={contextValue}>
      {children}
    </PlatformContext.Provider>
  );
}

// Hook to use platform context
export function usePlatform(): PlatformContextType {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error("usePlatform must be used within a PlatformProvider");
  }
  return context;
}

// Convenience hooks for specific functionality
export function useWallet() {
  const { wallet, actions } = usePlatform();
  return {
    ...wallet,
    connect: actions.connect,
    disconnect: actions.disconnect,
    switchChain: actions.switchChain,
  };
}

export function usePlatformFeatures() {
  const { features, actions } = usePlatform();
  return {
    ...features,
    share: actions.share,
    addToHome: actions.addToHome,
    sendNotification: actions.sendNotification,
  };
}

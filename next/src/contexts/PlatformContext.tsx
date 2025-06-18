"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
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
  const wallet: WalletState = useMemo(
    () => ({
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
    }),
    [
      platform,
      farcasterWallet,
      isWagmiConnected,
      wagmiAddress,
      wagmiChainId,
      isWagmiConnecting,
    ]
  );

  // Debug wallet state changes
  useEffect(() => {
    console.log("🔗 Wallet state updated:", {
      platform,
      isWagmiConnected,
      wagmiAddress,
      farcasterWallet,
      finalWalletState: wallet,
    });
  }, [platform, isWagmiConnected, wagmiAddress, farcasterWallet, wallet]);

  // Initialize platform-specific features
  useEffect(() => {
    const initializePlatform = async () => {
      try {
        setError(null);

        if (platform === "farcaster") {
          await initializeFarcaster();
        }

        setIsReady(true);
        if (process.env.NODE_ENV === "development") {
          logger.info(`Platform initialized: ${platform}`, {
            features,
            wallet,
            availableConnectors: connectors.map((c) => c.id),
          });
        }
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

  // Initialize Farcaster SDK with auto-connect
  const initializeFarcaster = async () => {
    try {
      const { sdk } = await import("@farcaster/frame-sdk");
      setFarcasterSDK(sdk as unknown as FarcasterSDK);

      // Get user context first
      try {
        const context = await sdk.context;
        if (context?.user) {
          setUser(context.user);
          logger.info("Farcaster user context loaded:", context.user);
        }
      } catch (contextError) {
        logger.warn("Failed to get Farcaster user context", contextError);
      }

      // Initialize wallet provider for Farcaster mini app
      // Note: Auto-connection is now handled by the Wagmi connector
      try {
        let provider = null;

        // Try new getEthereumProvider() method first
        if (sdk.wallet?.getEthereumProvider) {
          try {
            provider = await sdk.wallet.getEthereumProvider();
            logger.info("Farcaster wallet provider obtained via new API");
          } catch (error) {
            logger.warn("Failed to get provider via new API:", error);
          }
        }

        // Fallback to legacy ethProvider
        if (!provider && sdk.wallet?.ethProvider) {
          provider = sdk.wallet.ethProvider;
          logger.info("Farcaster wallet provider obtained via legacy API");
        }

        if (provider) {
          logger.info(
            "Farcaster wallet provider available - connection will be handled by Wagmi connector"
          );
        } else {
          logger.warn("Farcaster wallet provider not available");
        }
      } catch (error) {
        logger.error("Error initializing Farcaster wallet:", error);
      }

      logger.info("Farcaster SDK initialized successfully");
    } catch (err) {
      logger.error("Failed to initialize Farcaster SDK", err);
      throw err;
    }
  };

  // Actions implementation - simplified based on latest Farcaster docs
  const connect = useCallback(async (): Promise<boolean> => {
    console.log("🔗 PlatformContext: Connect called", {
      platform,
      isWagmiConnected,
      wagmiAddress,
      connectors: connectors.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      })),
    });

    // If already connected, return true
    if (isWagmiConnected && wagmiAddress) {
      console.log("🔗 Already connected via Wagmi");
      return true;
    }

    try {
      // Get appropriate connectors based on platform
      let targetConnectors = connectors;

      if (platform === "farcaster") {
        // In Farcaster, prioritize the Farcaster connector (auto-connects if user has wallet)
        const farcasterConnector = connectors.find(
          (c) => c.id === "farcasterFrame" || c.id === "farcaster"
        );
        if (farcasterConnector) {
          targetConnectors = [
            farcasterConnector,
            ...connectors.filter(
              (c) => c.id !== "farcasterFrame" && c.id !== "farcaster"
            ),
          ];
        }
      } else {
        // For web/desktop, exclude Farcaster connector and prioritize: WalletConnect > Injected > Coinbase
        const webConnectors = connectors.filter(
          (c) => c.id !== "farcasterFrame" && c.id !== "farcaster"
        );

        // Reorder for web preference: WalletConnect first, then Injected, then Coinbase
        const walletConnect = webConnectors.find(
          (c) => c.id === "walletConnect"
        );
        const injected = webConnectors.find((c) => c.id === "injected");
        const coinbase = webConnectors.find((c) => c.id === "coinbaseWallet");
        const others = webConnectors.filter(
          (c) =>
            c.id !== "walletConnect" &&
            c.id !== "injected" &&
            c.id !== "coinbaseWallet"
        );

        targetConnectors = [
          ...(walletConnect ? [walletConnect] : []),
          ...(injected ? [injected] : []),
          ...(coinbase ? [coinbase] : []),
          ...others,
        ];

        console.log(
          "🔗 Reordered connectors for web/desktop platform (WalletConnect > Injected > Coinbase)",
          {
            originalCount: connectors.length,
            filteredCount: targetConnectors.length,
            order: targetConnectors.map((c) => c.id),
            excluded: connectors
              .filter((c) => c.id === "farcasterFrame" || c.id === "farcaster")
              .map((c) => c.id),
          }
        );
      }

      console.log("🔗 Target connectors:", {
        platform,
        connectors: targetConnectors.map((c) => ({ id: c.id, name: c.name })),
      });

      // Try each connector
      for (const connector of targetConnectors) {
        try {
          console.log(`🔗 Attempting connection with ${connector.id}...`);

          await wagmiConnect({ connector });

          // Wait for state to update
          await new Promise((resolve) => setTimeout(resolve, 500));

          console.log("🔗 Connection attempt completed:", {
            connectorId: connector.id,
            isWagmiConnected,
            wagmiAddress,
          });

          // The Wagmi connector handles the actual connection state
          // Success will be reflected in the wallet state via useAccount hook
          toast.success("Wallet connected!");
          return true;
        } catch (error) {
          console.warn(`🔗 Connection failed with ${connector.id}:`, error);

          // For Farcaster connector, this might be expected if user doesn't have wallet
          if (connector.id === "farcasterFrame") {
            console.log(
              "🔗 Farcaster connector failed - user may not have wallet connected"
            );
          }

          // Continue to next connector
          continue;
        }
      }

      // If we get here, all connectors failed
      throw new Error("All wallet connectors failed to connect");
    } catch (err) {
      console.error("🔗 Connection failed:", err);
      toast.error("Connection failed. Please try again.");
      return false;
    }
  }, [platform, connectors, wagmiConnect, isWagmiConnected, wagmiAddress]);

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
        // Simply call the SDK action - Farcaster handles everything else
        // No need to return success/failure as Farcaster manages the user experience
        await farcasterSDK.actions.addMiniApp();
        logger.info("🎯 Farcaster addMiniApp action called successfully");
        return true;
      }

      // For PWA, trigger install prompt
      // This would need to be implemented with beforeinstallprompt event
      toast("Add to home screen from your browser menu");
      return false;
    } catch (err) {
      // Log the error but don't show user feedback - Farcaster handles that
      logger.error("Add to home failed", err);

      // Check if it's a user rejection (expected behavior)
      if (err instanceof Error && err.message.includes("RejectedByUser")) {
        logger.info("🎯 User rejected adding Mini App - this is normal");
        return false;
      }

      // For other errors, still let Farcaster handle user feedback
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

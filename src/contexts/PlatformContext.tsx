'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { createRemoteLogger } from '@/utils/remoteLogger';
import type { WagmiBridgeApi, WagmiConnectorRef } from './WagmiBridge';

// The wagmi runtime (hooks → viem) is ~200 KB. PlatformContext must stay
// wagmi-free so the wallet stack defers off the first load; the hooks live in
// WagmiBridge, dynamically imported and mounted inside WagmiProvider below.
// `import type` is erased at build time, so it adds no runtime weight.
const WagmiBridge = dynamic(() => import('./WagmiBridge'), {
  ssr: false,
  loading: () => null,
});

const logger = createRemoteLogger('PlatformContext');

// Platform types
export type Platform = 'farcaster' | 'mobile' | 'desktop' | 'pwa';
export type WalletProvider = 'farcaster' | 'wagmi' | null;

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
  connect: (connectorId?: string) => Promise<boolean>;
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

  // Farcaster provider (for direct use in submissions)
  farcasterProvider: any | null;

  // Platform features
  features: PlatformFeatures;

  // Actions
  actions: PlatformActions;

  // Error state
  error: string | null;

  // Wallet selector modal state
  isWalletSelectorOpen: boolean;
  setWalletSelectorOpen: (isOpen: boolean) => void;
}

// Platform configurations
const PLATFORM_CONFIGS: Record<Platform, Partial<PlatformFeatures>> = {
  farcaster: {
    canNotify: true,
    canShare: true,
    canAddToHome: true,
    canSwitchChains: true,
    preferredChains: [42220, 137, 143, 44787], // CELO, Polygon, Monad Mainnet, Celo Alfajores
    defaultChain: 42220, // CELO
  },
  mobile: {
    canNotify: false,
    canShare: true,
    canAddToHome: true,
    canSwitchChains: false,
    preferredChains: [42220, 8453, 44787], // CELO, Base Mainnet, Celo Alfajores
    defaultChain: 42220, // CELO
  },
  desktop: {
    canNotify: false,
    canShare: false,
    canAddToHome: false,
    canSwitchChains: true,
    preferredChains: [8453, 137, 42220, 143, 44787], // Base Mainnet, Polygon, CELO, Monad Mainnet, Celo Alfajores
    defaultChain: 8453, // Base Mainnet
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

// Platform detection utilities with proper SSR handling
const detectPlatform = (): Platform => {
  // Always return desktop during SSR to prevent hydration mismatches
  if (typeof window === 'undefined') return 'desktop';

  try {
    // Check for Farcaster Mini App
    const isFarcaster =
      /farcaster|warpcast/i.test(navigator.userAgent) ||
      window.location.search.includes('frame=') ||
      window.location.search.includes('farcaster') ||
      document.referrer.includes('warpcast.com') ||
      document.referrer.includes('farcaster.xyz');

    if (isFarcaster) return 'farcaster';

    // Check for PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    if (isPWA) return 'pwa';

    // Check for mobile
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (isMobile) return 'mobile';

    return 'desktop';
  } catch (error) {
    console.warn('Error detecting platform:', error);
    return 'desktop';
  }
};

// Farcaster SDK types
interface FarcasterSDK {
  context: Promise<{ user?: PlatformUser }>;
  wallet?: {
    ethProvider: {
      request: (params: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (data: unknown) => void) => void;
    };
    getEthereumProvider?: () => Promise<any>;
  };
  actions: {
    ready: () => Promise<void>;
    share?: (content: { text: string; embeds: { url: string }[] }) => Promise<void>;
    addMiniApp?: () => Promise<void>;
    sendNotification?: (params: { title: string; body: string }) => Promise<void>;
  };
}

interface PlatformProviderProps {
  children: ReactNode;
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  // Platform detection with client-side initialization
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isWalletSelectorOpen, setWalletSelectorOpen] = useState(false);

  // User state
  const [user, setUser] = useState<PlatformUser | null>(null);

  // Farcaster SDK state
  const [farcasterSDK, setFarcasterSDK] = useState<FarcasterSDK | null>(null);
  const [farcasterProvider, setFarcasterProvider] = useState<any | null>(null);
  const [farcasterWallet, setFarcasterWallet] = useState<{
    address: string | null;
    chainId: number | null;
  }>({ address: null, chainId: null });

  // Wagmi primitives arrive from WagmiBridge (mounted inside WagmiProvider).
  // Until the bridge reports, everything reads as "not connected" — the
  // wallet-free day-0 path never needs more than that.
  const [wagmi, setWagmi] = useState<WagmiBridgeApi | null>(null);
  const wagmiConnect = wagmi?.connect;
  const connectors: readonly WagmiConnectorRef[] = wagmi?.connectors ?? [];
  const isWagmiConnecting = wagmi?.isConnecting ?? false;
  const wagmiDisconnect = wagmi?.disconnect ?? (() => {});
  const wagmiAddress = wagmi?.address;
  const isWagmiConnected = wagmi?.isConnected ?? false;
  const wagmiChainId = wagmi?.chainId ?? null;
  const wagmiSwitchChain = wagmi?.switchChain;

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
        platform === 'farcaster'
          ? !!farcasterWallet.address || isWagmiConnected
          : isWagmiConnected || !!wagmiAddress,
      address:
        platform === 'farcaster' && farcasterWallet.address
          ? farcasterWallet.address
          : wagmiAddress || null,
      chainId:
        platform === 'farcaster' && farcasterWallet.chainId
          ? farcasterWallet.chainId
          : wagmiChainId || null,
      provider:
        platform === 'farcaster' && farcasterWallet.address
          ? 'farcaster'
          : isWagmiConnected || !!wagmiAddress
            ? 'wagmi'
            : null,
      isConnecting: isWagmiConnecting,
    }),
    [platform, farcasterWallet, isWagmiConnected, wagmiAddress, wagmiChainId, isWagmiConnecting]
  );

  // Wallet state is intentionally silent; use React DevTools or the remote logger for diagnostics.

  // Client-side initialization
  useEffect(() => {
    setIsClient(true);
    setPlatform(detectPlatform());
  }, []);

  // Initialize platform-specific features
  useEffect(() => {
    if (!isClient) return;

    const initializePlatform = async () => {
      try {
        setError(null);

        if (platform === 'farcaster') {
          await initializeFarcaster();
        }

        setIsReady(true);
        if (process.env.NODE_ENV === 'development') {
          logger.info(`Platform initialized: ${platform}`, {
            features,
            wallet,
            availableConnectors: connectors.map((c) => c.id),
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Platform initialization failed';
        setError(errorMessage);
        logger.error('Platform initialization failed', err);
        setIsReady(true); // Still set ready to prevent blocking
      }
    };

    initializePlatform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, platform]); // features and wallet are derived from platform, so platform is sufficient

  // Initialize Farcaster SDK with auto-connect (client-side only)
  const initializeFarcaster = async () => {
    if (typeof window === 'undefined') return;

    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      setFarcasterSDK(sdk as unknown as FarcasterSDK);

      // Get user context first
      try {
        const context = await sdk.context;
        if (context?.user) {
          setUser(context.user);
          logger.info('Farcaster user context loaded:', context.user);
        }
      } catch (contextError) {
        logger.warn('Failed to get Farcaster user context', contextError);
      }

      // Initialize wallet provider for Farcaster mini app
      // Note: Auto-connection is now handled by the Wagmi connector
      try {
        let provider = null;

        // Try new getEthereumProvider() method first
        if (sdk.wallet?.getEthereumProvider) {
          try {
            provider = await sdk.wallet.getEthereumProvider();
            logger.info('Farcaster wallet provider obtained via new API');
          } catch (error) {
            logger.warn('Failed to get provider via new API:', error);
          }
        }

        // Fallback to legacy ethProvider
        if (!provider && sdk.wallet?.ethProvider) {
          provider = sdk.wallet.ethProvider;
          logger.info('Farcaster wallet provider obtained via legacy API');
        }

        if (provider) {
          setFarcasterProvider(provider);
          logger.info(
            'Farcaster wallet provider available - connection will be handled by Wagmi connector'
          );
        } else {
          setFarcasterProvider(null);
          logger.warn('Farcaster wallet provider not available');
        }
      } catch (error) {
        logger.error('Error initializing Farcaster wallet:', error);
      }

      logger.info('Farcaster SDK initialized successfully');
    } catch (err) {
      logger.error('Failed to initialize Farcaster SDK', err);
      throw err;
    }
  };

  // Actions implementation - simplified based on latest Farcaster docs
  const connect = useCallback(
    async (connectorId?: string): Promise<boolean> => {
      // Connection flow is intentionally silent in UI; errors surface via toast.

      // If already connected, return true
      if (isWagmiConnected && wagmiAddress) {
        return true;
      }

      try {
        let targetConnectors: WagmiConnectorRef[] = [];

        // If a specific connector is requested, use it
        if (connectorId) {
          const specificConnector = connectors.find((c) => c.id === connectorId);
          if (specificConnector) {
            targetConnectors = [specificConnector];
          } else {
            logger.error(`Connector with id "${connectorId}" not found.`);
            toast.error(`Connector with id "${connectorId}" not found.`);
            return false;
          }
        } else if (platform === 'farcaster') {
          // Farcaster auto-connect logic (no connectorId provided)
          const farcasterConnector = connectors.find(
            (c) => c.id === 'farcasterMiniApp' || c.id === 'farcasterFrame' || c.id === 'farcaster'
          );
          if (farcasterConnector) {
            targetConnectors = [farcasterConnector];
          }
        }
        // If no connectorId is provided for a non-farcaster platform,
        // open the wallet selector modal.
        else {
          setWalletSelectorOpen(true);
          return false; // Indicate that connection is deferred to the modal
        }

        // Try each connector
        for (const connector of targetConnectors) {
          try {
            // Special handling for WalletConnect to prevent session conflicts
            if (connector.id === 'walletConnect') {
              // Clear any existing WalletConnect sessions before connecting
              try {
                const allKeys = Object.keys(localStorage);
                const wcKeys = allKeys.filter(
                  (key) =>
                    key.startsWith('wc@2:') ||
                    key.startsWith('walletconnect') ||
                    key.includes('walletconnect') ||
                    key.includes('wc_') ||
                    key.includes('reown') ||
                    key.includes('w3m')
                );
                wcKeys.forEach((key) => localStorage.removeItem(key));

                // Also clear sessionStorage
                const sessionKeys = Object.keys(sessionStorage).filter(
                  (key) =>
                    key.startsWith('wc@2:') ||
                    key.startsWith('walletconnect') ||
                    key.includes('walletconnect') ||
                    key.includes('wc_') ||
                    key.includes('reown') ||
                    key.includes('w3m')
                );
                sessionKeys.forEach((key) => sessionStorage.removeItem(key));

                console.log(
                  `🧹 Cleared ${
                    wcKeys.length + sessionKeys.length
                  } WalletConnect sessions before new connection`
                );
              } catch (cleanupError) {
                console.warn('WalletConnect pre-connection cleanup failed:', cleanupError);
              }
            }

            if (!wagmiConnect) {
              logger.warn('Wallet bridge not ready; connection deferred.');
              continue;
            }
            await wagmiConnect({ connector });

            // Wait for state to update
            await new Promise((resolve) => setTimeout(resolve, 500));

            // The Wagmi connector handles the actual connection state
            // Success will be reflected in the wallet state via useAccount hook
            toast.success('Wallet connected!');
            return true;
          } catch (error) {
            console.warn(`Connection failed with ${connector.id}:`, error);

            // Special handling for WalletConnect errors
            if (connector.id === 'walletConnect') {
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (
                errorMessage.includes('No matching key') ||
                errorMessage.includes('Pending session not found') ||
                errorMessage.includes('proposal') ||
                errorMessage.includes('topic')
              ) {
                // Comprehensive cleanup and continue to next connector
                try {
                  const allKeys = Object.keys(localStorage);
                  const wcKeys = allKeys.filter(
                    (key) =>
                      key.startsWith('wc@2:') ||
                      key.startsWith('walletconnect') ||
                      key.includes('walletconnect') ||
                      key.includes('wc_') ||
                      key.includes('reown') ||
                      key.includes('w3m')
                  );
                  wcKeys.forEach((key) => localStorage.removeItem(key));

                  // Clear sessionStorage too
                  const sessionKeys = Object.keys(sessionStorage).filter(
                    (key) =>
                      key.startsWith('wc@2:') ||
                      key.startsWith('walletconnect') ||
                      key.includes('walletconnect') ||
                      key.includes('wc_') ||
                      key.includes('reown') ||
                      key.includes('w3m')
                  );
                  sessionKeys.forEach((key) => sessionStorage.removeItem(key));
                } catch (cleanupError) {
                  console.warn('WalletConnect error cleanup failed:', cleanupError);
                }
              }
            }

            // For Farcaster connector, this might be expected if user doesn't have wallet

            // Continue to next connector
            continue;
          }
        }

        // If we get here, and we had a target connector, it failed.
        if (targetConnectors.length > 0) {
          throw new Error(`Wallet connector ${targetConnectors[0].id} failed to connect.`);
        }

        // If we had no target connectors to begin with, it's not an error.
        // It just means we are waiting for user interaction.
        return false;
      } catch (err) {
        console.error('Connection failed:', err);
        toast.error('Connection failed. Please try again.');
        return false;
      }
    },
    [platform, connectors, wagmiConnect, isWagmiConnected, wagmiAddress]
  );

  const disconnect = useCallback(() => {
    // Comprehensive WalletConnect cleanup on disconnect
    if (typeof window !== 'undefined') {
      try {
        // Clear all WalletConnect related storage
        const allKeys = Object.keys(localStorage);
        const wcKeys = allKeys.filter(
          (key) =>
            key.startsWith('wc@2:') ||
            key.startsWith('walletconnect') ||
            key.includes('walletconnect') ||
            key.includes('wc_') ||
            key.includes('reown') ||
            key.includes('w3m')
        );

        wcKeys.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`Failed to remove WalletConnect key ${key}:`, e);
          }
        });

        // Clear sessionStorage as well
        const sessionKeys = Object.keys(sessionStorage).filter(
          (key) =>
            key.startsWith('wc@2:') ||
            key.startsWith('walletconnect') ||
            key.includes('walletconnect') ||
            key.includes('wc_') ||
            key.includes('reown') ||
            key.includes('w3m')
        );

        sessionKeys.forEach((key) => {
          try {
            sessionStorage.removeItem(key);
          } catch (e) {
            console.warn(`Failed to remove WalletConnect sessionStorage key ${key}:`, e);
          }
        });
      } catch (error) {
        console.warn('WalletConnect cleanup on disconnect failed:', error);
      }
    }

    wagmiDisconnect();
    if (platform === 'farcaster') {
      setFarcasterWallet({ address: null, chainId: null });
    }
    toast.success('Wallet disconnected');
  }, [wagmiDisconnect, platform]);

  const switchChain = useCallback(
    async (targetChainId: number): Promise<boolean> => {
      try {
        if (platform === 'farcaster') {
          // Try to get the provider using the newer method first, then fallback
          let provider = null;

          if (farcasterSDK?.wallet?.getEthereumProvider) {
            try {
              provider = await farcasterSDK.wallet.getEthereumProvider();
            } catch (error) {
              logger.warn('Failed to get provider via new API, trying legacy:', error);
            }
          }

          if (!provider && farcasterSDK?.wallet?.ethProvider) {
            provider = farcasterSDK.wallet.ethProvider;
          }

          if (provider) {
            // Check if the provider has the required method
            if (typeof provider.request === 'function') {
              await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${targetChainId.toString(16)}` }],
              });

              setFarcasterWallet((prev) => ({ ...prev, chainId: targetChainId }));
              toast.success('Chain switched successfully!');
              return true;
            } else {
              logger.warn('Farcaster provider does not have request method');
            }
          } else {
            logger.warn('No Farcaster wallet provider available for chain switch');
          }
        }

        // Apply browser-specific fixes for Brave and other privacy browsers
        if (typeof window !== 'undefined') {
          // For Brave and other browsers, apply fixes before switching
          const { isBraveBrowser, applyBrowserSpecificFixes } =
            await import('@/utils/farcasterMiniApp');
          if (isBraveBrowser()) {
            await applyBrowserSpecificFixes();
          }
        }

        // Fallback to Wagmi
        if (!wagmiSwitchChain) {
          logger.warn('Wallet bridge not ready; chain switch deferred.');
          return false;
        }
        await wagmiSwitchChain({ chainId: targetChainId });
        toast.success('Chain switched successfully!');
        return true;
      } catch (err) {
        logger.error('Chain switch failed', err);

        // More specific error handling for different browsers
        let errorMessage = 'Failed to switch chain';
        if (err instanceof Error) {
          if (err.message.includes('user rejected')) {
            errorMessage = 'Chain switch was rejected. Please try again.';
          } else if (err.message.includes('not added')) {
            errorMessage = `Network not available in wallet. You may need to add the network manually.`;
          } else if (err.message.includes('unsupported')) {
            errorMessage = 'Network not supported by current wallet.';
          }
        }

        toast.error(errorMessage);
        return false;
      }
    },
    [platform, farcasterSDK, wagmiSwitchChain]
  );

  const share = useCallback(
    async (content: ShareContent): Promise<boolean> => {
      try {
        if (platform === 'farcaster' && farcasterSDK?.actions?.share) {
          await farcasterSDK.actions.share({
            text: content.text,
            embeds: content.url ? [{ url: content.url }] : [],
          });
          return true;
        }

        // Fallback to Web Share API
        if (navigator.share) {
          await navigator.share({
            title: 'Imperfect Form',
            text: content.text,
            url: content.url || window.location.href,
          });
          return true;
        }

        // Fallback to clipboard
        await navigator.clipboard.writeText(`${content.text} ${content.url || ''}`);
        toast.success('Copied to clipboard!');
        return true;
      } catch (err) {
        logger.error('Share failed', err);
        return false;
      }
    },
    [platform, farcasterSDK]
  );

  const addToHome = useCallback(async (): Promise<boolean> => {
    try {
      if (platform === 'farcaster' && farcasterSDK?.actions?.addMiniApp) {
        // Simply call the SDK action - Farcaster handles everything else
        // No need to return success/failure as Farcaster manages the user experience
        await farcasterSDK.actions.addMiniApp();
        logger.info('🎯 Farcaster addMiniApp action called successfully');
        return true;
      }

      // For PWA, trigger install prompt
      // This would need to be implemented with beforeinstallprompt event
      toast('Add to home screen from your browser menu');
      return false;
    } catch (err) {
      // Log the error but don't show user feedback - Farcaster handles that
      logger.error('Add to home failed', err);

      // Check if it's a user rejection (expected behavior)
      if (err instanceof Error && err.message.includes('RejectedByUser')) {
        logger.info('🎯 User rejected adding Mini App - this is normal');
        return false;
      }

      // For other errors, still let Farcaster handle user feedback
      return false;
    }
  }, [platform, farcasterSDK]);

  const sendNotification = useCallback(
    async (title: string, body: string): Promise<boolean> => {
      try {
        if (platform === 'farcaster' && farcasterSDK?.actions?.sendNotification) {
          await farcasterSDK.actions.sendNotification({ title, body });
          return true;
        }

        // Fallback to browser notifications
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
          return true;
        }

        return false;
      } catch (err) {
        logger.error('Notification failed', err);
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
    farcasterProvider,
    features,
    actions,
    error,
    isWalletSelectorOpen,
    setWalletSelectorOpen,
  };

  return (
    <PlatformContext.Provider value={contextValue}>
      {/* Owns the wagmi runtime hooks; reports primitives back via setWagmi.
          Mounted here (inside WagmiProvider) so the wallet stack loads with
          the deferred provider tree, not the first-load chunks. */}
      <WagmiBridge onReady={setWagmi} />
      {children}
    </PlatformContext.Provider>
  );
}

// Hook to use platform context
export function usePlatform(): PlatformContextType {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
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

// Hook for wallet selector modal
export function useWalletSelector() {
  const { isWalletSelectorOpen, setWalletSelectorOpen } = usePlatform();
  return {
    isOpen: isWalletSelectorOpen,
    setOpen: setWalletSelectorOpen,
  };
}

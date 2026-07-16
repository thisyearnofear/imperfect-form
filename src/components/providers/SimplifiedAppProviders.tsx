'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';
import { avalanche, base, polygon, celo, type Chain } from 'wagmi/chains';
import { Toaster } from 'react-hot-toast';
import { PlatformProvider } from '@/contexts/PlatformContext';
import { NeynarAuthProvider } from '@/contexts/NeynarAuthContext';
import { EnhancedChainThemeProvider } from '@/contexts/ChainThemeContext';
import WalletSelectorModal from '@/components/modals/WalletSelectorModal';
import { Spinner } from '@/components/ui';
import WalletErrorBoundary from './WalletErrorBoundary';
import WalletDebugInfo from '@/components/debug/WalletDebugInfo';
// Removed: WalletConnectionDiagnostic - no longer needed after consolidation

// Define Monad Mainnet
const monadMainnet: Chain = {
  id: 143,
  name: 'Monad',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    public: { http: ['https://rpc.monad.xyz/'] },
    default: { http: ['https://rpc.monad.xyz/'] },
  },
  blockExplorers: {
    default: {
      name: 'MonadVision',
      url: 'https://monadvision.com/',
    },
  },
  testnet: false,
};

// Removed unused Celo Alfajores testnet - only using main 4 chains

// Comprehensive WalletConnect session cleanup utility
const cleanupWalletConnectSessions = () => {
  if (typeof window === 'undefined') return;

  try {
    // Clear all WalletConnect related localStorage keys
    const allKeys = Object.keys(localStorage);
    const wcKeys = allKeys.filter(
      (key) =>
        key.startsWith('wc@2:') ||
        key.startsWith('walletconnect') ||
        key.includes('walletconnect') ||
        key.includes('wc_') ||
        key.includes('WALLETCONNECT') ||
        key.startsWith('@walletconnect') ||
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
    try {
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
    } catch (e) {
      console.warn('Failed to access sessionStorage for cleanup:', e);
    }

    // Clear IndexedDB WalletConnect data
    if (window.indexedDB) {
      try {
        // Clear multiple possible database names
        const dbNames = ['walletconnect', 'wc', 'reown', 'w3m'];
        dbNames.forEach((dbName) => {
          try {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = () => console.log(`${dbName} IndexedDB cleared`);
            deleteReq.onerror = () => console.warn(`Failed to clear ${dbName} IndexedDB`);
          } catch (e) {
            console.warn(`Failed to delete ${dbName} database:`, e);
          }
        });
      } catch (e) {
        console.warn('Failed to access IndexedDB for cleanup:', e);
      }
    }

    console.log(`🧹 WalletConnect session cleanup completed (${wcKeys.length} keys removed)`);
  } catch (error) {
    console.warn('WalletConnect cleanup failed:', error);
  }
};

// Client-side only connector creation to prevent SSR issues
const createConnectors = async () => {
  // Only create connectors on client side
  if (typeof window === 'undefined') {
    return [];
  }

  // Clean up any stale WalletConnect sessions first
  cleanupWalletConnectSessions();

  const connectors = [
    // Primary: Injected wallets (MetaMask, etc.) - prioritize to avoid WalletConnect issues
    injected({
      shimDisconnect: true,
    }),

    // Secondary: Coinbase Wallet (enable Smart Wallet + EOA)
    coinbaseWallet({
      appName: 'Imperfect Form',
      appLogoUrl: 'https://imperfectform.fun/icon-192x192.png',
      // Offer passkey (Smart Wallet) and EOA to maximize compatibility
      preference: 'all',
      // Prevent window.ethereum override issues
      headlessMode: false,
    }),

    // Tertiary: WalletConnect (only if project ID is properly configured)
    ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID &&
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID !== '2b1d8e5a5c1e4c8a9b1e3d4a5b6c7d8e'
      ? [
          walletConnect({
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
            metadata: {
              name: 'Imperfect Form',
              description: 'Onchain fitness challenges',
              url: window.location.origin,
              icons: [`${window.location.origin}/icon-192x192.png`],
            },
            showQrModal: true,
            qrModalOptions: {
              themeMode: 'dark',
              themeVariables: {
                '--wcm-z-index': '2000',
              },
            },
            disableProviderPing: false,
            relayUrl: 'wss://relay.walletconnect.com',
          }),
        ]
      : []),
  ];

  // Add Farcaster mini app connector if available (client-side only)
  try {
    const { farcasterMiniApp } = await import('@farcaster/miniapp-wagmi-connector');
    if (farcasterMiniApp && typeof farcasterMiniApp === 'function') {
      const connector = farcasterMiniApp() as any; // Type assertion for compatibility
      connectors.unshift(connector);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Farcaster mini app connector added to Wagmi config');
      }
    }
  } catch (err) {
    console.warn('@farcaster/miniapp-wagmi-connector not available:', err);
  }

  return connectors;
};

// Create Wagmi config with client-side initialization
const createWagmiConfig = async () => {
  const connectors = await createConnectors();
  return createConfig({
    chains: [celo, polygon, base, monadMainnet, avalanche],
    connectors,
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      // Base: Primary Alchemy + fallback to public RPC
      [base.id]: http('https://base-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B'),
      // Polygon: Primary Alchemy + fallback to public RPCs
      [polygon.id]: http(
        'https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B'
      ),
      // Celo: Official + fallback (critical for Self Protocol)
      [celo.id]: http('https://forno.celo.org'),
      // Monad: Official mainnet
      [monadMainnet.id]: http('https://rpc.monad.xyz'),
      // Avalanche C-Chain
      [avalanche.id]: http('https://api.avax.network/ext/bc/C/rpc'),
    },
  });
};

// Optimized Query client with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
});

// Toast configuration optimized for all platforms
const toastConfig = {
  position: 'top-center' as const,
  toastOptions: {
    style: {
      background: '#111',
      color: 'primary',
      border: '2px solid primary',
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '12px',
      padding: '16px',
      maxWidth: '400px',
      textAlign: 'center' as const,
      boxShadow: '0 0 10px rgba(252, 177, 49, 0.5)',
      wordBreak: 'break-word' as const,
      whiteSpace: 'pre-wrap' as const,
      overflowWrap: 'break-word' as const,
    },
    success: {
      style: {
        background: '#111',
        color: '#00a651',
        border: '2px solid #00a651',
      },
      iconTheme: {
        primary: '#00a651',
        secondary: '#111',
      },
      duration: 3000,
    },
    error: {
      style: {
        background: '#111',
        color: '#ff4500',
        border: '2px solid #ff4500',
      },
      iconTheme: {
        primary: '#ff4500',
        secondary: '#111',
      },
      duration: 5000,
    },
    loading: {
      style: {
        background: '#111',
        color: '#3498db',
        border: '2px solid #3498db',
      },
      iconTheme: {
        primary: '#3498db',
        secondary: '#111',
      },
    },
    duration: 3000,
  },
};

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Simplified App Providers using unified PlatformContext
 * This replaces the complex multi-context architecture with a single, clean provider
 */
export default function SimplifiedAppProviders({ children }: AppProvidersProps) {
  const [isClient, setIsClient] = useState(false);
  const [wagmiConfig, setWagmiConfig] = useState<Awaited<
    ReturnType<typeof createWagmiConfig>
  > | null>(null);

  // Initialize on client side only
  useEffect(() => {
    setIsClient(true);

    // Clean up any stale sessions on app load
    if (typeof window !== 'undefined') {
      // Always clean WalletConnect sessions on app load to prevent stale session errors
      try {
        cleanupWalletConnectSessions();
      } catch (error) {
        console.warn('Failed to clean stale WalletConnect sessions:', error);
      }
    }

    createWagmiConfig().then((config) => {
      setWagmiConfig(config);
    });
  }, []);

  // Show loading spinner during client-side initialization
  if (!isClient || !wagmiConfig) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner />
          <p className="text-yellow-400 font-bold animate-pulse">Initializing ...</p>
        </div>
      </div>
    );
  }

  const WagmiProviderComponent = WagmiProvider as React.ComponentType<{
    config: typeof wagmiConfig;
    children: React.ReactNode;
  }>;

  // Get Neynar client ID from environment
  const neynarClientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || '';

  return (
    <WalletErrorBoundary>
      <WagmiProviderComponent config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <EnhancedChainThemeProvider>
            <PlatformProvider>
              <NeynarAuthProvider clientId={neynarClientId}>
                <Toaster {...toastConfig} />
                {children}
                <WalletSelectorModal />
                <WalletDebugInfo />
                {/* Removed: WalletConnectionDiagnostic - consolidated into unified system */}
              </NeynarAuthProvider>
            </PlatformProvider>
          </EnhancedChainThemeProvider>
        </QueryClientProvider>
      </WagmiProviderComponent>
    </WalletErrorBoundary>
  );
}

// Export the query client for external use if needed
export { queryClient };

// Backward compatibility exports
export { usePlatform as useUniversalWallet } from '@/contexts/PlatformContext';
export { useWallet as useWalletProvider } from '@/contexts/PlatformContext';

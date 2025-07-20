"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { base, polygon, celo, type Chain } from "wagmi/chains";
import { Toaster } from "react-hot-toast";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { NeynarAuthProvider } from "@/contexts/NeynarAuthContext";
import { EnhancedChainThemeProvider } from "@/contexts/ChainThemeContext";
import WalletSelectorModal from "@/components/modals/WalletSelectorModal";
import { Spinner } from "@/components/ui";

// Define Monad Testnet
const monadTestnet: Chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MON",
    symbol: "MON",
  },
  rpcUrls: {
    public: { http: ["https://testnet-rpc.monad.xyz/"] },
    default: { http: ["https://testnet-rpc.monad.xyz/"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
  testnet: true,
};

// Comprehensive WalletConnect session cleanup utility
const cleanupWalletConnectSessions = () => {
  if (typeof window === "undefined") return;

  try {
    // Clear all WalletConnect related localStorage keys
    const allKeys = Object.keys(localStorage);
    const wcKeys = allKeys.filter(
      (key) =>
        key.startsWith("wc@2:") ||
        key.startsWith("walletconnect") ||
        key.includes("walletconnect") ||
        key.includes("wc_") ||
        key.includes("WALLETCONNECT") ||
        key.startsWith("@walletconnect") ||
        key.includes("reown") ||
        key.includes("w3m")
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
          key.startsWith("wc@2:") ||
          key.startsWith("walletconnect") ||
          key.includes("walletconnect") ||
          key.includes("wc_") ||
          key.includes("reown") ||
          key.includes("w3m")
      );

      sessionKeys.forEach((key) => {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.warn(
            `Failed to remove WalletConnect sessionStorage key ${key}:`,
            e
          );
        }
      });
    } catch (e) {
      console.warn("Failed to access sessionStorage for cleanup:", e);
    }

    // Clear IndexedDB WalletConnect data
    if (window.indexedDB) {
      try {
        // Clear multiple possible database names
        const dbNames = ["walletconnect", "wc", "reown", "w3m"];
        dbNames.forEach((dbName) => {
          try {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = () =>
              console.log(`${dbName} IndexedDB cleared`);
            deleteReq.onerror = () =>
              console.warn(`Failed to clear ${dbName} IndexedDB`);
          } catch (e) {
            console.warn(`Failed to delete ${dbName} database:`, e);
          }
        });
      } catch (e) {
        console.warn("Failed to access IndexedDB for cleanup:", e);
      }
    }

    console.log(
      `🧹 WalletConnect session cleanup completed (${wcKeys.length} keys removed)`
    );
  } catch (error) {
    console.warn("WalletConnect cleanup failed:", error);
  }
};

// Client-side only connector creation to prevent SSR issues
const createConnectors = async () => {
  // Only create connectors on client side
  if (typeof window === "undefined") {
    return [];
  }

  // Clean up any stale WalletConnect sessions first
  cleanupWalletConnectSessions();

  const connectors = [
    // Primary: WalletConnect (best for web, supports mobile wallets via QR)
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
        "2b1d8e5a5c1e4c8a9b1e3d4a5b6c7d8e",
      metadata: {
        name: "Imperfect Form",
        description: "Onchain fitness challenges",
        url: window.location.origin,
        icons: [`${window.location.origin}/icon-192x192.png`],
      },
      showQrModal: true,
      // Add options to prevent session conflicts and improve reliability
      qrModalOptions: {
        themeMode: "dark",
        themeVariables: {
          "--wcm-z-index": "2000",
        },
      },
      // Add these options to prevent stale sessions
      disableProviderPing: false,
      relayUrl: "wss://relay.walletconnect.com",
    }),

    // Secondary: Injected wallets (MetaMask, etc.)
    injected({
      shimDisconnect: true,
    }),

    // Tertiary: Coinbase Wallet (fallback)
    coinbaseWallet({
      appName: "Imperfect Form",
      appLogoUrl: "https://imperfectform.fun/icon-192x192.png",
      preference: "eoaOnly",
      enableMobileWalletLink: true,
    }),
  ];

  // Add Farcaster connector if available (client-side only)
  try {
    const farcasterConnector = await import("@farcaster/frame-wagmi-connector");
    if (
      farcasterConnector?.farcasterFrame &&
      typeof farcasterConnector.farcasterFrame === "function"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connector = farcasterConnector.farcasterFrame() as any;
      connectors.unshift(connector);
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Farcaster connector added to Wagmi config");
      }
    }
  } catch (err) {
    console.warn("@farcaster/frame-wagmi-connector not available:", err);
  }

  return connectors;
};

// Create Wagmi config with client-side initialization
const createWagmiConfig = async () => {
  const connectors = await createConnectors();
  return createConfig({
    chains: [celo, polygon, base, monadTestnet],
    connectors,
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [base.id]: http(
        "https://base-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
      ),
      [polygon.id]: http(
        "https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
      ),
      [celo.id]: http(),
      [monadTestnet.id]: http(),
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
  position: "top-center" as const,
  toastOptions: {
    style: {
      background: "#111",
      color: "#fcb131",
      border: "2px solid #fcb131",
      fontFamily: '"Press Start 2P", cursive',
      fontSize: "12px",
      padding: "16px",
      maxWidth: "400px",
      textAlign: "center" as const,
      boxShadow: "0 0 10px rgba(252, 177, 49, 0.5)",
      wordBreak: "break-word" as const,
      whiteSpace: "pre-wrap" as const,
      overflowWrap: "break-word" as const,
    },
    success: {
      style: {
        background: "#111",
        color: "#00a651",
        border: "2px solid #00a651",
      },
      iconTheme: {
        primary: "#00a651",
        secondary: "#111",
      },
      duration: 3000,
    },
    error: {
      style: {
        background: "#111",
        color: "#ff4500",
        border: "2px solid #ff4500",
      },
      iconTheme: {
        primary: "#ff4500",
        secondary: "#111",
      },
      duration: 5000,
    },
    loading: {
      style: {
        background: "#111",
        color: "#3498db",
        border: "2px solid #3498db",
      },
      iconTheme: {
        primary: "#3498db",
        secondary: "#111",
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
export default function SimplifiedAppProviders({
  children,
}: AppProvidersProps) {
  const [isClient, setIsClient] = useState(false);
  const [wagmiConfig, setWagmiConfig] = useState<Awaited<
    ReturnType<typeof createWagmiConfig>
  > | null>(null);

  // Initialize on client side only
  useEffect(() => {
    setIsClient(true);

    // Clean up any stale sessions on app load
    if (typeof window !== "undefined") {
      // Always clean WalletConnect sessions on app load to prevent stale session errors
      try {
        cleanupWalletConnectSessions();
      } catch (error) {
        console.warn("Failed to clean stale WalletConnect sessions:", error);
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
          <p className="text-yellow-400 font-bold animate-pulse">
            Initializing wallet providers...
          </p>
        </div>
      </div>
    );
  }

  const WagmiProviderComponent = WagmiProvider as React.ComponentType<{
    config: typeof wagmiConfig;
    children: React.ReactNode;
  }>;

  // Get Neynar client ID from environment
  const neynarClientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "";

  return (
    <WagmiProviderComponent config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <EnhancedChainThemeProvider>
          <PlatformProvider>
            <NeynarAuthProvider clientId={neynarClientId}>
              <Toaster {...toastConfig} />
              {children}
              <WalletSelectorModal />
            </NeynarAuthProvider>
          </PlatformProvider>
        </EnhancedChainThemeProvider>
      </QueryClientProvider>
    </WagmiProviderComponent>
  );
}

// Export the query client for external use if needed
export { queryClient };

// Backward compatibility exports
export { usePlatform as useUniversalWallet } from "@/contexts/PlatformContext";
export { useWallet as useWalletProvider } from "@/contexts/PlatformContext";

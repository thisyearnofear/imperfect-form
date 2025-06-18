"use client";

import React, { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { baseSepolia, polygon, celo, type Chain } from "wagmi/chains";

// Import Farcaster connector
let farcasterFrame: (() => unknown) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const farcasterConnector = require("@farcaster/frame-wagmi-connector");
  farcasterFrame = farcasterConnector.farcasterFrame;
} catch {
  console.warn("@farcaster/frame-wagmi-connector not available");
}
import { Toaster } from "react-hot-toast";
import { PlatformProvider } from "@/contexts/PlatformContext";
import { NeynarAuthProvider } from "@/contexts/NeynarAuthContext";

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

// Create connectors array with Farcaster support - singleton to prevent multiple WalletConnect inits
let connectorsCache: ReturnType<typeof createConnectorsInternal> | null = null;

const createConnectorsInternal = () => {
  const connectors = [
    // Primary: WalletConnect (best for web, supports mobile wallets via QR)
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
        "2b1d8e5a5c1e4c8a9b1e3d4a5b6c7d8e",
      metadata: {
        name: "Imperfect Form",
        description: "Onchain fitness challenges",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_BASE_URL || "https://imperfectform.fun",
        icons: [
          `${
            typeof window !== "undefined"
              ? window.location.origin
              : process.env.NEXT_PUBLIC_BASE_URL || "https://imperfectform.fun"
          }/icon-192x192.png`,
        ],
      },
      showQrModal: true, // Enable QR modal for web users to connect mobile wallets
    }),

    // Secondary: Injected wallets (MetaMask, etc.)
    injected({
      shimDisconnect: true,
    }),

    // Tertiary: Coinbase Wallet (fallback)
    coinbaseWallet({
      appName: "Imperfect Form",
      appLogoUrl: "https://imperfectform.fun/icon-192x192.png",
      preference: "eoaOnly", // Use standard EOA wallets for consistency
      enableMobileWalletLink: true,
    }),
  ];

  // Add Farcaster connector if available
  if (farcasterFrame && typeof farcasterFrame === "function") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connector = (farcasterFrame as () => any)();
      connectors.unshift(connector); // Add at beginning for priority in Farcaster context
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Farcaster connector added to Wagmi config");
      }
    } catch (err) {
      console.warn("Failed to initialize Farcaster connector:", err);
    }
  }

  return connectors;
};

const createConnectors = () => {
  if (!connectorsCache) {
    connectorsCache = createConnectorsInternal();
  }
  return connectorsCache;
};

// Optimized Wagmi config - CELO first as default for better mobile/Farcaster UX
const wagmiConfig = createConfig({
  chains: [celo, polygon, baseSepolia, monadTestnet],
  connectors: createConnectors(),
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [baseSepolia.id]: http(
      "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
    ),
    [polygon.id]: http(
      "https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
    ),
    [celo.id]: http(),
    [monadTestnet.id]: http(),
  },
});

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
  const WagmiProviderComponent = WagmiProvider as React.ComponentType<{
    config: typeof wagmiConfig;
    children: React.ReactNode;
  }>;

  // Get Neynar client ID from environment
  const neynarClientId = process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || "";

  return (
    <WagmiProviderComponent config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PlatformProvider>
          <NeynarAuthProvider clientId={neynarClientId}>
            <Toaster {...toastConfig} />
            {children}
          </NeynarAuthProvider>
        </PlatformProvider>
      </QueryClientProvider>
    </WagmiProviderComponent>
  );
}

// Export the config for external use if needed
export { wagmiConfig, queryClient };

// Backward compatibility exports
export { usePlatform as useUniversalWallet } from "@/contexts/PlatformContext";
export { useWallet as useWalletProvider } from "@/contexts/PlatformContext";

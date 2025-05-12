"use client";

import React, { ReactNode, useEffect, useRef } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { NetworkProvider, useNetwork } from "@/contexts/NetworkContext";
import {
  WalletProviderProvider,
  useWalletProvider,
} from "@/contexts/WalletProviderContext";
import { Toaster } from "react-hot-toast";

// Props for the ConditionalProviders component
interface ConditionalProvidersProps {
  children: ReactNode;
}

// ConditionalProviders component that renders the appropriate provider based on the selected network
function ConditionalProviders({ children }: ConditionalProvidersProps) {
  const { network } = useNetwork();
  const { walletProvider, setWalletProvider } = useWalletProvider();

  // Use useMemo instead of useState to prevent unnecessary re-renders
  const queryClient = React.useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: Infinity,
            // Disable automatic refetching
            refetchInterval: false,
            // Disable background fetching
            refetchIntervalInBackground: false,
          },
        },
      }),
    []
  );

  // Create Wagmi config for Base with detailed logging
  // Use useMemo to prevent unnecessary re-renders
  const wagmiConfig = React.useMemo(
    () =>
      createConfig({
        chains: [baseSepolia],
        multiInjectedProviderDiscovery: false, // Disable multi-provider discovery to avoid conflicts
        connectors: [
          coinbaseWallet({
            appName: "Imperfect Form",
            headlessMode: false,
            version: "4",
            appLogoUrl: null,
            // Allow both smart wallet and regular wallet modes
            preference: {
              keysUrl: "https://keys.coinbase.com/connect",
              options: "all", // Allow both EOA and smart wallet options
            },
            // Note: checkCrossOriginOpenerPolicy is not supported in the current version
            // We'll need to handle COOP errors differently
          }),
        ],
        ssr: false, // Set to false to avoid SSR issues with wallet connections
        transports: {
          [baseSepolia.id]: http(
            process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_URL ||
              "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
          ),
        },
        syncConnectedChain: false, // Disable auto-syncing to prevent disconnection issues
      }),
    []
  );

  // Only log on client side to prevent server log flooding
  if (typeof window !== "undefined") {
    // Log the Base Sepolia chain ID for debugging
    console.log("Base Sepolia Chain ID:", baseSepolia.id);

    // Log Wagmi configuration details
    console.log("AppProviders: Wagmi configuration", {
      chains: [baseSepolia],
      connectors: "Coinbase Wallet Connector",
      network,
      walletProvider,
    });
  }

  // Always use WagmiProvider + QueryClientProvider regardless of network
  // ThirdwebProvider will be added at the GameWrapper level when needed

  // Reference to track if we've already synced to prevent loops
  const syncingRef = useRef(false);

  // Use a callback ref to store the previous network and walletProvider values
  const prevValuesRef = useRef({ network, walletProvider });

  // Use a stable callback to prevent unnecessary re-renders
  const syncWalletProvider = React.useCallback(() => {
    // Skip if already syncing to prevent update loops
    if (syncingRef.current) return;

    // Skip if values haven't changed to prevent unnecessary re-renders
    if (
      prevValuesRef.current.network === network &&
      prevValuesRef.current.walletProvider === walletProvider
    ) {
      return;
    }

    // Update the previous values
    prevValuesRef.current = { network, walletProvider };

    // Check if we have a wallet provider from localStorage
    const storedWalletProvider = localStorage.getItem("selectedWalletProvider");

    // If we have a stored wallet provider, respect it and don't auto-sync
    if (storedWalletProvider) {
      console.log(
        "AppProviders: Found stored wallet provider:",
        storedWalletProvider
      );
      return;
    }

    // Only auto-sync when walletProvider is null and no stored provider exists
    if (network === "base" && walletProvider === null) {
      // Only log on client side
      if (typeof window !== "undefined") {
        console.log(
          "Auto-setting wallet provider to 'smart' for new user with 'base' network"
        );
      }
      syncingRef.current = true;
      setWalletProvider("smart");
      // Reset syncing flag after a delay
      setTimeout(() => {
        syncingRef.current = false;
      }, 1000);
    } else if (network === "polygon" && walletProvider === null) {
      // Only log on client side
      if (typeof window !== "undefined") {
        console.log(
          "Auto-setting wallet provider to 'signature' for new user with 'polygon' network"
        );
      }
      syncingRef.current = true;
      setWalletProvider("signature");
      // Reset syncing flag after a delay
      setTimeout(() => {
        syncingRef.current = false;
      }, 1000);
    }
  }, [network, walletProvider, setWalletProvider]);

  // Use effect to call the stable callback
  useEffect(() => {
    syncWalletProvider();
  }, [syncWalletProvider]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

// Props for the AppProviders component
interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders component that wraps the application with all necessary providers
 */
export default function AppProviders({ children }: AppProvidersProps) {
  return (
    <NetworkProvider>
      <WalletProviderProvider>
        <ConditionalProviders>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#111",
                color: "#fcb131",
                border: "2px solid #fcb131",
                fontFamily: '"Press Start 2P", cursive',
                fontSize: "12px",
                padding: "16px",
                maxWidth: "400px",
                textAlign: "center",
                boxShadow: "0 0 10px rgba(252, 177, 49, 0.5)",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
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
                duration: 5000,
              },
              error: {
                style: {
                  background: "#111",
                  color: "#ff4500",
                  border: "2px solid #ff4500",
                  maxWidth: "350px",
                },
                iconTheme: {
                  primary: "#ff4500",
                  secondary: "#111",
                },
                duration: 7000,
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
              duration: 5000,
            }}
          />
          {children}
        </ConditionalProviders>
      </WalletProviderProvider>
    </NetworkProvider>
  );
}

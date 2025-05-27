"use client";

import React, { ReactNode, useEffect, useRef } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia } from "wagmi/chains";
import { getWagmiConfig } from "@/utils/walletConfig";
import { NetworkProvider, useNetwork } from "@/contexts/NetworkContext";
import {
  WalletProviderProvider,
  useWalletProvider,
} from "@/contexts/WalletProviderContext";
import { FarcasterWalletProvider } from "@/components/wallet/FarcasterWalletProvider";
import { MiniAppProvider } from "@/contexts/MiniAppContext";
import { Toaster } from "react-hot-toast";
import GlobalErrorHandler from "./GlobalErrorHandler";
import { initRemoteLogger } from "@/utils/remoteLogger";

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

  // Get the Wagmi config from walletConfig.ts
  // Use useMemo to prevent unnecessary re-renders
  const wagmiConfig = React.useMemo(() => getWagmiConfig(), []);

  // Only log once on initial render to prevent flooding and render loops
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Use a debugging flag to avoid excessive logging
      const debugMode = false;
      if (debugMode) {
        console.log("Base Sepolia Chain ID:", baseSepolia.id);
        console.log("AppProviders: Wagmi configuration", {
          network,
          walletProvider,
        });
      }
    }
  }, [network, walletProvider]); // Only re-run if these specific props change

  // Always use WagmiProvider + QueryClientProvider regardless of network
  // ThirdwebProvider will be added at the GameWrapper level when needed

  // Reference to track if we've already synced to prevent loops
  const syncingRef = useRef(false);

  // Use a callback ref to store the previous network and walletProvider values
  const prevValuesRef = useRef({ network, walletProvider });

  // Use a stable callback to prevent unnecessary re-renders
  const syncWalletProvider = React.useCallback(() => {
    // Check URL parameters first
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("showSelector") === "true") {
        console.log(
          "AppProviders: showSelector URL parameter found, skipping auto-sync"
        );
        return;
      }
    }

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
    if (network === "base-sepolia" && walletProvider === null) {
      // Only log on client side
      if (typeof window !== "undefined") {
        console.log(
          "Auto-setting wallet provider to 'smart' for new user with 'base-sepolia' network"
        );
      }
      syncingRef.current = true;
      setWalletProvider("smart");
      // Reset syncing flag after a delay
      setTimeout(() => {
        syncingRef.current = false;
      }, 1000);
    } else if (
      (network === "polygon" || network === "monad" || network === "celo") &&
      walletProvider === null
    ) {
      // Only log on client side
      if (typeof window !== "undefined") {
        console.log(
          `Auto-setting wallet provider to 'signature' for new user with '${network}' network`
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
    // Give URL parameter check higher priority
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("showSelector") === "true") {
        // Clear the URL parameter without refreshing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        // Skip auto-sync completely when showing selector
        return;
      }
    }

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
  // Initialize remote logger for mobile debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      initRemoteLogger({
        enabled: true,
        captureConsole: false, // Only capture explicit logs, not all console output
      });
    }
  }, []);

  return (
    <NetworkProvider>
      <WalletProviderProvider>
        <FarcasterWalletProvider>
          <MiniAppProvider>
            <ConditionalProviders>
              <GlobalErrorHandler />
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
              {/* Debug Provider removed as requested */}
              {children}
            </ConditionalProviders>
          </MiniAppProvider>
        </FarcasterWalletProvider>
      </WalletProviderProvider>
    </NetworkProvider>
  );
}

"use client";

import React, { ReactNode, useState } from "react";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { NetworkProvider, useNetwork } from "@/contexts/NetworkContext";
import { Toaster } from "react-hot-toast";

// Define custom chain configurations
const customChains = {
  amoy: {
    chainId: 80002,
    rpc: [
      process.env.NEXT_PUBLIC_ALCHEMY_AMOY_URL ||
        "https://polygon-amoy.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
      "https://rpc-amoy.polygon.technology",
    ],
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    shortName: "amoy",
    slug: "amoy",
    testnet: true,
    name: "Polygon Amoy",
    network: "polygon-amoy",
    explorers: [
      {
        name: "Polygon Amoy Explorer",
        url: "https://amoy.polygonscan.com",
        standard: "EIP3091",
      },
    ],
  },
  base: {
    chainId: 84532,
    rpc: [
      process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_URL ||
        "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
      "https://sepolia.base.org",
      "https://base-sepolia.blockpi.network/v1/rpc/public",
      "https://1rpc.io/base-sepolia",
    ],
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    shortName: "base-sepolia",
    slug: "base-sepolia",
    testnet: true,
    name: "Base Sepolia",
    network: "base-sepolia",
    explorers: [
      {
        name: "Base Sepolia Explorer",
        url: "https://sepolia-explorer.base.org",
        standard: "EIP3091",
      },
    ],
  },
};

// Props for the ConditionalProviders component
interface ConditionalProvidersProps {
  children: ReactNode;
}

// ConditionalProviders component that renders the appropriate provider based on the selected network
function ConditionalProviders({ children }: ConditionalProvidersProps) {
  const { network } = useNetwork();
  const [queryClient] = useState(() => new QueryClient());

  // Create Wagmi config for Base with detailed logging
  const wagmiConfig = createConfig({
    chains: [baseSepolia],
    multiInjectedProviderDiscovery: true, // Enable discovery of multiple injected providers
    connectors: [
      coinbaseWallet({
        appName: "Imperfect Form",
        headlessMode: false,
        version: "4",
        appLogoUrl: null,
        preference: {
          keysUrl: "https://keys.coinbase.com/connect",
          options: "smartWalletOnly", // Force smart wallet mode
        },
      }),
    ],
    ssr: true,
    transports: {
      [baseSepolia.id]: http(
        process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_URL ||
          "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
      ),
    },
    syncConnectedChain: true, // Sync connected chain with wallet
  });

  // Log the Base Sepolia chain ID for debugging
  console.log("Base Sepolia Chain ID:", baseSepolia.id);

  // Log Wagmi configuration details
  console.log("AppProviders: Wagmi configuration", {
    chains: [baseSepolia],
    connectors: "Coinbase Wallet Connector",
    network: network,
  });

  // Render the appropriate provider based on the selected network
  if (network === "base") {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  // Default to ThirdWeb for Polygon
  return (
    <ThirdwebProvider
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""}
      activeChain={customChains.amoy}
      supportedChains={[customChains.amoy]}
      dAppMeta={{
        name: "Imperfect Form",
        description: "Submit your fitness scores to the blockchain",
        logoUrl: "/favicon.ico",
        url: "https://imperfectform.fun",
        isDarkMode: true,
      }}
      walletConnectors={[
        {
          name: "metamask",
          options: {
            projectId:
              process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
              "3a8170812b534d0ff9d794f19a901d64",
            chains: [80002],
            enableNetworkView: true,
          },
        },
        {
          name: "walletConnect",
          options: {
            projectId:
              process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
              "3a8170812b534d0ff9d794f19a901d64",
            chains: [80002],
            enableNetworkView: true,
            showQrModal: true,
            qrModalOptions: {
              themeMode: "dark",
              themeVariables: {
                "--wcm-z-index": "2500",
                "--wcm-accent-color": "#fcb131",
                "--wcm-accent-fill-color": "#000000",
                "--wcm-background-color": "#000000",
                "--wcm-background-border-radius": "8px",
              },
            },
            namespaces: {
              eip155: {
                methods: [
                  "eth_sendTransaction",
                  "eth_signTransaction",
                  "eth_sign",
                  "personal_sign",
                  "eth_signTypedData",
                  "eth_signTypedData_v4",
                ],
                chains: [`eip155:80002`],
                events: ["chainChanged", "accountsChanged"],
              },
            },
          },
        },
        {
          name: "coinbaseWallet",
          options: {
            appName: "Imperfect Form",
            headlessMode: true,
          },
        },
        "injected",
      ]}
    >
      {children}
    </ThirdwebProvider>
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
    </NetworkProvider>
  );
}

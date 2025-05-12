"use client";

import React, { ReactNode, createContext, useState, useEffect } from "react";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { Toaster } from "react-hot-toast";
import { RadixUIFix } from "@/components/utils";
import { useNetwork as useNetworkContext } from "@/contexts/NetworkContext";
// QueryClient is not used in this file
import {
  POLYGON_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
} from "@/constants/contracts";

interface ProvidersProps {
  children: ReactNode;
}

export type Chain = "amoy" | "base";

export interface ChainContextType {
  chain: Chain;
  setChain: (chain: Chain) => void;
  chainId: number;
  contractAddress: string;
}

// Import baseSepolia to ensure we're using the correct chain ID
import { baseSepolia } from "wagmi/chains";

// Define chain IDs for our supported networks
const chainIdMap = {
  amoy: 80002, // Polygon Amoy testnet
  base: baseSepolia.id, // Base Sepolia testnet - use the chain ID from wagmi/chains
};

export const ChainContext = createContext<ChainContextType>({
  chain: "base",
  setChain: () => {},
  chainId: chainIdMap.base,
  contractAddress: BASE_CONTRACT_ADDRESS,
});

const Providers: React.FC<ProvidersProps> = ({ children }) => {
  // We don't need to create a QueryClient here as it's already created in AppProviders

  // Use localStorage to persist chain selection (if available), default to "base"
  const [chain, setChain] = useState<Chain>("base");

  // Get the network context
  const { network, setNetwork } = useNetworkContext();

  // Update chain from localStorage and sync with network context on client-side only
  useEffect(() => {
    const savedChain = localStorage.getItem("selectedChain");
    // Default to "base" if no chain is saved or if the saved chain is invalid
    const validChain =
      savedChain === "amoy" || savedChain === "base" ? savedChain : "base";

    // Set the chain state
    setChain(validChain as Chain);

    // Also update localStorage to ensure it has the correct value
    localStorage.setItem("selectedChain", validChain);

    // Also update the network context to keep them in sync
    const correspondingNetwork = validChain === "amoy" ? "polygon" : "base";
    if (network !== correspondingNetwork) {
      setNetwork(correspondingNetwork);
      console.log(
        `Synced network context with chain: ${validChain} -> ${correspondingNetwork}`
      );
    }
  }, [network, setNetwork]);

  // Save chain selection to localStorage and update network context
  const handleChainChange = (newChain: Chain) => {
    setChain(newChain);
    localStorage.setItem("selectedChain", newChain);

    // Also update the network context to keep them in sync
    const correspondingNetwork = newChain === "amoy" ? "polygon" : "base";
    if (network !== correspondingNetwork) {
      setNetwork(correspondingNetwork);
      console.log(
        `Updated network context from chain change: ${newChain} -> ${correspondingNetwork}`
      );
    }
  };

  const configMap: Record<Chain, { chainId: number; contractAddress: string }> =
    {
      amoy: {
        chainId: chainIdMap.amoy,
        contractAddress: POLYGON_CONTRACT_ADDRESS,
      },
      base: {
        chainId: chainIdMap.base,
        contractAddress: BASE_CONTRACT_ADDRESS,
      },
    };

  const { chainId, contractAddress } = configMap[chain];

  // Define custom chain configurations with better RPC URLs
  const customChains = {
    amoy: {
      chainId: chainIdMap.amoy,
      rpc: [
        // Use your own Alchemy API key for better reliability
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
      // Add explicit network information to prevent defaulting to Ethereum
      network: "polygon-amoy",
      // Add explorer information
      explorers: [
        {
          name: "Polygon Amoy Explorer",
          url: "https://amoy.polygonscan.com",
          standard: "EIP3091",
        },
      ],
    },
    base: {
      chainId: chainIdMap.base,
      rpc: [
        // Use your own Alchemy API key for better reliability
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
      // Add explicit network information to prevent defaulting to Ethereum
      network: "base-sepolia",
      // Add explorer information
      explorers: [
        {
          name: "Base Sepolia Explorer",
          url: "https://sepolia-explorer.base.org",
          standard: "EIP3091",
        },
      ],
    },
  };

  return (
    <ChainContext.Provider
      value={{ chain, setChain: handleChainChange, chainId, contractAddress }}
    >
      <RadixUIFix>
        <ThirdwebProvider
          clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""}
          activeChain={chain === "amoy" ? customChains.amoy : customChains.base}
          supportedChains={[customChains.amoy, customChains.base]}
          // Disable auth config to use wallet connection without authentication
          // authConfig={{
          //   domain:
          //     typeof window !== "undefined"
          //       ? window.location.host
          //       : "imperfect-form.vercel.app",
          //   authUrl: "/api/auth",
          // }}
          dAppMeta={{
            name: "Imperfect Form",
            description: "Submit your fitness scores to the blockchain",
            logoUrl: "/favicon.ico", // Next.js App Router will serve the favicon from /src/app/favicon.ico
            url: "https://imperfectform.fun", // Hardcoded URL instead of using window
            isDarkMode: true,
          }}
          // Use wallet connectors with proper configuration for ThirdWeb v4
          walletConnectors={[
            {
              id: "metamask",
              recommended: true,
            },
            {
              id: "walletConnect",
              recommended: false,
            },
            {
              id: "coinbase",
              recommended: false,
            },
            {
              id: "injected",
              recommended: false,
            },
          ]}
        >
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
                wordBreak: "break-word", // Allow long words to break
                whiteSpace: "pre-wrap", // Preserve whitespace but allow wrapping
                overflowWrap: "break-word", // Break words to prevent overflow
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
                duration: 5000, // Longer duration for success messages
              },
              error: {
                style: {
                  background: "#111",
                  color: "#ff4500",
                  border: "2px solid #ff4500",
                  maxWidth: "350px", // Wider for error messages
                },
                iconTheme: {
                  primary: "#ff4500",
                  secondary: "#111",
                },
                duration: 7000, // Longer duration for error messages
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
              duration: 5000, // Default duration
            }}
          />
          {children}
        </ThirdwebProvider>
      </RadixUIFix>
    </ChainContext.Provider>
  );
};

export default Providers;

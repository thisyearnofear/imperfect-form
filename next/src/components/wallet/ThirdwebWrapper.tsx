"use client";

import React, { useState, useEffect } from "react";
import { ThirdwebProvider, useAddress } from "@thirdweb-dev/react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";
import { ThirdwebDetector } from "@/components/wallet";
import ThirdwebQueryProvider from "./ThirdwebQueryProvider";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useNetwork } from "@/contexts/NetworkContext";

// Define a type for the chain configuration
interface ChainConfig {
  chainId: number;
  rpc: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  shortName: string;
  slug: string;
  testnet: boolean;
  name: string;
  network: string;
  explorers: {
    name: string;
    url: string;
    standard: string;
  }[];
}

// Dynamically import Game to prevent SSR issues
const Game = dynamic(() => import("@/components/game/Game"), {
  ssr: false,
  loading: () => <Spinner />,
});

/**
 * ThirdwebWrapper component that wraps the Game component with ThirdwebProvider
 * This isolates the ThirdWeb context to prevent React hook errors
 */
export default function ThirdwebWrapper() {
  // Get the selected network from context
  const { network } = useNetwork();
  const [activeChain, setActiveChain] = useState<ChainConfig | null>(null);

  // Load chain configuration on demand
  useEffect(() => {
    const loadChainConfig = async () => {
      let chainConfig;

      switch (network) {
        case "polygon":
          chainConfig = {
            chainId: 137,
            rpc: [
              "https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
              "https://polygon-rpc.com",
              "https://rpc-mainnet.matic.network",
            ],
            nativeCurrency: {
              name: "MATIC",
              symbol: "MATIC",
              decimals: 18,
            },
            shortName: "polygon",
            slug: "polygon",
            testnet: false,
            name: "Polygon Mainnet",
            network: "polygon",
            explorers: [
              {
                name: "Polygon Explorer",
                url: "https://polygonscan.com",
                standard: "EIP3091",
              },
            ],
          };
          break;

        case "monad":
          // Log the Monad testnet configuration for debugging
          console.log(
            "Setting up Monad testnet configuration with chain ID 10143"
          );
          chainConfig = {
            chainId: 10143,
            rpc: ["https://testnet-rpc.monad.xyz/"],
            nativeCurrency: {
              name: "MON",
              symbol: "MON",
              decimals: 18,
            },
            shortName: "monad-testnet",
            slug: "monad-testnet",
            testnet: true,
            name: "Monad Testnet",
            network: "monad-testnet",
            explorers: [
              {
                name: "Monad Testnet Explorer",
                url: "https://testnet.monadexplorer.com/",
                standard: "EIP3091",
              },
            ],
          };
          break;

        case "celo":
          chainConfig = {
            chainId: 42220,
            rpc: ["https://forno.celo.org", "https://rpc.ankr.com/celo"],
            nativeCurrency: {
              name: "CELO",
              symbol: "CELO",
              decimals: 18,
            },
            shortName: "celo",
            slug: "celo",
            testnet: false,
            name: "Celo Mainnet",
            network: "celo",
            explorers: [
              {
                name: "Celo Explorer",
                url: "https://explorer.celo.org",
                standard: "EIP3091",
              },
            ],
          };
          break;

        default:
          // Default to Base Sepolia
          chainConfig = {
            chainId: 84532,
            rpc: [
              process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_URL ||
                "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
              "https://sepolia.base.org",
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
          };
      }

      setActiveChain(chainConfig);
    };

    loadChainConfig();
  }, [network]);

  // Don't render until we have the chain config
  if (!activeChain) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <ThirdwebQueryProvider>
      <ThirdwebProvider
        clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""}
        storageInterface={{
          // This ensures React dialog has proper title
          get: async () => null,
          set: async () => {},
          remove: async () => {},
        }}
        activeChain={activeChain}
        dAppMeta={{
          name: "Imperfect Form",
          description: "Onchain olympians",
          logoUrl: "/favicon.ico",
          url: "https://imperfectform.fun",
          isDarkMode: true,
        }}
        theme="dark"
        modalSize="compact"
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
        <ThirdwebDetector />
        <ThirdwebGameWrapper />
      </ThirdwebProvider>
    </ThirdwebQueryProvider>
  );
}

/**
 * ThirdwebGameWrapper component that passes the ThirdWeb address to the Game component
 */
function ThirdwebGameWrapper() {
  // Use the wallet provider hook
  const { setUserAddress, setIsConnected } = useWalletProvider();

  // We can safely use the ThirdWeb useAddress hook here
  const address = useAddress();

  // Get the network from context
  const { network } = useNetwork();

  // Log the ThirdWeb address for debugging
  console.log(
    "ThirdwebGameWrapper: ThirdWeb address:",
    address,
    "Network:",
    network
  );

  // Use useEffect to log when the address changes and store it in localStorage
  React.useEffect(() => {
    console.log(
      "ThirdwebGameWrapper: ThirdWeb address changed:",
      address,
      "Network:",
      network
    );

    // Store the address in localStorage for persistence
    if (address) {
      localStorage.setItem("userAddress", address);

      // Update the wallet provider context
      setUserAddress(address);
      setIsConnected(true);
    } else {
      localStorage.removeItem("userAddress");

      // Update the wallet provider context
      setUserAddress(undefined);
      setIsConnected(false);
    }
  }, [address, setUserAddress, setIsConnected, network]);

  // Pass the address to the Game component
  return <Game thirdwebAddress={address} />;
}

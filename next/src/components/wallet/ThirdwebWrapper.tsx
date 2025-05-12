"use client";

import React from "react";
import { ThirdwebProvider, useAddress } from "@thirdweb-dev/react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";
import { ThirdwebDetector } from "@/components/wallet";
import ThirdwebQueryProvider from "./ThirdwebQueryProvider";
import { useWalletProvider } from "@/contexts/WalletProviderContext";

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
  // Define Polygon Amoy chain config
  const polygonAmoy = {
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
  };

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
        activeChain={polygonAmoy}
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

  // Log the ThirdWeb address for debugging
  console.log("ThirdwebGameWrapper: ThirdWeb address:", address);

  // Use useEffect to log when the address changes and store it in localStorage
  React.useEffect(() => {
    console.log("ThirdwebGameWrapper: ThirdWeb address changed:", address);

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
  }, [address, setUserAddress, setIsConnected]);

  // Pass the address to the Game component
  return <Game thirdwebAddress={address} />;
}

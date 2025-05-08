"use client";

import React from "react";
import { useNetwork } from "@/contexts/NetworkContext";
import Game from "@/components/Game";
import NetworkSelector from "@/components/NetworkSelector";
import { ThirdwebProvider } from "@thirdweb-dev/react";

/**
 * GameWrapper component that conditionally renders the Game component
 * based on the selected network, or shows the network selector if no network is selected
 */
export default function GameWrapper() {
  const { isNetworkSelected, network } = useNetwork();

  // If no network is selected, show the network selector
  if (!isNetworkSelected) {
    return <NetworkSelector />;
  }

  // Always wrap the Game component with ThirdwebProvider to ensure ThirdWeb hooks work
  // This prevents the "useAddress() hook must be used within a <ThirdwebProvider/>" error
  // For base network (Coinbase wallet), we need an additional ThirdwebProvider
  // For polygon network, ThirdwebProvider is already provided in AppProviders.tsx
  return (
    <>
      {network === "base" ? (
        <ThirdwebProvider
          clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""}
        >
          <Game />
        </ThirdwebProvider>
      ) : (
        <Game />
      )}
    </>
  );
}

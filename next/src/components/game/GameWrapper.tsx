"use client";

import React from "react";
import { useNetwork } from "@/contexts/NetworkContext";
import { Game } from "@/components/game";
import { WalletTypeSelector, WalletTypeDetector } from "@/components/wallet";
import { useAccount } from "wagmi";
import dynamic from "next/dynamic";

// Dynamically import ThirdwebProvider to prevent dialog errors
const ThirdwebGame = dynamic(
  () => import("@/components/wallet").then((mod) => mod.ThirdwebWrapper),
  { ssr: false }
);

/**
 * GameWrapper component that conditionally renders the Game component
 * based on the selected network, or shows the network selector if no network is selected
 */
export default function GameWrapper() {
  const { isNetworkSelected, network } = useNetwork();

  // Detect wagmi wallet connection
  const wagmiAccount = useAccount();

  // Log wallet detection but don't auto-change network
  React.useEffect(() => {
    if (wagmiAccount.address) {
      console.log(
        "Wagmi wallet detected in GameWrapper with address:",
        wagmiAccount.address
      );
      // Only set network if not already set, preserving user choice
      if (!network) {
        console.log("No network selected, defaulting to base");
        localStorage.setItem("selectedNetwork", "base");
        localStorage.setItem("selectedChain", "base");
      }
    }
  }, [wagmiAccount.address, network]);

  // If no network is selected, show the wallet type selector
  if (!isNetworkSelected) {
    return <WalletTypeSelector />;
  }

  // Conditionally render the appropriate game component based on the network
  if (network === "polygon") {
    console.log("GameWrapper: Rendering ThirdwebGame for Polygon network");
    return (
      <>
        <WalletTypeDetector />
        <ThirdwebGame />
      </>
    );
  }

  // For Base network or any other network, render the Game component directly
  console.log("GameWrapper: Rendering Game directly for Base network");
  return (
    <>
      <WalletTypeDetector />
      <Game />
    </>
  );
}

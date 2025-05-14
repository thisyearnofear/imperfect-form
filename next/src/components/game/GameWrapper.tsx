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
  const { isNetworkSelected, network, setNetwork } = useNetwork();

  // Detect wagmi wallet connection
  const wagmiAccount = useAccount();

  // Check URL parameters first (outside of effect)
  const showSelectorFromURL = React.useMemo(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const showSelector = params.get("showSelector");

      // Clear the parameter from URL without refreshing
      if (showSelector === "true") {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        console.log(
          "GameWrapper: Detected showSelector URL parameter, forcing selector display"
        );
        return true;
      }
    }
    return false;
  }, []);

  // Log wallet detection but don't auto-change network
  React.useEffect(() => {
    // If URL parameter was detected, don't auto-detect
    if (showSelectorFromURL) {
      return;
    }

    if (wagmiAccount.address) {
      console.log(
        "Wagmi wallet detected in GameWrapper with address:",
        wagmiAccount.address
      );

      // Check if we have a chain ID that indicates Monad testnet
      const chainId = localStorage.getItem("lastChainId");

      // Only set network if not already set, preserving user choice
      if (!network) {
        if (chainId === "10143") {
          console.log(
            "Detected Monad testnet from chain ID, setting network to monad"
          );
          localStorage.setItem("selectedNetwork", "monad");
          localStorage.setItem("selectedChain", "monad");
          // Add timestamp to force UI updates
          localStorage.setItem("lastNetworkChange", Date.now().toString());
        } else {
          console.log("No network selected, defaulting to base");
          localStorage.setItem("selectedNetwork", "base");
          localStorage.setItem("selectedChain", "base");
          // Add timestamp to force UI updates
          localStorage.setItem("lastNetworkChange", Date.now().toString());
        }
      }
    }
  }, [wagmiAccount.address, network, showSelectorFromURL]);

  // Check for Monad chain ID and force the correct network
  // This hook must be called unconditionally
  React.useEffect(() => {
    // Only run the check if we're not showing the selector
    if (!(showSelectorFromURL || !isNetworkSelected)) {
      const chainId = localStorage.getItem("lastChainId");
      if (chainId === "10143" && network !== "monad") {
        console.log(
          "GameWrapper: Detected Monad testnet chain ID, forcing network to monad"
        );
        // Update context through NetworkContext instead of direct localStorage manipulation
        setNetwork("monad");
      }
    }
  }, [network, showSelectorFromURL, isNetworkSelected, setNetwork]);

  // If URL parameter is present or no network is selected, show the wallet type selector
  if (showSelectorFromURL || !isNetworkSelected) {
    return <WalletTypeSelector />;
  }

  // Conditionally render the appropriate game component based on the network
  if (network === "polygon" || network === "monad" || network === "celo") {
    console.log(`GameWrapper: Rendering ThirdwebGame for ${network} network`);
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

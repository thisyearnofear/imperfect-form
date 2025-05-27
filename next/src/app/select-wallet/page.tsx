"use client";

import React, { useEffect } from "react";
import WalletTypeSelector from "@/components/wallet/WalletTypeSelector";

export default function WalletSelectionPage() {
  // Force clean localStorage on page load, but preserve Farcaster state
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if we're in Farcaster context
      const isInFarcaster =
        /farcaster|warpcast/i.test(navigator.userAgent) ||
        window.location.search.includes("frame=") ||
        window.location.search.includes("farcaster") ||
        document.referrer.includes("warpcast.com") ||
        document.referrer.includes("farcaster.xyz");

      // Check if we have a stored wallet provider
      const storedWalletProvider = localStorage.getItem(
        "selectedWalletProvider"
      );

      // If we're in Farcaster context OR we have a wallet provider set to "farcaster", preserve state
      if (isInFarcaster || storedWalletProvider === "farcaster") {
        console.log(
          "Wallet selection page: Preserving state in Farcaster context"
        );
        return;
      }

      // Only clear wallet state if NOT in Farcaster context and not using Farcaster wallet
      localStorage.removeItem("selectedWalletProvider");
      localStorage.removeItem("selectedNetwork");
      localStorage.removeItem("selectedChain");
      localStorage.removeItem("connectedWallet");
      localStorage.removeItem("wagmi.wallet");
      localStorage.removeItem("wagmi.connected");
      localStorage.removeItem("wagmi.store");
      localStorage.removeItem("wagmi.account");
      localStorage.removeItem("wagmi.chainId");
      localStorage.removeItem("walletconnect");
      localStorage.removeItem("WALLETCONNECT_DEEPLINK_CHOICE");
      localStorage.removeItem("userAddress");
      localStorage.removeItem("thirdweb.auth.token");
      localStorage.removeItem("thirdweb.wallets");

      console.log(
        "Wallet selection page: All wallet state cleared (non-Farcaster)"
      );
    }
  }, []);

  // Handle closure of the wallet selector
  const handleClose = () => {
    console.log("Selection dialog closed, redirecting to homepage");
    window.location.href = "/";
  };

  return <WalletTypeSelector onClose={handleClose} />;
}

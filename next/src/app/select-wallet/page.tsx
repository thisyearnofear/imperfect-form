"use client";

import React, { useEffect } from "react";
import WalletTypeSelector from "@/components/wallet/WalletTypeSelector";

export default function WalletSelectionPage() {
  // Force clean all localStorage on page load
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clear ALL wallet state
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
      
      console.log("Wallet selection page: All wallet state cleared");
    }
  }, []);

  // Handle closure of the wallet selector
  const handleClose = () => {
    console.log("Selection dialog closed, redirecting to homepage");
    window.location.href = "/";
  };

  return <WalletTypeSelector onClose={handleClose} />;
}
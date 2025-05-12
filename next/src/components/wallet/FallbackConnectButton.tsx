"use client";

import React from "react";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useNetwork } from "@/contexts/NetworkContext";
import toast from "react-hot-toast";

/**
 * FallbackConnectButton component that provides a fallback UI when ThirdwebProvider is not available
 * This is used when the SignatureWalletButton is rendered outside of a ThirdwebProvider context
 */
export default function FallbackConnectButton() {
  const { setWalletProvider } = useWalletProvider();
  const { setNetwork } = useNetwork();

  const handleClick = () => {
    // Set the wallet provider to signature and network to polygon
    setWalletProvider("signature");
    setNetwork("polygon");

    // Show a toast message to inform the user
    toast.success(
      "Switching to Polygon network for signature wallet connection...",
      {
        duration: 3000,
        style: {
          background: "#111",
          color: "#3498db",
          border: "2px solid #3498db",
        },
        iconTheme: {
          primary: "#3498db",
          secondary: "#111",
        },
      }
    );

    // The app will automatically re-render with the ThirdwebProvider
    // due to the network change to "polygon" in GameWrapper
  };

  return (
    <button
      id="fallbackConnectButton"
      className="wallet-button signature-wallet"
      onClick={handleClick}
    >
      Connect Wallet
    </button>
  );
}

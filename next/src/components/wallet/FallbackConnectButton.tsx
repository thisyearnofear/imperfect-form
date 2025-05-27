"use client";

import React from "react";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { resetAllWalletState } from "@/utils/walletReset";
import toast from "react-hot-toast";

/**
 * FallbackConnectButton component that provides a fallback UI when ThirdwebProvider is not available
 * This is used when the SignatureWalletButton is rendered outside of a ThirdwebProvider context
 */
export default function FallbackConnectButton() {
  const { setWalletProvider } = useWalletProvider();
  const { setNetwork } = useNetwork();

  // Get the current network from localStorage or default to polygon
  const getCurrentNetwork = (): "polygon" | "monad" | "celo" => {
    if (typeof window !== "undefined") {
      const savedNetwork = localStorage.getItem("selectedNetwork");
      if (savedNetwork === "monad" || savedNetwork === "celo") {
        return savedNetwork;
      }
    }
    return "polygon";
  };

  const handleClick = () => {
    // Get the current ThirdWeb network preference
    const thirdwebNetwork = getCurrentNetwork();

    // Set the wallet provider to signature and network to the current ThirdWeb network
    setWalletProvider("signature");
    setNetwork(thirdwebNetwork);

    // Get a display name for the network
    const networkDisplayName =
      thirdwebNetwork === "monad"
        ? "Monad Testnet"
        : thirdwebNetwork === "celo"
        ? "Celo Mainnet"
        : "Polygon Mainnet";

    // Show a toast message to inform the user
    toast.success(
      `Switching to ${networkDisplayName} for signature wallet connection...`,
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
    // due to the network change in GameWrapper
  };

  return (
    <div className="inline-flex space-x-1">
      <button
        id="fallbackConnectButton"
        className="wallet-button signature-wallet"
        onClick={handleClick}
      >
        Connect Wallet
      </button>

      <button
        className="text-xs bg-red-800 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
        onClick={() => {
          toast.loading("Resetting wallet state...", { id: "reset" });
          resetAllWalletState();
          setTimeout(() => {
            toast.success("Wallet state reset! Redirecting...", {
              id: "reset",
            });
            window.location.href = "/select-wallet";
          }, 500);
        }}
        title="Reset all wallet connections and start fresh"
      >
        Reset
      </button>
    </div>
  );
}

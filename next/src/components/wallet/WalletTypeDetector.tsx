"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useNetwork } from "@/contexts/NetworkContext";
import toast from "react-hot-toast";

/**
 * A utility component that detects if a Wagmi wallet is connected
 * and sets the network context to "base" accordingly.
 *
 * This helps ensure consistency between the UI and the actual connected wallet.
 */
export default function WalletTypeDetector() {
  const { address: wagmiAddress } = useAccount();
  const { network, setNetwork } = useNetwork();

  // Check URL parameter for wallet selector request
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("showSelector") === "true") {
        // If URL has the showSelector parameter, don't do any auto-detection
        console.log(
          "WalletTypeDetector: showSelector parameter found, skipping detection"
        );
        return;
      }
    }
  }, []);

  // Handle wagmi address detection, but only if network is not already set
  useEffect(() => {
    // First check if we're in a reset flow via URL parameter
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("showSelector") === "true") {
        return;
      }
    }

    if (wagmiAddress) {
      console.log("Wagmi wallet detected:", wagmiAddress);

      // Only update network if it's not set (null)
      if (network === null) {
        console.log("No network selected, setting to base-sepolia");
        setNetwork("base-sepolia");
        // Use localStorage to ensure consistency
        localStorage.setItem("selectedNetwork", "base-sepolia");
        localStorage.setItem("selectedChain", "base-sepolia");
        // Notify user
        toast.success("Connected with Coinbase wallet on Base Sepolia", {
          id: "wallet-detection",
          duration: 2000,
        });
      } else if (network !== "base-sepolia") {
        // Just log but don't override the user's selection
        console.log(
          `Wagmi wallet detected but keeping user-selected network: ${network}`
        );
      }
    }
  }, [wagmiAddress, network, setNetwork]);

  // This component doesn't render anything visible
  return null;
}

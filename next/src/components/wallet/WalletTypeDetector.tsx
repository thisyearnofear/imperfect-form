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

  // Handle wagmi address detection, but only if network is not already set
  useEffect(() => {
    if (wagmiAddress) {
      console.log("Wagmi wallet detected:", wagmiAddress);
      
      // Only update network if it's not set (null)
      if (network === null) {
        console.log("No network selected, setting to base");
        setNetwork("base");
        // Use localStorage to ensure consistency
        localStorage.setItem("selectedNetwork", "base");
        localStorage.setItem("selectedChain", "base");
        // Notify user
        toast.success("Connected with Coinbase wallet on Base", {
          id: "wallet-detection", 
          duration: 2000
        });
      } else if (network !== "base") {
        // Just log but don't override the user's selection
        console.log(`Wagmi wallet detected but keeping user-selected network: ${network}`);
      }
    }
  }, [wagmiAddress, network, setNetwork]);

  // This component doesn't render anything visible
  return null;
}
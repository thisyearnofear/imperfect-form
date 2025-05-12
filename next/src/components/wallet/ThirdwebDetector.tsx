"use client";

import { useEffect } from "react";
import { useAddress } from "@thirdweb-dev/react";
import { useNetwork } from "@/contexts/NetworkContext";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import toast from "react-hot-toast";

/**
 * A utility component that detects if a ThirdWeb wallet is connected
 * and sets the network context to "polygon" and wallet provider to "signature" accordingly.
 *
 * This component must be used within a ThirdwebProvider.
 */
export default function ThirdwebDetector() {
  const thirdwebAddress = useAddress();
  const { network, setNetwork } = useNetwork();
  const { walletProvider, setWalletProvider } = useWalletProvider();

  // Handle ThirdWeb address detection
  useEffect(() => {
    if (thirdwebAddress) {
      // Log the detection for debugging
      console.log(
        "ThirdwebDetector: ThirdWeb wallet detected with address:",
        thirdwebAddress
      );

      // Always ensure network is set to polygon when ThirdWeb is connected
      if (network !== "polygon") {
        console.log("ThirdwebDetector: Setting network to polygon");
        setNetwork("polygon");
        // Use localStorage to ensure consistency
        localStorage.setItem("selectedNetwork", "polygon");
        localStorage.setItem("selectedChain", "amoy");
      }

      // Always ensure wallet provider is set to signature when ThirdWeb is connected
      if (walletProvider !== "signature") {
        console.log("ThirdwebDetector: Setting wallet provider to signature");
        setWalletProvider("signature");
        localStorage.setItem("selectedWalletProvider", "signature");
      }

      // Notify user only on initial connection
      if (network !== "polygon" || walletProvider !== "signature") {
        toast.success("Connected with ThirdWeb wallet on Polygon", {
          id: "wallet-detection",
          duration: 2000,
        });
      }
    }
  }, [thirdwebAddress, network, setNetwork, walletProvider, setWalletProvider]);

  // This component doesn't render anything visible
  return null;
}

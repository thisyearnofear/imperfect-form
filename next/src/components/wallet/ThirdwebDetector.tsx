"use client";

import { useEffect, useRef } from "react";
import { useAddress, useChain, useChainId } from "@thirdweb-dev/react";
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
  const chainId = useChainId();
  const chain = useChain();
  const { network, setNetwork } = useNetwork();
  const { walletProvider, setWalletProvider } = useWalletProvider();

  // Create refs at the top level of the component
  const prevAddress = useRef<string | null>(null);
  const prevChainId = useRef<number | null>(null);
  const prevNetwork = useRef<string | null>(null);

  // Map chain IDs to our network names
  const chainIdToNetwork = useRef<Record<number, string>>({
    137: "polygon", // Polygon Mainnet
    10143: "monad", // Monad Testnet (correct chain ID)
    42220: "celo", // Celo Mainnet
  }).current;

  // Handle ThirdWeb address and chain detection
  useEffect(() => {
    // Use the refs defined at the top level

    // Only process if we have an address and something has changed
    if (
      thirdwebAddress &&
      (prevAddress.current !== thirdwebAddress ||
        prevChainId.current !== chainId ||
        prevNetwork.current !== network)
    ) {
      // Update refs
      prevAddress.current = thirdwebAddress;
      prevChainId.current = chainId || null;

      // Reduce logging in production
      if (process.env.NODE_ENV === "development") {
        console.log(
          "ThirdwebDetector: ThirdWeb wallet detected with address:",
          thirdwebAddress,
          "Chain ID:",
          chainId,
          "Chain:",
          chain?.name
        );
      }

      // Determine the network based on the connected chain
      let detectedNetwork = "polygon"; // Default

      // Check if we're trying to connect to Monad testnet
      const selectedNetwork = localStorage.getItem("selectedNetwork");
      const isMonadSelected = selectedNetwork === "monad";
      const isAttemptingMonadSwitch =
        localStorage.getItem("attemptingMonadSwitch") === "true";

      // Reduce logging in production
      if (process.env.NODE_ENV === "development") {
        if (isMonadSelected) {
          console.log(
            "ThirdwebDetector: Monad testnet is selected in localStorage"
          );
        }

        if (isAttemptingMonadSwitch) {
          console.log(
            "ThirdwebDetector: User is attempting to switch to Monad testnet"
          );
        }
      }

      if (chainId) {
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `ThirdwebDetector: Chain ID detected: ${chainId} (0x${chainId.toString(
              16
            )})`
          );
        }

        // Store the chain ID in localStorage only if it changed
        const lastChainId = localStorage.getItem("lastChainId");
        if (lastChainId !== chainId.toString()) {
          localStorage.setItem("lastChainId", chainId.toString());
        }

        // Special handling for Monad testnet - this takes precedence over everything else
        if (chainId === 10143 || chainId.toString(16) === "279f") {
          detectedNetwork = "monad";

          // Store chain ID in localStorage
          localStorage.setItem("lastChainId", chainId.toString());

          // Only log in development
          if (process.env.NODE_ENV === "development") {
            console.log(
              `ThirdwebDetector: Detected Monad testnet from chain ID ${chainId}`
            );
          }

          // Force network to monad immediately, but don't reload
          if (network !== "monad") {
            console.log(
              "ThirdwebDetector: Forcing network to monad based on chain ID"
            );
            setNetwork("monad");
            // Update localStorage but don't force reload
            localStorage.setItem("selectedNetwork", "monad");
            localStorage.setItem("selectedChain", "monad");
          }
        } else if (chainIdToNetwork[chainId]) {
          detectedNetwork = chainIdToNetwork[chainId];
          // Only log in development
          if (process.env.NODE_ENV === "development") {
            console.log(
              `ThirdwebDetector: Detected network from chain ID ${chainId}: ${detectedNetwork}`
            );
          }
        }
      } else if (chain?.name) {
        // Try to detect from chain name if chainId mapping fails
        const chainName = chain.name.toLowerCase();

        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.log(`ThirdwebDetector: Chain name detected: ${chain.name}`);
        }

        if (chainName.includes("celo")) {
          detectedNetwork = "celo";
        } else if (chainName.includes("monad")) {
          detectedNetwork = "monad";
        } else if (
          chainName.includes("polygon") ||
          chainName.includes("amoy")
        ) {
          detectedNetwork = "polygon";
        }

        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `ThirdwebDetector: Detected network from chain name ${chain.name}: ${detectedNetwork}`
          );
        }
      } else {
        // Fallback to localStorage if chain detection fails
        const supportedThirdwebNetworks = ["polygon", "monad", "celo"];

        if (
          selectedNetwork &&
          supportedThirdwebNetworks.includes(selectedNetwork)
        ) {
          detectedNetwork = selectedNetwork;

          // Only log in development
          if (process.env.NODE_ENV === "development") {
            console.log(
              `ThirdwebDetector: Using network from localStorage: ${detectedNetwork}`
            );
          }
        } else {
          // Only log in development
          if (process.env.NODE_ENV === "development") {
            console.log(
              `ThirdwebDetector: Using default network: ${detectedNetwork}`
            );
          }
        }
      }

      // If we're attempting to switch to Monad, always use Monad regardless of the chain
      if (isAttemptingMonadSwitch) {
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            "ThirdwebDetector: Forcing Monad testnet because user is attempting to switch"
          );
        }
        detectedNetwork = "monad";
      }
      // We'll prioritize the wallet's actual network for better compatibility
      // This ensures the app works with the actual connected wallet
      let networkToUse = detectedNetwork;

      // Special case for Monad - only if we're actively trying to switch to it
      if (isAttemptingMonadSwitch && detectedNetwork !== "monad") {
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            "ThirdwebDetector: Temporarily using Monad while switch is in progress"
          );
        }
        networkToUse = "monad";
      }

      // Update network in context and localStorage only if it's different
      if (network !== networkToUse) {
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          if (networkToUse !== detectedNetwork) {
            console.log(
              `ThirdwebDetector: Using user's preferred network ${networkToUse} instead of detected ${detectedNetwork}`
            );
          } else {
            console.log(`ThirdwebDetector: Setting network to ${networkToUse}`);
          }
        }

        // Set network in context
        setNetwork(networkToUse as "polygon" | "monad" | "celo" | "base");

        // Store in localStorage with timestamp to force UI updates
        localStorage.setItem("selectedNetwork", networkToUse);
        localStorage.setItem(
          "selectedChain",
          networkToUse === "polygon"
            ? "polygon" // Updated from "amoy" to "polygon" for mainnet
            : networkToUse === "monad"
            ? "monad"
            : networkToUse === "celo"
            ? "celo"
            : "base"
        );

        // Add a timestamp to trigger NetworkListener updates
        localStorage.setItem("lastNetworkChange", Date.now().toString());

        // Update the previous network ref to prevent unnecessary updates
        prevNetwork.current = networkToUse;

        // If the network we're using doesn't match the wallet's actual network,
        // show a warning to the user
        if (networkToUse !== detectedNetwork) {
          // Only in development for now
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `ThirdwebDetector: Warning - Using ${networkToUse} but wallet is connected to ${detectedNetwork}`
            );
          }
        }
      }

      // If we're on Monad and the chain ID matches, clear the attemptingMonadSwitch flag
      if (detectedNetwork === "monad" && chainId === 10143) {
        if (localStorage.getItem("attemptingMonadSwitch") === "true") {
          // Only log in development
          if (process.env.NODE_ENV === "development") {
            console.log(
              "ThirdwebDetector: Successfully switched to Monad, clearing switch flag"
            );
          }
          localStorage.removeItem("attemptingMonadSwitch");
        }
      }

      // Only update wallet provider if it's not already set to signature
      if (walletProvider !== "signature") {
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.log("ThirdwebDetector: Setting wallet provider to signature");
        }

        setWalletProvider("signature");
        localStorage.setItem("selectedWalletProvider", "signature");

        // Notify user only on initial connection
        const networkName =
          detectedNetwork === "polygon"
            ? "Polygon"
            : detectedNetwork === "monad"
            ? "Monad"
            : detectedNetwork === "celo"
            ? "Celo"
            : "Unknown";

        toast.success(`Connected with ThirdWeb wallet on ${networkName}`, {
          id: "wallet-detection",
          duration: 2000,
        });
      }
    }
  }, [
    thirdwebAddress,
    chainId,
    chain,
    network,
    setNetwork,
    walletProvider,
    setWalletProvider,
    chainIdToNetwork,
  ]);

  // This component doesn't render anything visible
  return null;
}

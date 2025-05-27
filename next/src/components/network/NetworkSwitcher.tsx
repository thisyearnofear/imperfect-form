"use client";

import React, { useState, useEffect } from "react";
import { useSwitchChain } from "wagmi";
import {
  POLYGON_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
} from "@/constants/contracts";
import toast from "react-hot-toast";
import { useNetwork } from "@/contexts/NetworkContext";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import {
  switchChain,
  WalletProviderType,
  getChainFromNetwork,
} from "@/utils/chainSwitching";

interface NetworkSwitcherProps {
  onNetworkChange?: (network: "polygon" | "base" | "monad" | "celo") => void;
  currentNetwork?: "polygon" | "base" | "monad" | "celo";
  keepModalOpen?: boolean; // Optional prop to prevent modal closure
}

export default function NetworkSwitcher({
  onNetworkChange,
  currentNetwork = "base",
  keepModalOpen = false,
}: NetworkSwitcherProps) {
  const [network, setNetwork] = useState<"polygon" | "base" | "monad" | "celo">(
    currentNetwork
  );
  const [isLoading, setIsLoading] = useState(false);

  // Get Wagmi chain switcher
  const { switchChainAsync } = useSwitchChain();

  // Network context
  const { setNetwork: setGlobalNetwork } = useNetwork();

  // Wallet provider context
  const { walletProvider, isConnected } = useWalletProvider();

  // Define networks
  const networks = [
    {
      id: "base",
      name: "Base Sepolia",
      color: "#0052FF",
      contractAddress: BASE_CONTRACT_ADDRESS,
    },
    {
      id: "polygon",
      name: "Polygon Mainnet",
      color: "#8247E5",
      contractAddress: POLYGON_CONTRACT_ADDRESS,
    },
    {
      id: "monad",
      name: "Monad Testnet",
      color: "#F0B90B",
      contractAddress: MONAD_CONTRACT_ADDRESS,
    },
    {
      id: "celo",
      name: "Celo Mainnet",
      color: "#35D07F",
      contractAddress: CELO_CONTRACT_ADDRESS,
    },
  ];

  // Update internal state when prop changes
  useEffect(() => {
    if (currentNetwork && currentNetwork !== network) {
      setNetwork(currentNetwork);
    }
  }, [currentNetwork, network]);

  // Switch the active network
  const switchNetworkHandler = async (
    newNetwork: "polygon" | "base" | "monad" | "celo"
  ) => {
    if (newNetwork === network) return;

    setIsLoading(true);

    try {
      // Store selection in localStorage
      localStorage.setItem("selectedNetwork", newNetwork);

      // Set the appropriate chain based on the network
      let selectedChain = "base";
      if (newNetwork === "polygon") {
        selectedChain = "amoy"; // Keep as "amoy" for backward compatibility with localStorage
      } else if (newNetwork === "monad") {
        selectedChain = "monad";
      } else if (newNetwork === "celo") {
        selectedChain = "celo";
      }
      localStorage.setItem("selectedChain", selectedChain);

      // Update UI immediately
      setNetwork(newNetwork);

      // Update global network context
      setGlobalNetwork(newNetwork);

      // Notify parent component
      if (onNetworkChange) {
        onNetworkChange(newNetwork);
      }

      // If used in a modal when a wallet is already connected,
      // just show a notification and don't try to switch chains
      if (keepModalOpen && isConnected) {
        // Get network display name
        let networkDisplayName = "Base Sepolia";
        if (newNetwork === "polygon") {
          networkDisplayName = "Polygon Mainnet";
        } else if (newNetwork === "monad") {
          networkDisplayName = "Monad Testnet";
        } else if (newNetwork === "celo") {
          networkDisplayName = "Celo Mainnet";
        }

        toast.success(`Network preference saved to ${networkDisplayName}`, {
          id: "network-switch",
          duration: 2000,
        });

        // Check if the wallet provider is compatible with the selected network
        const isThirdwebNetwork =
          newNetwork === "polygon" ||
          newNetwork === "monad" ||
          newNetwork === "celo";
        const isBaseNetwork = newNetwork === "base";

        if (
          (isThirdwebNetwork && walletProvider === "smart") ||
          (isBaseNetwork && walletProvider === "signature")
        ) {
          toast.success(
            "You'll need to reconnect after your exercise to use this network",
            {
              id: "reconnect-later",
              duration: 3000,
            }
          );
        }

        return;
      }

      // Actual chain switching if connected and not in a modal
      if (isConnected) {
        // Get the chain to switch to
        const targetChain = getChainFromNetwork(newNetwork);

        if (targetChain) {
          // Perform chain switching based on wallet provider type
          const walletProviderEnum =
            walletProvider === "signature"
              ? WalletProviderType.SIGNATURE
              : WalletProviderType.SMART;

          // Get the switchChain async function for Wagmi
          const switchChainFn = async (chainId: number) => {
            if (switchChainAsync) {
              // Cast the chainId to the specific type that switchChainAsync expects
              await switchChainAsync({ chainId: chainId as 84532 });
            } else {
              throw new Error("Chain switching not available");
            }
          };

          // Execute the switch - this won't close the modal
          await switchChain(targetChain, walletProviderEnum, switchChainFn);
        }
      } else {
        // Just notify about the network change if not connected
        // Get network display name
        let networkDisplayName = "Base Sepolia";
        if (newNetwork === "polygon") {
          networkDisplayName = "Polygon Mainnet";
        } else if (newNetwork === "monad") {
          networkDisplayName = "Monad Testnet";
        } else if (newNetwork === "celo") {
          networkDisplayName = "Celo Mainnet";
        }

        toast.success(`Switched to ${networkDisplayName}`, {
          id: "network-switch",
          duration: 2000,
        });
      }

      // Prompt reconnection only if switching between incompatible wallet types
      // This is now less likely to be needed with the new architecture
      // Check if the wallet provider is compatible with the selected network
      const isThirdwebNetwork =
        newNetwork === "polygon" ||
        newNetwork === "monad" ||
        newNetwork === "celo";
      const isBaseNetwork = newNetwork === "base";

      if (
        !keepModalOpen &&
        ((isThirdwebNetwork && walletProvider === "smart") ||
          (isBaseNetwork && walletProvider === "signature"))
      ) {
        toast.loading(
          "You may need to reconnect your wallet for the new network...",
          {
            id: "reconnect",
            duration: 3000,
          }
        );
      }
    } catch (error) {
      console.error("Failed to switch network:", error);
      toast.error("Failed to switch network. Please try again.");

      // Revert UI state on error
      setNetwork(currentNetwork);
      setGlobalNetwork(currentNetwork);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="network-switcher">
      <div className="flex items-center justify-center space-x-2">
        {networks.map((net) => (
          <button
            key={net.id}
            className={`px-2 py-1 rounded ${
              network === net.id
                ? `bg-${
                    net.id === "polygon"
                      ? "purple"
                      : net.id === "monad"
                      ? "yellow"
                      : net.id === "celo"
                      ? "green"
                      : "blue"
                  }-900/40 border border-${
                    net.id === "polygon"
                      ? "purple"
                      : net.id === "monad"
                      ? "yellow"
                      : net.id === "celo"
                      ? "green"
                      : "blue"
                  }-500`
                : "bg-gray-700 hover:bg-gray-600"
            } transition-colors text-[10px]`}
            onClick={() =>
              switchNetworkHandler(
                net.id as "polygon" | "base" | "monad" | "celo"
              )
            }
            disabled={isLoading}
          >
            {net.id === "polygon"
              ? "Polygon"
              : net.id === "monad"
              ? "Monad"
              : net.id === "celo"
              ? "Celo"
              : "Base"}
            {network === net.id && " ✓"}
            {isLoading && net.id !== network && "..."}
          </button>
        ))}
      </div>

      {/* Check if the wallet provider is compatible with the selected network */}
      {(((network === "polygon" || network === "monad" || network === "celo") &&
        walletProvider === "smart") ||
        (network === "base" && walletProvider === "signature")) && (
        <p className="text-[9px] text-center text-orange-300 mt-1">
          ⚠️ Requires wallet switch
        </p>
      )}
    </div>
  );
}

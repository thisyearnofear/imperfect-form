"use client";

import React, { useState } from "react";
import { useNetwork } from "@/contexts/NetworkContext";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import WalletDialog from "@/components/ui/WalletDialog";

// Remove local ethereum type definition - it's already defined in types/window.d.ts

interface NetworkSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * NetworkSelector component that displays a dialog for selecting a network
 * when using ThirdWeb/signature wallet
 */
export default function NetworkSelector({
  isOpen,
  onClose,
}: NetworkSelectorProps) {
  const { network } = useNetwork();
  const { walletProvider } = useWalletProvider();
  const [isSelectingNetwork, setIsSelectingNetwork] = useState(false);

  // Handle network selection
  const handleNetworkSelected = (
    selectedNetwork: "polygon" | "monad" | "celo"
  ) => {
    // Show loading state
    setIsSelectingNetwork(true);

    console.log(`Network selected: ${selectedNetwork}`);

    // We'll handle the network switching through the wallet
    // The ThirdwebDetector will detect the network change and update the context
    console.log(
      `Network selected: ${selectedNetwork} - switching wallet network`
    );

    // Close dialog
    onClose();
    console.log("Dialog closed");

    // Try to switch the network in the wallet
    try {
      // Access window.ethereum directly to switch networks
      if (window.ethereum) {
        const networkParams = {
          polygon: {
            chainId: "0x89", // 137 in hex
            chainName: "Polygon Mainnet",
            nativeCurrency: {
              name: "MATIC",
              symbol: "MATIC",
              decimals: 18,
            },
            rpcUrls: [
              "https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
            ],
            blockExplorerUrls: ["https://polygonscan.com"],
          },
          monad: {
            chainId: "0x279f", // 10143 in hex
            chainName: "Monad Testnet",
            nativeCurrency: {
              name: "MON",
              symbol: "MON",
              decimals: 18,
            },
            rpcUrls: ["https://testnet-rpc.monad.xyz/"],
            blockExplorerUrls: ["https://testnet.monadexplorer.com/"],
          },
          celo: {
            chainId: "0xa4ec", // 42220 in hex
            chainName: "Celo Mainnet",
            nativeCurrency: {
              name: "CELO",
              symbol: "CELO",
              decimals: 18,
            },
            rpcUrls: ["https://forno.celo.org"],
            blockExplorerUrls: ["https://explorer.celo.org"],
          },
        };

        const params = networkParams[selectedNetwork];

        // First try to switch to the network
        console.log(
          `Attempting to switch to network: ${selectedNetwork} with chainId: ${params.chainId}`
        );

        // Set a flag in localStorage to indicate we're trying to switch to Monad
        if (selectedNetwork === "monad") {
          localStorage.setItem("attemptingMonadSwitch", "true");
          console.log("Set flag: attemptingMonadSwitch = true");
        }

        window.ethereum
          .request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: params.chainId }],
          })
          .then(() => {
            console.log(`Successfully switched to ${selectedNetwork}`);

            // For Monad, reload immediately after successful switch
            if (selectedNetwork === "monad") {
              console.log("Reloading page after successful switch to Monad");
              window.location.reload();
            }
          })
          .catch((switchError: { code: number; message: string }) => {
            console.log(`Error switching to ${selectedNetwork}:`, switchError);
            // If the network is not available, add it
            if (switchError.code === 4902) {
              console.log(`Adding network ${selectedNetwork} to wallet`);
              if (window.ethereum) {
                window.ethereum
                  .request({
                    method: "wallet_addEthereumChain",
                    params: [params],
                  })
                  .then(() => {
                    console.log(
                      `Successfully added ${selectedNetwork} network`
                    );

                    // Force reload after successfully adding network
                    console.log(
                      `Reloading page after adding ${selectedNetwork} network`
                    );
                    window.location.reload();
                  })
                  .catch((addError: { code: number; message: string }) => {
                    console.error(
                      `Error adding ${selectedNetwork} network:`,
                      addError
                    );
                    // Clear the flag if we failed to add Monad
                    if (selectedNetwork === "monad") {
                      localStorage.removeItem("attemptingMonadSwitch");
                      console.log(
                        "Cleared flag: attemptingMonadSwitch (failed to add network)"
                      );
                    }
                  });
              } else {
                console.error("Ethereum provider not available");
              }
            } else {
              // For other errors, clear the flag if we're trying to switch to Monad
              if (selectedNetwork === "monad") {
                localStorage.removeItem("attemptingMonadSwitch");
                console.log(
                  "Cleared flag: attemptingMonadSwitch (switch error)"
                );
              }
            }
          });
      }
    } catch (error) {
      console.error("Error switching network:", error);
    }

    // Simple reload logic - give the wallet a moment to process the switch request
    // then reload the page to let ThirdwebDetector detect the new network

    // For Monad, we handle reloading in the switch/add chain callbacks
    // For other networks, set a simple timeout
    if (selectedNetwork !== "monad") {
      console.log(`Setting reload timeout for ${selectedNetwork} (1500ms)`);
      setTimeout(() => {
        console.log(`Reloading page for ${selectedNetwork}`);
        window.location.reload();
      }, 1500);
    } else {
      console.log(
        "Skipping automatic reload for Monad - will reload after successful chain switch"
      );
    }
  };

  // Only show this selector for signature wallets
  if (walletProvider !== "signature") return null;

  return (
    <WalletDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Select Network"
      maxWidth="400px"
    >
      <div className="bg-black rounded-lg">
        <div className="space-y-2 mx-auto">
          <button
            onClick={() => handleNetworkSelected("polygon")}
            className={`w-full p-3 relative bg-purple-900/60 border border-purple-500/50 rounded-md ${
              network === "polygon" ? "ring-1 ring-purple-400" : ""
            }`}
            disabled={isSelectingNetwork}
          >
            <div className="flex items-center justify-center">
              <div className="font-bold text-white">Polygon Mainnet</div>
            </div>

            {isSelectingNetwork && network === "polygon" && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            )}
          </button>

          <button
            onClick={() => handleNetworkSelected("monad")}
            className={`w-full p-3 relative bg-yellow-900/60 border border-yellow-500/50 rounded-md ${
              network === "monad" ? "ring-1 ring-yellow-400" : ""
            }`}
            disabled={isSelectingNetwork}
          >
            <div className="flex items-center justify-center">
              <div className="font-bold text-white">Monad Testnet</div>
            </div>

            {isSelectingNetwork && network === "monad" && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            )}
          </button>

          <button
            onClick={() => handleNetworkSelected("celo")}
            className={`w-full p-3 relative bg-green-900/60 border border-green-500/50 rounded-md ${
              network === "celo" ? "ring-1 ring-green-400" : ""
            }`}
            disabled={isSelectingNetwork}
          >
            <div className="flex items-center justify-center">
              <div className="font-bold text-white">Celo Mainnet</div>
            </div>

            {isSelectingNetwork && network === "celo" && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
              </div>
            )}
          </button>
        </div>
      </div>
    </WalletDialog>
  );
}

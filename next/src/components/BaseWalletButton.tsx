"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
// We're not using coinbaseWallet directly, so we can remove this import
import { shortenAddress } from "@/utils/formatters";
import { getBestDisplayName } from "@/utils/web3bio";
import Dialog from "@/components/ui/Dialog";

/**
 * BaseWalletButton component for connecting to Base network using Smart Wallet
 */
export default function BaseWalletButton() {
  const [showModal, setShowModal] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Wagmi hooks with detailed logging
  const { address, isConnected } = useAccount();

  // Connect hook with detailed logging
  const { connect, isPending, error, connectors } = useConnect();

  // Find the Coinbase Wallet connector
  const cbWalletConnector = connectors.find(
    (c) => c.id === "coinbaseWalletSDK"
  );

  // Disconnect hook with detailed logging
  const { disconnect } = useDisconnect();

  // Log connection status on mount and updates
  useEffect(() => {
    console.log("BaseWalletButton: Connection status", {
      isConnected,
      address,
      isPending,
      error: error?.message,
    });

    // Log when connection is established or lost
    if (isConnected && address) {
      console.log(
        "BaseWalletButton: Connected to wallet with address",
        address
      );
    } else if (!isConnected) {
      console.log("BaseWalletButton: Disconnected from wallet");
    }
  }, [isConnected, address, isPending, error]);

  // Update display name when address changes
  useEffect(() => {
    if (address) {
      const updateDisplayName = async () => {
        try {
          const name = await getBestDisplayName(address);
          setDisplayName(name || shortenAddress(address));
        } catch (error) {
          console.error("Error fetching display name:", error);
          setDisplayName(shortenAddress(address));
        }
      };

      updateDisplayName();
    } else {
      setDisplayName("");
    }
  }, [address]);

  // Copy address to clipboard
  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Wallet details modal
  const WalletModal = () => (
    <Dialog
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      title="Wallet Details"
      description="Your wallet information and social identities"
    >
      <div
        className="olympic-rings mb-4 justify-center"
        aria-label="Olympic Rings"
      >
        <div className="ring blue" />
        <div className="ring black" />
        <div className="ring red" />
        <div className="ring yellow" />
        <div className="ring green" />
      </div>

      <div className="flex flex-col items-center space-y-4 p-4">
        <div className="text-center">
          <h3 className="text-lg font-bold">{displayName}</h3>
          <div className="flex items-center justify-center mt-1">
            <code className="bg-gray-800 px-2 py-1 rounded text-sm">
              {shortenAddress(address || "")}
            </code>
            <button
              onClick={copyToClipboard}
              className="ml-2 text-blue-400 hover:text-blue-300"
              aria-label="Copy address to clipboard"
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-blue-400 mb-2">
          Connected with Smart Wallet (Base Sepolia)
        </div>

        <div className="flex flex-col items-center space-y-4">
          {/* Sub-account functionality is now handled in SummaryModal via SetupSpendLimits */}
          <div className="text-center text-sm text-gray-400 mb-2">
            Sub-account and spend limit settings are available when submitting
            scores.
          </div>

          <button
            onClick={() => {
              disconnect();
              setShowModal(false);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors w-full"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </Dialog>
  );

  // If connected, show the wallet button with address
  if (isConnected && address) {
    return (
      <>
        <button
          id="connectWalletButton"
          className="wallet-button base-wallet"
          onClick={() => setShowModal(true)}
          title={address}
        >
          {displayName || shortenAddress(address)}
        </button>
        <WalletModal />
      </>
    );
  }

  // If not connected, show the connect button with status
  return (
    <>
      <button
        id="connectWalletButton"
        className="wallet-button base-wallet"
        onClick={() => {
          console.log("BaseWalletButton: Connect button clicked");
          if (cbWalletConnector) {
            connect({ connector: cbWalletConnector });
          } else {
            console.error(
              "BaseWalletButton: Coinbase Wallet connector not found"
            );
          }
        }}
        disabled={isPending}
      >
        {isPending ? "Connecting..." : "Connect Smart Wallet"}
      </button>

      {/* Show error if any */}
      {error && (
        <div className="text-red-500 text-xs mt-2 max-w-xs mx-auto">
          Error: {error.message}
        </div>
      )}

      {/* Debug button - only visible in development */}
      {process.env.NODE_ENV === "development" && (
        <button
          className="text-xs mt-2 bg-gray-800 text-white p-1 rounded"
          onClick={() => {
            console.log("Debug: Available connectors", connectors);
            console.log("Debug: Coinbase Wallet connector", cbWalletConnector);
            console.log("Debug: Current chain", window.ethereum?.chainId);

            // Try connecting with a timeout
            setTimeout(() => {
              console.log("Debug: Attempting connection after timeout");
              if (cbWalletConnector) {
                connect({ connector: cbWalletConnector });
              } else {
                console.error("Debug: Coinbase Wallet connector not found");
              }
            }, 500);
          }}
        >
          Debug Connection
        </button>
      )}
    </>
  );
}

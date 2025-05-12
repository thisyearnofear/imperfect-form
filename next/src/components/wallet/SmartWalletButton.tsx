"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortenAddress } from "@/utils/formatters";
import { getBestDisplayName } from "@/utils/web3bio";
import { Dialog } from "@/components/ui";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { NetworkSwitcher } from "@/components/network";

/**
 * SmartWalletButton component for connecting to Smart Wallets with no-signature
 */
export default function SmartWalletButton() {
  const [showModal, setShowModal] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Prevent disconnection cycles
  const connectionAttemptRef = useRef(false);
  const wasConnectedRef = useRef(false);

  // Wagmi hooks with detailed logging
  const { address, isConnected } = useAccount();

  // Connect hook with detailed logging
  const {
    connect,
    isPending,
    error,
    connectors,
    reset: resetConnect,
  } = useConnect();

  // Find the Coinbase Wallet connector
  const cbWalletConnector = connectors.find(
    (c) => c.id === "coinbaseWalletSDK"
  );

  // Disconnect hook with detailed logging
  const { disconnect } = useDisconnect();

  // Contexts for wallet and network management
  const { walletProvider, setWalletProvider, setUserAddress, setIsConnected } =
    useWalletProvider();
  const { network, setNetwork } = useNetwork();

  // Function to handle connection with retry
  const handleConnect = useCallback(() => {
    if (typeof window !== "undefined") {
      console.log("SmartWalletButton: Starting connect sequence");
    }

    // Reset any previous connection attempts
    resetConnect();

    // Set connection attempt flag to prevent flickering
    connectionAttemptRef.current = true;

    // Only set these if they're not already set correctly
    if (walletProvider !== "smart") {
      setWalletProvider("smart");
    }
    if (network !== "base") {
      setNetwork("base");
    }

    // Short delay to ensure contexts are updated
    setTimeout(() => {
      if (cbWalletConnector) {
        if (typeof window !== "undefined") {
          console.log(
            "SmartWalletButton: Connecting with Coinbase Wallet connector"
          );
        }

        try {
          // Connect without relying on onSuccess (which isn't supported in wagmi v2)
          connect({
            connector: cbWalletConnector,
            chainId: 84532, // Base Sepolia chain ID
          });
        } catch (err) {
          console.error("Connection error:", err);
          connectionAttemptRef.current = false;
        }
      } else {
        if (typeof window !== "undefined") {
          console.error(
            "SmartWalletButton: Coinbase Wallet connector not found"
          );
        }
        connectionAttemptRef.current = false;
      }
    }, 200);
  }, [
    cbWalletConnector,
    connect,
    network,
    resetConnect,
    setNetwork,
    setWalletProvider,
    walletProvider,
  ]);

  // Log connection status on mount and updates (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Avoid excessive logging - only log significant changes
    if (isPending || error || isConnected !== wasConnectedRef.current) {
      console.log("SmartWalletButton: Connection status", {
        isConnected,
        address: address
          ? `${address.slice(0, 6)}...${address.slice(-4)}`
          : undefined,
        isPending,
        error: error?.message,
      });

      // Log when connection is established or lost
      if (isConnected && address && !wasConnectedRef.current) {
        console.log(
          "SmartWalletButton: Connected to wallet with address",
          `${address.slice(0, 6)}...${address.slice(-4)}`
        );
        wasConnectedRef.current = true;
      } else if (!isConnected && wasConnectedRef.current) {
        console.log("SmartWalletButton: Disconnected from wallet");
        wasConnectedRef.current = false;
      }
    }
  }, [isConnected, address, isPending, error]);

  // Handle specific state updates separately to avoid circular dependencies
  const handleAddressFound = useCallback(
    (addr: string) => {
      // Only update if the provider/network don't match the expected values
      if (walletProvider !== "smart") {
        setWalletProvider("smart");
      }
      if (network !== "base") {
        setNetwork("base");
      }
      // Always update these values
      setUserAddress(addr);
      setIsConnected(true);
      wasConnectedRef.current = true;
    },
    [
      network,
      setIsConnected,
      setNetwork,
      setUserAddress,
      setWalletProvider,
      walletProvider,
    ]
  );

  // Separate function for clearing state to avoid infinite loops
  const handleAddressCleared = useCallback(() => {
    setUserAddress(undefined);
    setIsConnected(false);
    setDisplayName("");
  }, [setIsConnected, setUserAddress]);

  // Update display name and context when address changes
  useEffect(() => {
    // Client-side only and reduce logging
    if (typeof window === "undefined") return;

    // Only log if useful info present
    if (process.env.NODE_ENV === "development") {
      console.log("SmartWalletButton: Address effect triggered", {
        address: address
          ? `${address.slice(0, 6)}...${address.slice(-4)}`
          : undefined,
        walletProvider,
        network,
        connectionAttempt: connectionAttemptRef.current,
      });
    }

    // If connection is in progress, don't process address changes
    if (connectionAttemptRef.current && !address) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "SmartWalletButton: Ignoring address change during connection attempt"
        );
      }
      return;
    }

    if (address) {
      // Reset connection attempt flag once we get an address
      connectionAttemptRef.current = false;

      // Update context values only if they don't match expected values
      if (walletProvider !== "smart") {
        console.log("SmartWalletButton: Syncing wallet provider to 'smart'");
        setWalletProvider("smart");
      }

      if (network !== "base") {
        console.log("SmartWalletButton: Syncing network to 'base'");
        setNetwork("base");
      }

      // Always update these values
      handleAddressFound(address);

      // Update display name
      const updateDisplayName = async () => {
        try {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "SmartWalletButton: Fetching display name for",
              `${address.slice(0, 6)}...${address.slice(-4)}`
            );
          }
          const name = await getBestDisplayName(address);
          setDisplayName(name || shortenAddress(address));
        } catch (error) {
          console.error("Error fetching display name:", error);
          setDisplayName(shortenAddress(address));
        }
      };

      updateDisplayName();
    } else if (!connectionAttemptRef.current && wasConnectedRef.current) {
      // Only clear if not in a connection attempt and was previously connected
      if (process.env.NODE_ENV === "development") {
        console.log("SmartWalletButton: No address, clearing user data");
      }
      handleAddressCleared();

      // Don't reset wallet provider/network here to maintain wallet type
    }
  }, [
    address,
    handleAddressFound,
    handleAddressCleared,
    network,
    walletProvider,
    setNetwork,
    setWalletProvider,
  ]);

  // Copy address to clipboard
  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    disconnect();
    setUserAddress(undefined);
    setIsConnected(false);
    setShowModal(false);

    // Keep wallet provider and network selection intact
    // This ensures the user stays with the same wallet type
    // and only needs to reconnect, not reselect
    console.log("SmartWalletButton: Disconnected but maintained wallet type");
  };

  // Change wallet type
  const handleChangeWalletType = () => {
    disconnect();
    setUserAddress(undefined);
    setIsConnected(false);
    setWalletProvider(null);
    setNetwork(null);
    localStorage.removeItem("selectedWalletProvider");
    localStorage.removeItem("selectedNetwork");
    localStorage.removeItem("selectedChain");
    setShowModal(false);

    // Log completion but don't force reload
    console.log(
      "SmartWalletButton: Reset complete, ready for new wallet selection"
    );

    // Optional: Redirects or other actions can be done here without forcing reload
    // This allows the app's natural flow to handle wallet selection
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
          <div className="wallet-address-container">
            <p className="wallet-address">{shortenAddress(address || "")}</p>
            <button
              onClick={copyToClipboard}
              className="copy-button bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
              aria-label="Copy address to clipboard"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-blue-400 mb-2">
          Connected with Smart Wallet (No-Signature)
        </div>

        <div className="border-t border-b border-gray-700 py-4 my-4 w-full">
          <h3 className="text-center text-sm font-bold mb-3 text-yellow-400">
            NETWORK SELECTION
          </h3>
          <NetworkSwitcher
            currentNetwork={network || "base"}
            keepModalOpen={true}
          />
          <div className="text-center text-xs text-gray-400 mt-2">
            Network selection will affect where your scores are submitted
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4 w-full">
          {/* Sub-account functionality is now handled in SummaryModal via SetupSpendLimits */}
          <div className="text-center text-sm text-gray-400 mb-2">
            Sub-account and spend limit settings are available when submitting
            scores.
          </div>

          <button
            onClick={handleDisconnect}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors w-full"
          >
            Disconnect Wallet
          </button>

          <button
            onClick={handleChangeWalletType}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors w-full"
          >
            Change Wallet Type
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
          className="wallet-button smart-wallet"
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
        className="wallet-button smart-wallet"
        onClick={handleConnect}
        disabled={isPending || connectionAttemptRef.current}
      >
        {isPending || connectionAttemptRef.current
          ? "Connecting..."
          : "Connect Smart Wallet"}
      </button>

      {/* Show error if any */}
      {error && (
        <div className="text-red-500 text-xs mt-2 max-w-xs mx-auto">
          Error: {error.message}
          <button
            className="ml-2 underline text-blue-400"
            onClick={() => {
              resetConnect();
              connectionAttemptRef.current = false;
            }}
          >
            Reset
          </button>
        </div>
      )}

      {/* Debug button - only visible in development */}
      {process.env.NODE_ENV === "development" && (
        <button
          className="text-xs mt-2 bg-gray-800 text-white p-1 rounded"
          onClick={() => {
            if (typeof window !== "undefined") {
              console.log("Debug: Available connectors", connectors);
              console.log(
                "Debug: Coinbase Wallet connector",
                cbWalletConnector
              );
              console.log("Debug: Current chain", window.ethereum?.chainId);
              console.log("Debug: Current walletProvider", walletProvider);
              console.log("Debug: Current network", network);
              console.log(
                "Debug: Connection attempt status",
                connectionAttemptRef.current
              );
              console.log(
                "Debug: Was connected status",
                wasConnectedRef.current
              );
            }

            // Force reset any existing connection attempts
            resetConnect();
            connectionAttemptRef.current = false;

            // Force a hard reset (stronger than just disconnect)
            disconnect();
            setIsConnected(false);
            setUserAddress(undefined);

            // Set context values first
            setWalletProvider("smart");
            setNetwork("base");

            // Mark connection attempt
            connectionAttemptRef.current = true;

            // Try connecting with a timeout
            setTimeout(() => {
              if (cbWalletConnector) {
                if (typeof window !== "undefined") {
                  console.log(
                    "Debug: Forcing new connection with CB Wallet connector",
                    cbWalletConnector.id
                  );
                }
                connect({ connector: cbWalletConnector });
              } else {
                if (typeof window !== "undefined") {
                  console.error("Debug: Coinbase Wallet connector not found");
                }
                connectionAttemptRef.current = false;
              }
            }, 500);
          }}
        >
          Force Connect
        </button>
      )}

      {/* Reset functionality - available in all environments */}
      {process.env.NODE_ENV === "development" && (
        <div className="flex space-x-2 mt-2">
          <button
            className="text-xs bg-red-800 text-white p-1 rounded"
            onClick={() => {
              // First reset all connection state
              resetConnect();
              disconnect();
              connectionAttemptRef.current = false;
              wasConnectedRef.current = false;

              // Then reset all context values
              setWalletProvider(null);
              setNetwork(null);
              setIsConnected(false);
              setUserAddress(undefined);

              // Clear all local storage
              localStorage.removeItem("selectedWalletProvider");
              localStorage.removeItem("selectedNetwork");
              localStorage.removeItem("selectedChain");
              localStorage.removeItem("connectedWallet");
              localStorage.removeItem("wagmi.wallet");
              localStorage.removeItem("wagmi.connected");
              localStorage.removeItem("wagmi.store");

              if (typeof window !== "undefined") {
                console.log("Debug: Full reset performed");

                // Log reset but don't force page reload
                // This allows smoother transitions between wallet types
                console.log(
                  "Debug: Avoiding forced reload for better user experience"
                );
              }
            }}
          >
            Reset All
          </button>

          <button
            className="text-xs bg-green-800 text-white p-1 rounded"
            onClick={() => {
              window.open("https://wallet.coinbase.com", "_blank");
            }}
          >
            Open CB Wallet
          </button>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortenAddress } from "@/utils/formatters";
import { getBestDisplayName } from "@/utils/web3bio";
import Dialog from "@/components/ui/Dialog";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useNetwork } from "@/contexts/NetworkContext";


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
            <p className="wallet-address">
              {shortenAddress(address || "")}
            </p>
            <button
              onClick={copyToClipboard}
              className="copy-button bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
              aria-label="Copy address to clipboard"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="wallet-type-badge flex justify-center">
          <span className="bg-blue-700 text-white px-1.5 py-0.5 rounded text-[10px]">
            Smart Wallet
          </span>
        </div>

        <div className="border-t border-b border-gray-700 py-2 my-2 w-full">
          <div className="py-1 text-center">
            <span className="bg-blue-900/30 inline-block px-2 py-0.5 rounded text-[10px]">
              Base Sepolia
            </span>
          </div>
        </div>

        <div className="flex space-x-2 w-full">
          <button
            onClick={handleDisconnect}
            className="bg-red-600 hover:bg-red-700 text-white px-1.5 py-0.5 rounded transition-colors text-[10px] flex-1"
          >
            Disconnect
          </button>

          <button
            onClick={handleChangeWalletType}
            className="bg-purple-600 hover:bg-purple-700 text-white px-1.5 py-0.5 rounded transition-colors text-[10px] flex-1"
          >
            Signature Wallet
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
      <div className="inline-flex space-x-1">
        <button
          id="connectWalletButton"
          className="wallet-button smart-wallet text-sm py-1"
          onClick={handleConnect}
          disabled={isPending || connectionAttemptRef.current}
        >
          {isPending || connectionAttemptRef.current
            ? "Connecting..."
            : "Connect"}
        </button>
        
        {/* Reset button - always visible */}
        <button
          className="text-xs bg-red-800 text-white px-2 py-1 rounded"
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

            // Clear all local storage related to wallet state
            localStorage.removeItem("selectedWalletProvider");
            localStorage.removeItem("selectedNetwork");
            localStorage.removeItem("selectedChain");
            localStorage.removeItem("connectedWallet");
            localStorage.removeItem("wagmi.wallet");
            localStorage.removeItem("wagmi.connected");
            localStorage.removeItem("wagmi.store");
            localStorage.removeItem("wagmi.account");
            localStorage.removeItem("wagmi.chainId");
            localStorage.removeItem("walletconnect");
            localStorage.removeItem("WALLETCONNECT_DEEPLINK_CHOICE");
            localStorage.removeItem("userAddress");
            localStorage.removeItem("thirdweb.auth.token");
            localStorage.removeItem("thirdweb.wallets");
            
            // VERY IMPORTANT: Remove any persisted Coinbase Wallet state
            // These keys may vary based on Coinbase SDK version
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('coinbase') || 
                  key.startsWith('walletlink') || 
                  key.startsWith('wagmi') ||
                  key.startsWith('cbw_') ||
                  key.includes('wallet')) {
                localStorage.removeItem(key);
              }
            });
            
            // Navigate to dedicated wallet selection page
            window.location.href = "/select-wallet";
          }}
        >
          Reset
        </button>
      </div>

      {/* Show error if any */}
      {error && (
        <div className="text-red-500 text-xs mt-1 max-w-xs mx-auto">
          {error.message}
        </div>
      )}

      {/* Debug button - only visible in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="hidden">
          {/* Placeholder for any debug functionality */}
        </div>
      )}
      
      {/* Open Coinbase Wallet link - visible and smaller */}
      <div className="mt-1 text-center">
        <button
          className="text-blue-400 hover:text-blue-300 text-[10px] underline"
          onClick={() => {
            window.open("https://wallet.coinbase.com", "_blank");
          }}
        >
          Open Coinbase Wallet
        </button>
      </div>
    </>
  );
}

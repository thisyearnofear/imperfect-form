"use client";

import React, { useState, useEffect } from "react";
import { ConnectWallet } from "@thirdweb-dev/react";
import { shortenAddress } from "@/utils/formatters";
import { getBestDisplayName } from "@/utils/web3bio";
import Dialog from "@/components/ui/Dialog";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { resetAllWalletState } from "@/utils/walletReset";
import dynamic from "next/dynamic";
import ThirdwebQueryProvider from "./ThirdwebQueryProvider";
import toast from "react-hot-toast";

// Import the fallback button for when ThirdwebProvider is not available
const FallbackConnectButton = dynamic(() => import("./FallbackConnectButton"), {
  ssr: false,
});

/**
 * SignatureWalletButton component for connecting using ThirdWeb with EOA signatures
 * (Previously called PolygonWalletButton)
 */
export default function SignatureWalletButton() {
  const [showModal, setShowModal] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [thirdwebAddress, setThirdwebAddress] = useState<string | undefined>(
    undefined
  );

  // Safely get ThirdWeb data without hooks
  const [addressState, setAddressState] = useState<string | undefined>(
    undefined
  );
  const [disconnectFn, setDisconnectFn] = useState<() => void>(() => {});

  // Use useEffect to safely check for ThirdWeb state
  useEffect(() => {
    try {
      // Only attempt to access these if we're in a browser
      if (typeof window !== "undefined") {
        // Get the current address from the window object if ThirdWeb has set it
        const thirdwebSDK = (
          window as { thirdweb?: { auth?: { user?: { address?: string } } } }
        ).thirdweb;
        if (thirdwebSDK?.auth?.user?.address) {
          setAddressState(thirdwebSDK.auth.user.address);
        }

        // Set a disconnect function
        setDisconnectFn(() => {
          return () => {
            try {
              // Type-safe access to window properties
              const tw = (window as { thirdweb?: { logout?: () => void } })
                .thirdweb;
              if (tw?.logout) {
                tw.logout();
              }
            } catch (error) {
              console.error("Error disconnecting from ThirdWeb:", error);
            }
          };
        });
      }
    } catch (error) {
      console.error("Error accessing ThirdWeb:", error);
    }
  }, []);

  // Create local aliases for the state values
  const address = addressState;
  const disconnect = disconnectFn;

  // Contexts for wallet and network management
  const { walletProvider, setWalletProvider, setUserAddress, setIsConnected } =
    useWalletProvider();
  const { network, setNetwork } = useNetwork();

  // Update local address state when ThirdWeb address changes
  useEffect(() => {
    // Only update if there's a change and the address exists
    if (address && address !== thirdwebAddress) {
      setThirdwebAddress(address);
    }
  }, [address, thirdwebAddress]);

  // Update display name and contexts when address changes
  // Update wallet provider and network when address changes
  useEffect(() => {
    const currentAddress = thirdwebAddress;

    if (currentAddress) {
      // Update context values only if they don't match expected values
      if (walletProvider !== "signature") {
        console.log(
          "SignatureWalletButton: Syncing wallet provider to 'signature'"
        );
        setWalletProvider("signature");
      }

      // Only set default network if no network is selected
      if (
        !network ||
        (network !== "polygon" && network !== "monad" && network !== "celo")
      ) {
        console.log(
          "SignatureWalletButton: Setting default network to 'polygon'"
        );
        setNetwork("polygon");
      }

      // Always update these values
      setUserAddress(currentAddress);
      setIsConnected(true);

      const updateDisplayName = async () => {
        try {
          const name = await getBestDisplayName(currentAddress);
          setDisplayName(name || shortenAddress(currentAddress));
        } catch (error) {
          console.error("Error fetching display name:", error);
          setDisplayName(shortenAddress(currentAddress));
        }
      };

      updateDisplayName();
    } else if (!currentAddress && thirdwebAddress === undefined) {
      setUserAddress(undefined);
      setIsConnected(false);
      setDisplayName("");

      // Don't reset wallet provider/network here to maintain wallet type
    }
  }, [
    thirdwebAddress,
    setUserAddress,
    setIsConnected,
    network,
    walletProvider,
    setNetwork,
    setWalletProvider,
  ]);

  // Copy address to clipboard
  const copyToClipboard = () => {
    if (thirdwebAddress) {
      navigator.clipboard.writeText(thirdwebAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = () => {
    // Safely attempt to disconnect if the function is available
    if (disconnect && typeof disconnect === "function") {
      try {
        disconnect();
      } catch (error) {
        console.error("Error disconnecting from ThirdWeb:", error);
      }
    }

    // Always update our state regardless of whether disconnect succeeded
    setThirdwebAddress(undefined);
    setUserAddress(undefined);
    setIsConnected(false);
    setShowModal(false);

    // Keep wallet provider and network selection intact
    // This ensures the user stays with the same wallet type
    // and only needs to reconnect, not reselect
    console.log(
      "SignatureWalletButton: Disconnected but maintained wallet type"
    );
  };

  // Change wallet type (previously called network)
  const handleChangeWalletType = () => {
    disconnect();
    setUserAddress(undefined);
    setIsConnected(false);
    setWalletProvider(null);
    setShowModal(false);

    // Log the change but don't force reload
    console.log(
      "SignatureWalletButton: Reset complete, ready for new wallet selection"
    );

    // Optional: If needed, we could navigate to wallet selection programmatically
    // But we'll let the app's natural flow handle this without a forced reload
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
              {shortenAddress(thirdwebAddress || "")}
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
          <span className="bg-purple-700 text-white px-1.5 py-0.5 rounded text-[10px] flex items-center">
            Signature Wallet
          </span>
        </div>

        <div className="border-t border-b border-gray-700 py-2 my-2 w-full">
          <div className="py-1 text-center space-x-1">
            {network === "polygon" && (
              <span className="bg-purple-900/30 inline-block px-2 py-0.5 rounded text-[10px]">
                Polygon
              </span>
            )}
            {network === "monad" && (
              <span className="bg-yellow-900/30 inline-block px-2 py-0.5 rounded text-[10px]">
                Monad
              </span>
            )}
            {network === "celo" && (
              <span className="bg-green-900/30 inline-block px-2 py-0.5 rounded text-[10px]">
                Celo
              </span>
            )}
          </div>

          <div className="flex justify-center space-x-1 mt-1">
            <button
              onClick={() => setNetwork("polygon")}
              className={`${
                network === "polygon" ? "bg-purple-800" : "bg-purple-900/30"
              } text-[10px] px-1.5 py-0.5 rounded`}
            >
              Polygon
            </button>
            <button
              onClick={() => setNetwork("monad")}
              className={`${
                network === "monad" ? "bg-yellow-800" : "bg-yellow-900/30"
              } text-[10px] px-1.5 py-0.5 rounded`}
            >
              Monad
            </button>
            <button
              onClick={() => setNetwork("celo")}
              className={`${
                network === "celo" ? "bg-green-800" : "bg-green-900/30"
              } text-[10px] px-1.5 py-0.5 rounded`}
            >
              Celo
            </button>
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-1.5 py-0.5 rounded transition-colors text-[10px] flex-1"
          >
            Smart Wallet
          </button>
        </div>
      </div>
    </Dialog>
  );

  // If connected, show the wallet button with address
  if (thirdwebAddress) {
    return (
      <>
        <button
          id="connectWalletButton"
          className="wallet-button signature-wallet"
          onClick={() => setShowModal(true)}
          title={thirdwebAddress}
        >
          {displayName || shortenAddress(thirdwebAddress)}
        </button>
        <WalletModal />
      </>
    );
  }

  // Create a separate component that safely uses the ThirdWeb SDK
  const ThirdwebConnectComponent = () => {
    // This component will only be rendered if we're inside a ThirdwebProvider
    return (
      <ThirdwebQueryProvider>
        <div className="inline-flex space-x-1">
          <ConnectWallet
            theme="dark"
            modalSize="compact"
            welcomeScreen={{
              title: "Onchain Olympics",
              subtitle: "Connect to submit your score",
              img: {
                src: "/favicon.ico",
                width: 150,
                height: 150,
              },
            }}
            modalTitleIconUrl="/favicon.ico"
            detailsBtn={() => <></>}
            btnTitle="Connect"
            className="wallet-button signature-wallet text-sm py-1"
            id="thirdwebConnectButton"
            style={{
              "--tw-bg-opacity": "1 !important",
            }}
            // Use wallet connectors with proper configuration for ThirdWeb v4
            walletConnectors={[
              {
                id: "metamask",
                recommended: true,
              },
              {
                id: "walletConnect",
                recommended: false,
              },
              {
                id: "coinbase",
                recommended: false,
              },
              {
                id: "injected",
                recommended: false,
              },
            ]}
          />
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
      </ThirdwebQueryProvider>
    );
  };

  // Check if we're inside a ThirdwebProvider without using hooks directly in conditions
  let isInsideThirdwebProvider = false;
  try {
    // We'll try to access the ThirdWeb SDK from the window object
    if (typeof window !== "undefined") {
      const thirdwebSDK = (
        window as { thirdweb?: { auth?: unknown; wallet?: unknown } }
      ).thirdweb;
      isInsideThirdwebProvider = !!thirdwebSDK;
    }
  } catch (error) {
    console.error("Error checking ThirdWeb SDK:", error);
  }

  // Render based on whether we're inside a ThirdwebProvider
  if (isInsideThirdwebProvider) {
    return <ThirdwebConnectComponent />;
  } else {
    console.log(
      "SignatureWalletButton: Not inside ThirdwebProvider, using fallback button"
    );
    return <FallbackConnectButton />;
  }
}

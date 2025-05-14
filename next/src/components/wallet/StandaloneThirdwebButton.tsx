"use client";

import React, { useState, useEffect } from "react";
import {
  ThirdwebProvider,
  ConnectWallet,
  useAddress,
  useDisconnect,
} from "@thirdweb-dev/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shortenAddress } from "@/utils/formatters";
import { getBestDisplayName } from "@/utils/web3bio";
import Dialog from "@/components/ui/Dialog";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useNetwork } from "@/contexts/NetworkContext";

/**
 * StandaloneThirdwebButton component
 *
 * This is a completely standalone component that includes all necessary providers
 * for ThirdWeb components to work properly. It's designed to be used as a drop-in
 * replacement for the SignatureWalletButton component.
 */
export default function StandaloneThirdwebButton() {
  // Create a new QueryClient instance
  // Use React.useMemo to ensure the QueryClient is only created once
  const queryClient = React.useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: Infinity,
            // Disable automatic refetching
            refetchInterval: false,
            // Disable background fetching
            refetchIntervalInBackground: false,
          },
        },
      }),
    []
  );

  // Define Polygon Amoy chain config
  // Use React.useMemo to ensure the chain config is only created once
  const polygonAmoy = React.useMemo(
    () => ({
      chainId: 80002,
      rpc: [
        process.env.NEXT_PUBLIC_ALCHEMY_AMOY_URL ||
          "https://polygon-amoy.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
        "https://rpc-amoy.polygon.technology",
      ],
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
      },
      shortName: "amoy",
      slug: "amoy",
      testnet: true,
      name: "Polygon Amoy",
      network: "polygon-amoy",
      explorers: [
        {
          name: "Polygon Amoy Explorer",
          url: "https://amoy.polygonscan.com",
          standard: "EIP3091",
        },
      ],
    }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider
        clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""}
        activeChain={polygonAmoy}
        dAppMeta={{
          name: "Imperfect Form",
          description: "Onchain olympians",
          logoUrl: "/favicon.ico",
          url: "https://imperfectform.fun",
          isDarkMode: true,
        }}
        theme="dark"
        modalSize="compact"
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
      >
        <ThirdwebButtonContent />
      </ThirdwebProvider>
    </QueryClientProvider>
  );
}

/**
 * ThirdwebButtonContent component
 *
 * This component contains the actual button content and is wrapped by the necessary providers.
 * We use React.memo to prevent unnecessary re-renders.
 */
const ThirdwebButtonContent = React.memo(function ThirdwebButtonContent() {
  const [showModal, setShowModal] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Access network and wallet provider contexts
  const { setNetwork } = useNetwork();
  const { setWalletProvider, setIsConnected, setUserAddress } =
    useWalletProvider();

  // Use ThirdWeb hooks directly - this is safe because we're inside ThirdwebProvider
  const address = useAddress();
  const disconnect = useDisconnect();

  // When address changes, update the wallet provider context
  useEffect(() => {
    if (address) {
      console.log(
        "StandaloneThirdwebButton: ThirdWeb wallet connected with address:",
        address
      );

      // Set network to polygon
      setNetwork("polygon");
      localStorage.setItem("selectedNetwork", "polygon");
      localStorage.setItem("selectedChain", "amoy");

      // Set wallet provider to signature
      setWalletProvider("signature");
      localStorage.setItem("selectedWalletProvider", "signature");

      // Set connected status
      setIsConnected(true);

      // Set user address
      setUserAddress(address);

      // Store the address in localStorage for persistence
      localStorage.setItem("userAddress", address);
    } else {
      // When disconnected, update connected status
      setIsConnected(false);
      setUserAddress(undefined);
    }
  }, [address, setNetwork, setWalletProvider, setIsConnected, setUserAddress]);

  // Resolve the address to a social identity when it changes
  useEffect(() => {
    if (address) {
      // Initially show shortened address while resolving
      setDisplayName(shortenAddress(address));

      // Try to resolve to a social identity
      getBestDisplayName(address)
        .then((name) => {
          setDisplayName(name);
        })
        .catch((error) => {
          console.error("Error resolving address to social identity:", error);
          // Fallback to shortened address on error
          setDisplayName(shortenAddress(address));
        });
    }
  }, [address]);

  // If connected, show the address and disconnect button
  if (address) {
    return (
      <>
        <button
          id="thirdwebConnectedButton"
          className="wallet-button signature-wallet"
          onClick={() => {
            console.log(
              "StandaloneThirdwebButton: Opening modal for address:",
              address
            );
            setShowModal(true);
          }}
          title={address}
        >
          {displayName}
        </button>
        <Dialog
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Wallet Options"
          description="Your wallet information and controls"
        >
          <div className="wallet-modal-content">
            <div className="wallet-address-container">
              <p className="wallet-address">{shortenAddress(address)}</p>
              <button
                className="copy-button bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600"
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="flex flex-col space-y-2 w-full">
              <button
                className="disconnect-button"
                onClick={() => {
                  // Disconnect ThirdWeb wallet
                  disconnect();

                  // Update wallet provider context
                  setIsConnected(false);
                  setUserAddress(undefined);

                  // Close modal
                  setShowModal(false);

                  console.log(
                    "StandaloneThirdwebButton: Disconnected ThirdWeb wallet"
                  );

                  // Clear the address from localStorage
                  localStorage.removeItem("userAddress");
                }}
              >
                Disconnect Wallet
              </button>
              
              <button
                className="text-xs bg-red-800 text-white px-2 py-1 rounded"
                onClick={() => {
                  // Navigate to dedicated wallet selection page
                  window.location.href = "/select-wallet";
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </Dialog>
      </>
    );
  }

  // If not connected, show the connect button
  return (
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
      btnTitle="Connect Wallet"
      className="wallet-button signature-wallet"
      id="thirdwebConnectButton"
      style={{
        "--tw-bg-opacity": "1 !important",
      }}
    />
  );
});

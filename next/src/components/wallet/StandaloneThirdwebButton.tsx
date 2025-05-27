"use client";

import React, { useState, useEffect } from "react";
import {
  ThirdwebProvider,
  ConnectWallet,
  useAddress,
  useDisconnect,
  useChainId,
  useChain,
} from "@thirdweb-dev/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shortenAddress } from "@/utils/formatters";
import { getBestDisplayName } from "@/utils/web3bio";
import Dialog from "@/components/ui/Dialog";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { resetAllWalletState } from "@/utils/walletReset";
import useDeviceDetect from "@/hooks/useDeviceDetect";
import toast from "react-hot-toast";

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

  // Define chain configs for all supported networks
  // Use React.useMemo to ensure the chain configs are only created once
  const chainConfigs = React.useMemo(
    () => ({
      polygon: {
        chainId: 137,
        rpc: [
          "https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
          "https://polygon-rpc.com",
          "https://rpc-mainnet.matic.network",
        ],
        nativeCurrency: {
          name: "MATIC",
          symbol: "MATIC",
          decimals: 18,
        },
        shortName: "polygon",
        slug: "polygon",
        testnet: false,
        name: "Polygon Mainnet",
        network: "polygon",
        explorers: [
          {
            name: "Polygon Explorer",
            url: "https://polygonscan.com",
            standard: "EIP3091",
          },
        ],
      },
      monad: {
        chainId: 10143,
        rpc: ["https://testnet-rpc.monad.xyz"],
        nativeCurrency: {
          name: "MON",
          symbol: "MON",
          decimals: 18,
        },
        shortName: "monad-testnet",
        slug: "monad-testnet",
        testnet: true,
        name: "Monad Testnet",
        network: "monad-testnet",
        explorers: [
          {
            name: "Monad Testnet Explorer",
            url: "https://testnet.monadexplorer.com",
            standard: "EIP3091",
          },
        ],
      },
      celo: {
        chainId: 42220,
        rpc: ["https://forno.celo.org", "https://rpc.ankr.com/celo"],
        nativeCurrency: {
          name: "CELO",
          symbol: "CELO",
          decimals: 18,
        },
        shortName: "celo",
        slug: "celo",
        testnet: false,
        name: "Celo Mainnet",
        network: "celo",
        explorers: [
          {
            name: "Celo Explorer",
            url: "https://explorer.celo.org",
            standard: "EIP3091",
          },
        ],
      },
    }),
    []
  );

  // Get the selected network from localStorage or default to polygon
  const selectedNetwork = React.useMemo(() => {
    if (typeof window !== "undefined") {
      const storedNetwork = localStorage.getItem("selectedNetwork");
      if (storedNetwork === "monad" || storedNetwork === "celo") {
        return storedNetwork;
      }
    }
    return "polygon";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider
        clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""}
        activeChain={chainConfigs[selectedNetwork as keyof typeof chainConfigs]}
        dAppMeta={{
          name: "Imperfect Form",
          description: "Onchain olympians",
          logoUrl: "/favicon.ico",
          url: "https://imperfectform.fun",
          isDarkMode: true,
        }}
        theme="dark"
        modalSize="wide"
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
        <ThirdwebButtonContent selectedNetwork={selectedNetwork} />
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
interface ThirdwebButtonContentProps {
  selectedNetwork: string;
}

const ThirdwebButtonContent = React.memo(function ThirdwebButtonContent({
  selectedNetwork,
}: ThirdwebButtonContentProps) {
  const [showModal, setShowModal] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Access device detection for responsive modal sizing
  const { isMobile } = useDeviceDetect();

  // Access network and wallet provider contexts
  const { network, setNetwork } = useNetwork();
  const { setWalletProvider, setIsConnected, setUserAddress } =
    useWalletProvider();

  // Use ThirdWeb hooks directly - this is safe because we're inside ThirdwebProvider
  const address = useAddress();
  const disconnect = useDisconnect();
  const chainId = useChainId();
  const chain = useChain();

  // Create refs at the top level of the component
  const lastDetectedChainId = React.useRef<number | null>(null);
  const lastAddress = React.useRef<string | null>(null);
  const lastNetwork = React.useRef<string | null>(null);

  // Map chain IDs to our network names
  const chainIdToNetwork = React.useMemo(
    () => ({
      137: "polygon", // Polygon Mainnet
      10143: "monad", // Monad Testnet
      42220: "celo", // Celo Mainnet
      84532: "base", // Base Sepolia
    }),
    []
  );

  // When address changes, update the wallet provider context
  useEffect(() => {
    if (address) {
      // Determine the network based on the connected chain
      let detectedNetwork = selectedNetwork; // Start with the prop value

      if (
        chainId &&
        typeof chainId === "number" &&
        Object.prototype.hasOwnProperty.call(chainIdToNetwork, chainId) &&
        lastDetectedChainId.current !== chainId
      ) {
        detectedNetwork =
          chainIdToNetwork[chainId as keyof typeof chainIdToNetwork];
        lastDetectedChainId.current = chainId;

        // Reduce logging frequency
        if (process.env.NODE_ENV === "development") {
          console.log(
            `StandaloneThirdwebButton: Detected network from chain ID ${chainId}: ${detectedNetwork}`
          );
        }
      } else if (
        chain?.name &&
        !chainId &&
        lastDetectedChainId.current === null
      ) {
        // Try to detect from chain name if chainId mapping fails - only do this once
        const chainName = chain.name.toLowerCase();
        if (chainName.includes("celo")) {
          detectedNetwork = "celo";
        } else if (chainName.includes("monad")) {
          detectedNetwork = "monad";
        } else if (chainName.includes("polygon")) {
          detectedNetwork = "polygon";
        } else if (
          chainName.includes("base") ||
          chainName.includes("sepolia")
        ) {
          detectedNetwork = "base";
        }

        // Reduce logging frequency
        if (process.env.NODE_ENV === "development") {
          console.log(
            `StandaloneThirdwebButton: Detected network from chain name ${chain.name}: ${detectedNetwork}`
          );
        }
      }

      // Special handling for Monad testnet - this takes precedence over everything else
      if (chainId === 10143) {
        detectedNetwork = "monad";
        lastDetectedChainId.current = chainId;

        // Store chain ID in localStorage
        localStorage.setItem("lastChainId", chainId.toString());

        // Reduce logging frequency
        if (process.env.NODE_ENV === "development") {
          console.log(
            `StandaloneThirdwebButton: Detected Monad testnet from chain ID ${chainId}`
          );
        }

        // Set network to monad if needed, but don't force updates
        if (network !== "monad") {
          setNetwork("monad");
        }
      }

      // Only log connection details when they change
      if (
        lastAddress.current !== address ||
        lastNetwork.current !== detectedNetwork
      ) {
        lastAddress.current = address;
        lastNetwork.current = detectedNetwork;

        // Reduce logging frequency
        if (process.env.NODE_ENV === "development") {
          console.log(
            `StandaloneThirdwebButton: ThirdWeb wallet connected with address: ${address} on network: ${detectedNetwork} (Chain ID: ${chainId}, Chain: ${chain?.name})`
          );
        }
      }

      // Only update network context if it changed
      const currentNetwork = localStorage.getItem("selectedNetwork");
      if (currentNetwork !== detectedNetwork) {
        setNetwork(detectedNetwork as "polygon" | "monad" | "celo" | "base");
        localStorage.setItem("selectedNetwork", detectedNetwork);
      }

      // Only update localStorage if needed
      const currentChain = localStorage.getItem("selectedChain");
      let newChain = "";

      if (detectedNetwork === "polygon") {
        newChain = "polygon";
      } else if (detectedNetwork === "monad") {
        newChain = "monad";
      } else if (detectedNetwork === "celo") {
        newChain = "celo";
      } else if (detectedNetwork === "base") {
        newChain = "base";
      }

      if (currentChain !== newChain) {
        localStorage.setItem("selectedChain", newChain);
      }

      // Only set wallet provider if it's not already set
      const currentWalletProvider = localStorage.getItem(
        "selectedWalletProvider"
      );
      if (currentWalletProvider !== "signature") {
        setWalletProvider("signature");
        localStorage.setItem("selectedWalletProvider", "signature");
      }

      // Set connected status
      setIsConnected(true);

      // Set user address
      setUserAddress(address);

      // Store the address in localStorage for persistence
      const storedAddress = localStorage.getItem("userAddress");
      if (storedAddress !== address) {
        localStorage.setItem("userAddress", address);
      }
    } else {
      // When disconnected, update connected status
      setIsConnected(false);
      setUserAddress(undefined);
    }
  }, [
    address,
    chainId,
    chain,
    network,
    setNetwork,
    setWalletProvider,
    setIsConnected,
    setUserAddress,
    selectedNetwork,
    chainIdToNetwork,
  ]);

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
          </div>
        </Dialog>
      </>
    );
  }

  // If not connected, show the connect button with reset option
  return (
    <div className="inline-flex space-x-1">
      <ConnectWallet
        theme="dark"
        modalSize={isMobile ? "compact" : "wide"}
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
  );
});

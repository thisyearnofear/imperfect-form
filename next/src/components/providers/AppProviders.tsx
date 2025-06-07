"use client";

import React, {
  ReactNode,
  useEffect,
  useState,
  createContext,
  useContext,
} from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { baseSepolia, polygon, celo, type Chain } from "wagmi/chains";
import {
  useConnect,
  useDisconnect,
  useAccount,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { useFarcasterContext } from "@/hooks/useFarcasterContext";
import { switchFarcasterChain } from "@/utils/farcasterMiniApp";

// Define Monad Testnet
const monadTestnet: Chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MON",
    symbol: "MON",
  },
  rpcUrls: {
    public: { http: ["https://testnet-rpc.monad.xyz/"] },
    default: { http: ["https://testnet-rpc.monad.xyz/"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
  testnet: true,
};

// All supported chains
const supportedChains = [baseSepolia, polygon, celo, monadTestnet];

// Universal Wagmi config - ONE CONFIG TO RULE THEM ALL - CELO first as default
const wagmiConfig = createConfig({
  chains: [celo, polygon, baseSepolia, monadTestnet],
  connectors: [
    // Primary: Coinbase Wallet (works on all chains)
    coinbaseWallet({
      appName: "Imperfect Form",
      appLogoUrl: "https://imperfectform.fun/icon-192x192.png",
      preference: "all", // Supports both EOA and Smart Wallet
      enableMobileWalletLink: true,
    }),

    // Fallback: Injected wallets
    injected({
      shimDisconnect: true,
    }),

    // Mobile: WalletConnect
    walletConnect({
      projectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
        "2b1d8e5a5c1e4c8a9b1e3d4a5b6c7d8e",
      metadata: {
        name: "Imperfect Form",
        description: "Onchain fitness challenges",
        url: "https://imperfectform.fun",
        icons: ["https://imperfectform.fun/icon-192x192.png"],
      },
      showQrModal: false, // Prevent auto-popup on page load
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [baseSepolia.id]: http(),
    [polygon.id]: http(
      "https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
    ),
    [celo.id]: http(),
    [monadTestnet.id]: http(),
  },
});

// Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Universal Wallet Context
interface UniversalWalletContextType {
  // Connection state
  isConnected: boolean;
  address: string | undefined;
  chainId: number | undefined;
  isConnecting: boolean;

  // User info
  displayName: string | undefined;
  isInFarcaster: boolean;
  farcasterUser: {
    displayName?: string;
    username?: string;
    pfpUrl?: string;
  } | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToOptimalChain: (chainId: number) => Promise<void>;

  // UI state
  isReady: boolean;
}

const UniversalWalletContext = createContext<
  UniversalWalletContextType | undefined
>(undefined);

// Farcaster detection and integration
function useFarcasterIntegration() {
  const [isInFarcaster, setIsInFarcaster] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<{
    displayName?: string;
    username?: string;
    pfpUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Detect Farcaster context
    const isFarcaster =
      /farcaster|warpcast/i.test(navigator.userAgent) ||
      window.location.search.includes("frame=") ||
      window.location.search.includes("farcaster") ||
      document.referrer.includes("warpcast.com") ||
      document.referrer.includes("farcaster.xyz");

    setIsInFarcaster(isFarcaster);

    // Try to get Farcaster user info
    if (isFarcaster) {
      try {
        // Check for Farcaster SDK
        const farcasterSDK = (
          window as {
            farcaster?: {
              user?: {
                displayName?: string;
                username?: string;
                pfpUrl?: string;
              };
            };
          }
        ).farcaster;
        if (farcasterSDK?.user) {
          setFarcasterUser(farcasterSDK.user);
        }
      } catch (error) {
        console.log("Farcaster SDK not available:", error);
      }
    }
  }, []);

  return { isInFarcaster, farcasterUser };
}

// Universal Wallet Provider Component
function UniversalWalletProvider({ children }: { children: ReactNode }) {
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { isInFarcaster, farcasterUser } = useFarcasterIntegration();

  // Integrate Farcaster wallet
  const farcasterContext = useFarcasterContext();

  const [isReady, setIsReady] = useState(false);
  const [displayName, setDisplayName] = useState<string | undefined>();

  // Unified wallet state - prioritize Farcaster wallet when in Mini App
  const isConnected = farcasterContext.isInMiniApp
    ? !!farcasterContext.walletAddress || wagmiConnected
    : wagmiConnected;

  const address =
    farcasterContext.isInMiniApp && farcasterContext.walletAddress
      ? farcasterContext.walletAddress
      : wagmiAddress;

  // Initialize
  useEffect(() => {
    setIsReady(true);
  }, []);

  // Update display name
  useEffect(() => {
    if (address) {
      if (farcasterUser?.displayName) {
        setDisplayName(farcasterUser.displayName);
      } else {
        setDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);
      }
    } else {
      setDisplayName(undefined);
    }
  }, [address, farcasterUser]);

  // Smart connection function - respects user preferences
  const handleConnect = async () => {
    try {
      // If in Farcaster Mini App, use Farcaster wallet first
      if (farcasterContext.isInMiniApp) {
        toast.loading(
          `GM ${
            farcasterContext.user?.displayName || "Anon"
          }! Connecting Farcaster wallet...`,
          { id: "connect" }
        );

        console.log("🎯 Attempting Farcaster wallet connection...");
        const farcasterAddress = await farcasterContext.connectWallet();

        if (farcasterAddress) {
          toast.success("Farcaster wallet connected!", { id: "connect" });
          console.log("🎯 Farcaster wallet connected:", farcasterAddress);
          return;
        } else {
          console.log(
            "🎯 Farcaster wallet connection failed, falling back to Wagmi..."
          );
          toast.loading("Trying alternative connection...", { id: "connect" });
        }
      }

      // Auto-select best connector based on context
      let targetConnector;

      if (isInFarcaster) {
        // In Farcaster, prefer injected if available
        targetConnector =
          connectors.find((c) => c.id === "injected") || connectors[0];
        toast.loading(
          `GM ${farcasterUser?.displayName || "Anon"}! Connecting...`,
          { id: "connect" }
        );
      } else if (
        (
          window as unknown as {
            ethereum?: { isMetaMask?: boolean; isCoinbaseWallet?: boolean };
          }
        ).ethereum?.isMetaMask ||
        (
          window as unknown as {
            ethereum?: { isMetaMask?: boolean; isCoinbaseWallet?: boolean };
          }
        ).ethereum?.isCoinbaseWallet
      ) {
        // If in wallet browser, use injected
        targetConnector =
          connectors.find((c) => c.id === "injected") || connectors[0];
        toast.loading("Opening wallet...", { id: "connect" });
      } else {
        // Desktop: prefer Coinbase Wallet
        targetConnector =
          connectors.find((c) => c.id === "coinbaseWallet") || connectors[0];
        toast.loading("Connecting wallet...", { id: "connect" });
      }

      await connect({ connector: targetConnector });
      toast.success("Wallet connected!", { id: "connect" });

      // After connection, respect user's preferred chain if they have one
      setTimeout(() => {
        const userPreferredChainId = localStorage.getItem(
          "userPreferredChainId"
        );
        if (userPreferredChainId) {
          const preferredId = parseInt(userPreferredChainId);
          console.log(
            "User preferred chain:",
            preferredId,
            "Current chain:",
            chainId
          );
          if (preferredId !== chainId) {
            console.log(`Switching to user preferred chain: ${preferredId}`);
            switchToChain(preferredId);
          }
        }
      }, 3000); // Give more time for initial connection to settle
    } catch (error) {
      console.error("Connection failed:", error);
      toast.error("Connection failed. Please try again.", { id: "connect" });
    }
  };

  // Manual chain switching - respects user choice
  const switchToChain = async (targetChainId: number) => {
    if (chainId === targetChainId) {
      console.log("Already on target chain:", targetChainId);
      return;
    }

    console.log("Attempting to switch from", chainId, "to", targetChainId);

    try {
      // If in Farcaster Mini App, try Farcaster chain switching first
      if (farcasterContext.isInMiniApp && farcasterContext.walletAddress) {
        console.log("🎯 Attempting Farcaster wallet chain switch...");
        const farcasterSuccess = await switchFarcasterChain(targetChainId);

        if (farcasterSuccess) {
          const chainName = supportedChains.find(
            (c) => c.id === targetChainId
          )?.name;
          toast.success(`Switched to ${chainName} (Farcaster wallet)`);
          localStorage.setItem(
            "userPreferredChainId",
            targetChainId.toString()
          );
          console.log("🎯 Farcaster chain switch successful:", targetChainId);
          return;
        } else {
          console.log(
            "🎯 Farcaster chain switch failed, falling back to Wagmi..."
          );
        }
      }

      // Fallback to regular Wagmi chain switching
      const result = await switchChain({ chainId: targetChainId });
      console.log("Switch chain result:", result);

      const chainName = supportedChains.find(
        (c) => c.id === targetChainId
      )?.name;
      toast.success(`Switched to ${chainName}`);

      // Store user preference
      localStorage.setItem("userPreferredChainId", targetChainId.toString());
      console.log("Stored user preference:", targetChainId);
    } catch (error: unknown) {
      console.error("Chain switch failed:", error);

      // If chain not found (error 4902), try to add it first
      if ((error as { code?: number })?.code === 4902) {
        try {
          await addChainToWallet(targetChainId);
          // Then try switching again
          await switchChain({ chainId: targetChainId });
          const chainName = supportedChains.find(
            (c) => c.id === targetChainId
          )?.name;
          toast.success(`Added and switched to ${chainName}`);
          localStorage.setItem(
            "userPreferredChainId",
            targetChainId.toString()
          );
        } catch (addError: unknown) {
          console.error("Failed to add chain:", addError);
          toast.error(
            "Failed to add network to wallet. Please add it manually."
          );
        }
      } else if ((error as { code?: number })?.code === -32002) {
        toast.error("Wallet request pending. Please check your wallet.");
      } else {
        toast.error(
          `Failed to switch network: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  };

  // Helper function to add chain to wallet
  const addChainToWallet = async (chainId: number) => {
    const chain = supportedChains.find((c) => c.id === chainId);
    if (!chain) throw new Error("Unsupported chain");

    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet provider found");
    }

    const chainParams = {
      chainId: `0x${chainId.toString(16)}`,
      chainName: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: [chain.rpcUrls.default.http[0]],
      blockExplorerUrls: chain.blockExplorers
        ? [chain.blockExplorers.default.url]
        : undefined,
    };

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [chainParams],
    });
  };

  // Store user's chain preference
  useEffect(() => {
    if (isConnected && chainId) {
      // Store the user's selected chain for future sessions
      localStorage.setItem("userPreferredChainId", chainId.toString());
    }
  }, [isConnected, chainId]);

  // Enhanced disconnect that handles both Farcaster and Wagmi
  const handleDisconnect = () => {
    // Always disconnect Wagmi
    disconnect();

    // Note: Farcaster wallet doesn't have a disconnect method in the SDK
    // The wallet connection persists in the Mini App context
    if (farcasterContext.isInMiniApp) {
      toast.success("Disconnected from wallet");
    }
  };

  const contextValue: UniversalWalletContextType = {
    isConnected,
    address,
    chainId,
    isConnecting: isConnecting || farcasterContext.isLoading,
    displayName,
    isInFarcaster: farcasterContext.isInMiniApp || isInFarcaster,
    farcasterUser: farcasterContext.user || farcasterUser,
    connect: handleConnect,
    disconnect: handleDisconnect,
    switchToOptimalChain: switchToChain,
    isReady,
  };

  return (
    <UniversalWalletContext.Provider value={contextValue}>
      {children}
    </UniversalWalletContext.Provider>
  );
}

// Hook to use the universal wallet
export function useUniversalWallet(): UniversalWalletContextType {
  const context = useContext(UniversalWalletContext);
  if (context === undefined) {
    throw new Error("useUniversalWallet must be used within AppProviders");
  }
  return context;
}

// Backward compatibility hooks (so we don't break existing components)
export function useWalletProvider() {
  const { isConnected, address } = useUniversalWallet();
  return {
    walletProvider: isConnected ? "universal" : null,
    isConnected,
    userAddress: address,
    // Legacy methods that do nothing
    setWalletProvider: () => {},
    resetAll: () => {},
    disconnect: () => {},
    setIsConnected: () => {},
    setUserAddress: () => {},
    changeWalletProvider: () => {},
    isWalletProviderSelected: isConnected,
  };
}

export function useNetwork() {
  const { chainId, isInFarcaster } = useUniversalWallet();

  // Map chain IDs to network names for backward compatibility
  const getNetworkName = (id: number | undefined) => {
    switch (id) {
      case baseSepolia.id:
        return "base";
      case polygon.id:
        return "polygon";
      case celo.id:
        return "celo";
      case monadTestnet.id:
        return "monad";
      default:
        return "celo"; // Default to CELO for all contexts
    }
  };

  return {
    network: getNetworkName(chainId),
    setNetwork: () => {}, // Legacy - auto-handled now
    isNetworkSelected: true, // Always true now
  };
}

// Main App Providers component
interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return (
    // @ts-expect-error - Wagmi type issue with multiple chains
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <UniversalWalletProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#111",
                color: "#fcb131",
                border: "2px solid #fcb131",
                fontFamily: '"Press Start 2P", cursive',
                fontSize: "12px",
                padding: "16px",
                maxWidth: "400px",
                textAlign: "center",
                boxShadow: "0 0 10px rgba(252, 177, 49, 0.5)",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              },
              success: {
                style: {
                  background: "#111",
                  color: "#00a651",
                  border: "2px solid #00a651",
                },
                iconTheme: {
                  primary: "#00a651",
                  secondary: "#111",
                },
                duration: 3000,
              },
              error: {
                style: {
                  background: "#111",
                  color: "#ff4500",
                  border: "2px solid #ff4500",
                },
                iconTheme: {
                  primary: "#ff4500",
                  secondary: "#111",
                },
                duration: 5000,
              },
              loading: {
                style: {
                  background: "#111",
                  color: "#3498db",
                  border: "2px solid #3498db",
                },
                iconTheme: {
                  primary: "#3498db",
                  secondary: "#111",
                },
              },
              duration: 3000,
            }}
          />
          {children}
        </UniversalWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

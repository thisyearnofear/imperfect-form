"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { useNetwork } from "./NetworkContext";
import { resetAllWalletState } from "@/utils/walletReset";

// Define the wallet provider types
export type WalletProviderType = "signature" | "smart" | "farcaster" | null;

// Define the context type
interface WalletProviderContextType {
  walletProvider: WalletProviderType;
  setWalletProvider: (provider: WalletProviderType) => void;
  isWalletProviderSelected: boolean;
  isConnected: boolean;
  setIsConnected: (isConnected: boolean) => void;
  disconnect: () => void;
  resetAll: (reloadPage?: boolean) => void;
  userAddress: string | undefined;
  setUserAddress: (address: string | undefined) => void;
  changeWalletProvider: (newProvider: WalletProviderType) => void;
}

// Extend the Window interface to include thirdweb
declare global {
  interface Window {
    thirdweb?: {
      auth?: {
        user?: {
          address?: string;
        };
        logout?: () => void;
      };
      logout?: () => void;
      wallet?: {
        switchChain: (chainId: number) => Promise<void>;
      };
    };
  }
}

// Create the context with default values
const WalletProviderContext = createContext<WalletProviderContextType>({
  walletProvider: null,
  setWalletProvider: () => {},
  isWalletProviderSelected: false,
  isConnected: false,
  setIsConnected: () => {},
  disconnect: () => {},
  resetAll: () => {},
  userAddress: undefined,
  setUserAddress: () => {},
  changeWalletProvider: () => {},
});

// Props for the WalletProviderProvider component
interface WalletProviderProps {
  children: ReactNode;
}

/**
 * WalletProviderProvider component that manages the selected wallet provider state
 * and persists it to localStorage
 */
export function WalletProviderProvider({ children }: WalletProviderProps) {
  // Access the network context
  const { network } = useNetwork();

  // Initialize wallet provider state from localStorage if available, default to null
  const [walletProvider, setWalletProviderState] = useState<WalletProviderType>(
    () => {
      // Only access localStorage on the client side
      if (typeof window === "undefined") return null;

      const savedWalletProvider = localStorage.getItem(
        "selectedWalletProvider"
      );
      return (savedWalletProvider as WalletProviderType) || null;
    }
  );

  // Connection status
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // User's wallet address
  const [userAddress, setUserAddress] = useState<string | undefined>(undefined);

  // Derived state to check if a wallet provider is selected
  const isWalletProviderSelected = walletProvider !== null;

  // Function to set the wallet provider and persist it to localStorage
  const setWalletProvider = (newProvider: WalletProviderType) => {
    setWalletProviderState(newProvider);

    // Persist to localStorage
    if (newProvider) {
      localStorage.setItem("selectedWalletProvider", newProvider);
    } else {
      localStorage.removeItem("selectedWalletProvider");
    }
  };

  // Function to change wallet provider with associated side effects
  const changeWalletProvider = (newProvider: WalletProviderType) => {
    // Always set the wallet provider first to ensure state is consistent
    setWalletProvider(newProvider);

    // Always update localStorage to persist the change
    if (newProvider) {
      localStorage.setItem("selectedWalletProvider", newProvider);

      // Set default network based on wallet type
      if (newProvider === "signature") {
        localStorage.setItem("selectedNetwork", "polygon");
      } else if (newProvider === "smart") {
        localStorage.setItem("selectedNetwork", "base");
      } else if (newProvider === "farcaster") {
        localStorage.setItem("selectedNetwork", "celo");
      }

      if (typeof window !== "undefined") {
        console.log(
          `WalletProviderContext: Changed wallet provider to ${newProvider}`
        );
      }
    } else {
      localStorage.removeItem("selectedWalletProvider");
      localStorage.removeItem("selectedNetwork");
    }

    // Then disconnect current wallet (after state is updated)
    disconnect();
  };

  // Function to disconnect from wallet
  const disconnect = () => {
    setIsConnected(false);
    setUserAddress(undefined);

    // We don't reset the wallet provider type as the user might want to reconnect
    // using the same provider

    // Manually clear any connection-specific localStorage items
    if (typeof window !== "undefined") {
      // Clear Wagmi connection state but preserve provider selection
      localStorage.removeItem("wagmi.connected");
      localStorage.removeItem("wagmi.store");

      // Log disconnection
      console.log("WalletProviderContext: Disconnected from wallet");
    }
  };

  // Function to perform a complete reset
  const resetAll = (reloadPage = false) => {
    // Update local state immediately
    setIsConnected(false);
    setUserAddress(undefined);

    // Clear all stored wallet data
    resetAllWalletState();

    // Set wallet provider to null after clearing local storage
    // to ensure the UI updates correctly
    setWalletProvider(null);

    // Then attempt to disconnect from any active providers
    if (typeof window !== "undefined") {
      try {
        // Attempt to disconnect from ThirdWeb
        const thirdwebObj = window.thirdweb;
        if (thirdwebObj?.auth?.logout) {
          console.log("WalletProviderContext: Disconnecting from ThirdWeb");
          thirdwebObj.auth.logout();
        } else if (thirdwebObj?.logout) {
          console.log(
            "WalletProviderContext: Disconnecting from ThirdWeb (alt method)"
          );
          thirdwebObj.logout();
        }

        // For Wagmi, we'll rely on the disconnection to happen via external means
        // as there's no easy way to access the disconnect function from here
      } catch (error) {
        console.error(
          "WalletProviderContext: Error during provider disconnect:",
          error
        );
      }

      console.log("WalletProviderContext: Full reset performed");

      // If a reload was requested, do it after a delay to let other components respond
      if (reloadPage) {
        console.log("WalletProviderContext: Page reload requested");
        window.location.reload();
      }
    }
  };

  // Effect to handle wallet provider changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "selectedWalletProvider") {
        const newProvider = event.newValue as WalletProviderType;
        // Only update if there's a change to prevent unnecessary rerenders
        if (newProvider !== walletProvider) {
          console.log(
            `WalletProviderContext: Provider changed to ${
              newProvider || "null"
            } from storage event`
          );
          setWalletProviderState(newProvider || null);
        }
      }
    };

    // Add event listener for storage changes
    window.addEventListener("storage", handleStorageChange);

    // Clean up event listener
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [walletProvider]);

  // Effect to handle connection changes
  useEffect(() => {
    // Reset connection state when wallet provider changes
    if (walletProvider === null) {
      setIsConnected(false);
      setUserAddress(undefined);

      // Additional cleanup for null wallet provider
      if (typeof window !== "undefined") {
        console.log(
          "WalletProviderContext: Wallet provider set to null, clearing connection state"
        );
      }
    } else {
      // Log the active wallet provider for debugging
      if (typeof window !== "undefined") {
        console.log(
          `WalletProviderContext: Wallet provider set to ${walletProvider}`
        );

        // Set default network based on wallet type if network isn't set
        // This ensures consistent network/wallet pairing
        const currentNetwork = localStorage.getItem("selectedNetwork");
        if (!currentNetwork) {
          if (walletProvider === "signature") {
            localStorage.setItem("selectedNetwork", "polygon");
          } else if (walletProvider === "smart") {
            localStorage.setItem("selectedNetwork", "base");
          } else if (walletProvider === "farcaster") {
            localStorage.setItem("selectedNetwork", "celo");
          }
        }
      }
    }
  }, [walletProvider]);

  // Effect to auto-set wallet provider based on network (for backward compatibility)
  useEffect(() => {
    // Check if we're in Farcaster context to avoid conflicts
    const isInFarcaster =
      typeof window !== "undefined" &&
      (/farcaster|warpcast/i.test(navigator.userAgent) ||
        window.location.search.includes("frame=") ||
        window.location.search.includes("farcaster") ||
        document.referrer.includes("warpcast.com") ||
        document.referrer.includes("farcaster.xyz"));

    // If we have a network selected but no wallet provider,
    // set the wallet provider based on the network for backward compatibility
    // BUT skip auto-detection in Farcaster context to avoid conflicts
    if (network && !walletProvider && !isInFarcaster) {
      if (network === "polygon" || network === "celo" || network === "monad") {
        setWalletProvider("signature");
      } else if (network === "base") {
        setWalletProvider("smart");
      }
    }
  }, [network, walletProvider]);

  // Provide the wallet provider context to children
  return (
    <WalletProviderContext.Provider
      value={{
        walletProvider,
        setWalletProvider,
        isWalletProviderSelected,
        isConnected,
        setIsConnected,
        disconnect,
        resetAll,
        userAddress,
        setUserAddress,
        changeWalletProvider,
      }}
    >
      {children}
    </WalletProviderContext.Provider>
  );
}

/**
 * Custom hook to use the wallet provider context
 */
export function useWalletProvider() {
  const context = useContext(WalletProviderContext);

  if (context === undefined) {
    throw new Error(
      "useWalletProvider must be used within a WalletProviderProvider"
    );
  }

  return context;
}

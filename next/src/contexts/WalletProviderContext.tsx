"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";
import { useNetwork } from "./NetworkContext";
import { WalletProviderType as WalletProviderEnum } from "@/utils/chainSwitching";
import { resetAllWalletState } from "@/utils/walletReset";

// Define the wallet provider types
export type WalletProviderType = "signature" | "smart" | null;

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
  const [walletProvider, setWalletProviderState] = useState<WalletProviderType>(() => {
    // Only access localStorage on the client side
    if (typeof window === "undefined") return null;

    const savedWalletProvider = localStorage.getItem("selectedWalletProvider");
    return (savedWalletProvider as WalletProviderType) || null;
  });

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
    // Disconnect current wallet first
    disconnect();
    
    // Set the new provider
    setWalletProvider(newProvider);
    
    // Map from old network-based to new wallet type terminology
    // This serves as a migration from the old system while we refactor
    if (newProvider === "signature" && !localStorage.getItem("selectedWalletProvider")) {
      // For users who previously used "polygon" as network
      localStorage.setItem("selectedWalletProvider", WalletProviderEnum.SIGNATURE);
    } else if (newProvider === "smart" && !localStorage.getItem("selectedWalletProvider")) {
      // For users who previously used "base" as network
      localStorage.setItem("selectedWalletProvider", WalletProviderEnum.SMART);
    }
    
    if (typeof window !== "undefined") {
      console.log(`WalletProviderContext: Changed wallet provider to ${newProvider}`);
    }
  };

  // Function to disconnect from wallet
  const disconnect = () => {
    setIsConnected(false);
    setUserAddress(undefined);
    
    // We don't reset the wallet provider type as the user might want to reconnect
    // using the same provider
    
    // Log disconnection
    if (typeof window !== "undefined") {
      console.log("WalletProviderContext: Disconnected from wallet");
    }
  };

  // Function to perform a complete reset
  const resetAll = (reloadPage = false) => {
    // Update local state
    setIsConnected(false);
    setUserAddress(undefined);
    setWalletProvider(null);
    
    // Clear all stored wallet data
    resetAllWalletState();
    
    if (typeof window !== "undefined") {
      console.log("WalletProviderContext: Full reset performed");
      
      // Only reload if explicitly requested
      if (reloadPage) {
        console.log("WalletProviderContext: Page reload requested");
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  };

  // Effect to handle wallet provider changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "selectedWalletProvider") {
        const newProvider = event.newValue as WalletProviderType;
        setWalletProviderState(newProvider || null);
      }
    };

    // Add event listener for storage changes
    window.addEventListener("storage", handleStorageChange);

    // Clean up event listener
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Effect to handle connection changes
  useEffect(() => {
    // Reset connection state when wallet provider changes
    if (walletProvider === null) {
      setIsConnected(false);
      setUserAddress(undefined);
    }
  }, [walletProvider]);

  // Effect to auto-set wallet provider based on network (for backward compatibility)
  useEffect(() => {
    // If we have a network selected but no wallet provider,
    // set the wallet provider based on the network for backward compatibility
    if (network && !walletProvider) {
      if (network === "polygon") {
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
    throw new Error("useWalletProvider must be used within a WalletProviderProvider");
  }

  return context;
}
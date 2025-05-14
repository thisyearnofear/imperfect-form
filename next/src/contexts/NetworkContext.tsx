"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
} from "react";

// Define the network types
export type Network = "polygon" | "base" | "monad" | "celo" | null;

// Define the context type
interface NetworkContextType {
  network: Network;
  setNetwork: (network: Network) => void;
  isNetworkSelected: boolean;
}

// Create the context with default values - using null as the default
const NetworkContext = createContext<NetworkContextType>({
  network: null,
  setNetwork: () => {},
  isNetworkSelected: false,
});

// Props for the NetworkProvider component
interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * NetworkProvider component that manages the selected network state
 * and persists it to localStorage
 */
export function NetworkProvider({ children }: NetworkProviderProps) {
  // Initialize network state from localStorage if available, default to null
  const [network, setNetworkState] = useState<Network>(() => {
    // Only access localStorage on the client side
    if (typeof window === "undefined") return null;

    const savedNetwork = localStorage.getItem("selectedNetwork");
    return (savedNetwork as Network) || null;
  });

  // Derived state to check if a network is selected
  const isNetworkSelected = network !== null;

  // Function to set the network and persist it to localStorage
  const setNetwork = (newNetwork: Network) => {
    setNetworkState(newNetwork);

    // Persist to localStorage
    if (newNetwork) {
      localStorage.setItem("selectedNetwork", newNetwork);

      // Set the appropriate chain based on the network
      let selectedChain = "base";
      if (newNetwork === "polygon") {
        selectedChain = "amoy"; // Keep as "amoy" for backward compatibility
      } else if (newNetwork === "monad") {
        selectedChain = "monad";
      } else if (newNetwork === "celo") {
        selectedChain = "celo";
      }
      localStorage.setItem("selectedChain", selectedChain);

      // Add timestamp to force UI updates
      localStorage.setItem("lastNetworkChange", Date.now().toString());
    } else {
      localStorage.removeItem("selectedNetwork");
      localStorage.removeItem("selectedChain");
    }
  };

  // Effect to handle network changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "selectedNetwork") {
        const newNetwork = event.newValue as Network;
        setNetworkState(newNetwork || null);
      }
    };

    // Add event listener for storage changes
    window.addEventListener("storage", handleStorageChange);

    // Clean up event listener
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Provide the network context to children
  return (
    <NetworkContext.Provider value={{ network, setNetwork, isNetworkSelected }}>
      {children}
    </NetworkContext.Provider>
  );
}

/**
 * Custom hook to use the network context
 */
export function useNetwork() {
  const context = useContext(NetworkContext);

  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }

  return context;
}

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAccount } from "wagmi";
import {
  isCoinbaseWallet,
  supportsSmartAccounts,
  getCoinbaseWalletVersion,
} from "@/utils/walletConfig";
import {
  getSmartAccount,
  getAddressBalance,
} from "@/utils/directSpendPermission";

interface ProviderDetails {
  exists: boolean;
  isCoinbaseWallet?: boolean;
  isMetaMask?: boolean;
  isCoinbaseBrowser?: boolean;
  version?: string;
  hasProviders: boolean;
  providerCount?: number;
  providerTypes?: string[];
}

interface ExtendedProvider {
  isCoinbaseWallet?: boolean;
  isMetaMask?: boolean;
  isCoinbaseBrowser?: boolean;
  version?: string;
  providers?: ExtendedProvider[];
  _subAccounts?: unknown;
  smartAccount?: unknown;
  smartWallet?: unknown;
  getSubAccounts?: () => Promise<unknown>;
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    callback: (...args: unknown[]) => void
  ) => void;
  isConnected?: () => boolean;
}

interface SmartAccountContextType {
  isSmartWallet: boolean | null;
  walletVersion: string | null;
  smartAccountAddress: `0x${string}` | null;
  smartAccountBalance: string | null;
  manualOverride: boolean;
  setManualOverride: (value: boolean) => void;
  providerDetails: ProviderDetails | null;
  refreshSmartAccountStatus: () => Promise<void>;
}

const SmartAccountContext = createContext<SmartAccountContextType>({
  isSmartWallet: null,
  walletVersion: null,
  smartAccountAddress: null,
  smartAccountBalance: null,
  manualOverride: false,
  setManualOverride: () => {},
  providerDetails: null,
  refreshSmartAccountStatus: async () => {},
});

export const useSmartAccount = () => useContext(SmartAccountContext);

export const SmartAccountProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { address, isConnected } = useAccount();
  const [isSmartWallet, setIsSmartWallet] = useState<boolean | null>(null);
  const [walletVersion, setWalletVersion] = useState<string | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<
    `0x${string}` | null
  >(null);
  const [smartAccountBalance, setSmartAccountBalance] = useState<string | null>(
    null
  );
  const [manualOverride, setManualOverride] = useState<boolean>(false);
  const [providerDetails, setProviderDetails] =
    useState<ProviderDetails | null>(null);

  // Share the manual override with the window object for debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Add a property to window for debugging purposes
      (window as Window & { forceSmartAccount?: boolean }).forceSmartAccount =
        manualOverride;
    }
  }, [manualOverride]);

  // Refresh smart account status
  const refreshSmartAccountStatus = async () => {
    if (!isConnected || !address) {
      setIsSmartWallet(null);
      setWalletVersion(null);
      setSmartAccountAddress(null);
      setSmartAccountBalance(null);
      setProviderDetails(null);
      return;
    }

    try {
      // Use type assertion to handle the provider
      const windowWithProviders = window as Window & {
        ethereum?: ExtendedProvider;
        coinbaseWalletExtension?: ExtendedProvider;
        coinbaseWallet?: ExtendedProvider;
      };

      const provider =
        windowWithProviders.ethereum ||
        windowWithProviders.coinbaseWalletExtension ||
        windowWithProviders.coinbaseWallet;

      const details: ProviderDetails = {
        exists: !!provider,
        isCoinbaseWallet: provider?.isCoinbaseWallet,
        isMetaMask: provider?.isMetaMask,
        isCoinbaseBrowser: provider?.isCoinbaseBrowser,
        version: provider?.version,
        hasProviders: !!provider?.providers,
        providerCount: provider?.providers?.length,
        providerTypes: provider?.providers?.map((p) =>
          p.isCoinbaseWallet
            ? "Coinbase"
            : p.isMetaMask
            ? "MetaMask"
            : "Unknown"
        ),
      };

      setProviderDetails(details);
      console.log("Detailed provider info:", details);

      const isCoinbase = isCoinbaseWallet();
      const version = getCoinbaseWalletVersion();
      const supportsSmartWallet = supportsSmartAccounts();

      // If manual override is set, use that instead of detection
      if (manualOverride) {
        setIsSmartWallet(true);
        console.log("Using manual override for smart wallet detection");

        // Use the parent address as the smart account address for testing
        setSmartAccountAddress(address as `0x${string}`);
        setSmartAccountBalance("0.01"); // Assume some balance
      } else {
        setIsSmartWallet(isCoinbase && supportsSmartWallet);

        // Try to get the smart account
        if (isCoinbase) {
          const smartAccount = await getSmartAccount(address as `0x${string}`);

          if (smartAccount) {
            setSmartAccountAddress(smartAccount);

            // Get the balance
            const balance = await getAddressBalance(smartAccount);
            setSmartAccountBalance(balance);
          } else {
            setSmartAccountAddress(null);
            setSmartAccountBalance(null);
          }
        }
      }

      setWalletVersion(version);
    } catch (error) {
      console.error("Error refreshing smart account status:", error);
      setIsSmartWallet(false);
      setSmartAccountAddress(null);
      setSmartAccountBalance(null);
    }
  };

  // Refresh status when connection or address changes
  useEffect(() => {
    refreshSmartAccountStatus();
    // refreshSmartAccountStatus is defined in the component and doesn't need to be a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, manualOverride]);

  return (
    <SmartAccountContext.Provider
      value={{
        isSmartWallet,
        walletVersion,
        smartAccountAddress,
        smartAccountBalance,
        manualOverride,
        setManualOverride,
        providerDetails,
        refreshSmartAccountStatus,
      }}
    >
      {children}
    </SmartAccountContext.Provider>
  );
};

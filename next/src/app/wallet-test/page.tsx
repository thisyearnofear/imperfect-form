"use client";

import React, { useState } from "react";
import { WagmiProvider, useAccount, useConnect, useDisconnect } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getWagmiConfig } from "@/utils/walletConfig";
import { Toaster, toast } from "react-hot-toast";

// Create a new QueryClient
const queryClient = new QueryClient();

// Get the Wagmi config with Coinbase Wallet connector
const wagmiConfig = getWagmiConfig();

interface ProviderInfo {
  exists: boolean;
  isCoinbaseWallet?: boolean;
  isMetaMask?: boolean;
  isCoinbaseBrowser?: boolean;
  version?: string;
  hasProviders: boolean;
  providerCount?: number;
  providerTypes?: string[];
  hasGetSubAccounts: boolean;
  hasSubAccountsProperty: boolean;
  hasSmartAccountProperty: boolean;
  hasSmartWalletProperty: boolean;
}

interface ExtendedProvider {
  isCoinbaseWallet?: boolean;
  isMetaMask?: boolean;
  isCoinbaseBrowser?: boolean;
  version?: string;
  providers?: ExtendedProvider[];
  getSubAccounts?: () => Promise<unknown>;
  _subAccounts?: unknown;
  smartAccount?: unknown;
  smartWallet?: unknown;
}

// Main content component
const WalletTest = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null);

  // Function to check provider details
  const checkProvider = () => {
    try {
      // Cast window to unknown first to avoid TypeScript errors
      const windowWithProviders = window as unknown as {
        ethereum?: ExtendedProvider;
        coinbaseWalletExtension?: ExtendedProvider;
        coinbaseWallet?: ExtendedProvider;
      };

      const provider =
        windowWithProviders.ethereum ||
        windowWithProviders.coinbaseWalletExtension ||
        windowWithProviders.coinbaseWallet;

      if (!provider) {
        toast.error("No provider found");
        return;
      }

      const info: ProviderInfo = {
        exists: !!provider,
        isCoinbaseWallet: provider?.isCoinbaseWallet,
        isMetaMask: provider?.isMetaMask,
        isCoinbaseBrowser: provider?.isCoinbaseBrowser,
        version: provider?.version,
        hasProviders: !!provider?.providers,
        providerCount: provider?.providers?.length,
        providerTypes: provider?.providers?.map((p: ExtendedProvider) =>
          p.isCoinbaseWallet
            ? "Coinbase"
            : p.isMetaMask
            ? "MetaMask"
            : "Unknown"
        ),
        // Check for smart account capabilities
        hasGetSubAccounts: typeof provider.getSubAccounts === "function",
        hasSubAccountsProperty: typeof provider._subAccounts !== "undefined",
        hasSmartAccountProperty: typeof provider.smartAccount !== "undefined",
        hasSmartWalletProperty: typeof provider.smartWallet !== "undefined",
      };

      setProviderInfo(info);
      console.log("Provider info:", info);
    } catch (error) {
      console.error("Error checking provider:", error);
      toast.error("Error checking provider");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Wallet Connection Test</h1>

      <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        {isConnected ? (
          <div>
            <p className="text-green-600 font-medium">Connected ✅</p>
            <p className="text-sm font-mono mt-1">{address}</p>
            <button
              onClick={() => disconnect()}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div>
            <p className="text-red-600 font-medium">Not connected ❌</p>
            <div className="mt-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  disabled={isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mr-2 mb-2"
                >
                  {connector.name}
                  {isPending &&
                    connector.uid === connectors[0]?.uid &&
                    " (connecting...)"}
                </button>
              ))}
            </div>
            {error && (
              <div className="mt-2 p-2 bg-red-100 rounded-md text-red-700 text-sm">
                {error.message}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={checkProvider}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Check Provider Details
        </button>

        {providerInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto">
            <h3 className="font-medium mb-2">Provider Details:</h3>
            <pre className="text-xs">
              {JSON.stringify(providerInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
        <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
        <ul className="list-disc ml-5 space-y-2 text-gray-700">
          <li>
            <strong>Wallet Detection:</strong> Make sure you&apos;re using
            Coinbase Wallet, not MetaMask or another wallet.
          </li>
          <li>
            <strong>Smart Account Support:</strong> Ensure your Coinbase Wallet
            version is 3.0.0 or higher.
          </li>
          <li>
            <strong>Network:</strong> Verify you&apos;re connected to Base
            Sepolia testnet (Chain ID: 84532).
          </li>
          <li>
            <strong>Browser Extensions:</strong> If you&apos;re having issues,
            try disabling other wallet extensions temporarily.
          </li>
          <li>
            <strong>Wallet SDK:</strong> This app uses the &quot;canary&quot;
            version of the Coinbase Wallet SDK.
          </li>
        </ul>
      </div>
    </div>
  );
};

// Page component with providers
export default function WalletTestPage() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Toaster position="top-right" />
        <WalletTest />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

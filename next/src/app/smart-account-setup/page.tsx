"use client";

import React from "react";
import { WagmiProvider, useAccount } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getWagmiConfig } from "@/utils/walletConfig";
import { SmartAccountProvider } from "@/contexts/SmartAccountContext";
import SmartAccountConnector from "@/components/SmartAccountConnector";
import SpendLimitsDebugAndFix from "@/components/SpendLimitsDebugAndFix";
import { Toaster } from "react-hot-toast";

// Create a new QueryClient
const queryClient = new QueryClient();

// Get the Wagmi config with Coinbase Wallet connector
const wagmiConfig = getWagmiConfig();

// Main content component that shows different UI based on connection status
const MainContent = () => {
  const { isConnected } = useAccount();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Smart Account Setup</h1>

      <div className="mb-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
        <h2 className="text-xl font-semibold mb-2">How This Works</h2>
        <p className="text-gray-700 mb-3">
          This page helps you set up a Coinbase Wallet smart account and
          configure spend limits. Follow these steps:
        </p>
        <ol className="list-decimal ml-5 space-y-1 text-gray-700">
          <li>Connect your Coinbase Wallet using the connector below</li>
          <li>
            Make sure your wallet supports smart accounts (version 3.0.0+)
          </li>
          <li>Create a smart account if you don&apos;t have one</li>
          <li>Set up spend limits using one of the available approaches</li>
        </ol>
      </div>

      <SmartAccountConnector />

      {isConnected && (
        <div className="mt-6">
          <SpendLimitsDebugAndFix />
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Troubleshooting</h3>
        <ul className="list-disc ml-5 space-y-2 text-gray-700">
          <li>
            <strong>Wallet Connection:</strong> Make sure you&apos;re using
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
            <strong>Funds:</strong> Your smart account needs ETH to cover gas
            fees. Get some from a Base Sepolia faucet.
          </li>
          <li>
            <strong>Browser Extensions:</strong> If you&apos;re having issues,
            try disabling other wallet extensions temporarily.
          </li>
        </ul>
      </div>
    </div>
  );
};

// Page component with providers
export default function SmartAccountSetupPage() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SmartAccountProvider>
          <Toaster position="top-right" />
          <MainContent />
        </SmartAccountProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

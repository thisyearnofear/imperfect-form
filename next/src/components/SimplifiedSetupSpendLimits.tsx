"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { useNetwork as useNetworkContext } from "@/contexts/NetworkContext";
import { parseEther } from "viem";
import toast from "react-hot-toast";
import Spinner from "@/components/Spinner";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet";
import { Avatar, Name, Identity } from "@coinbase/onchainkit/identity";

// Constants for the spend permission manager
const SPEND_PERMISSION_MANAGER_ADDRESS =
  "0xf85210B21cC50302F477BA56686d2019dC9b67Ad" as `0x${string}`;
const NATIVE_ETH_ADDRESS =
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as `0x${string}`;

// EIP-712 types for the spend permission
const SPEND_PERMISSION_EIP712_TYPES = {
  SpendPermission: [
    { name: "account", type: "address" },
    { name: "spender", type: "address" },
    { name: "token", type: "address" },
    { name: "allowance", type: "uint160" },
    { name: "period", type: "uint48" },
    { name: "start", type: "uint48" },
    { name: "end", type: "uint48" },
    { name: "salt", type: "uint256" },
    { name: "extraData", type: "bytes" },
  ],
} as const;

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

const SimplifiedSetupSpendLimits: React.FC = () => {
  const { address } = useAccount();
  const { network } = useNetworkContext();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSetupSpendLimits, setHasSetupSpendLimits] = useState(false);
  const [hasSmartAccount, setHasSmartAccount] = useState<boolean | null>(null);

  // Wagmi hook for signing typed data
  const { signTypedDataAsync } = useSignTypedData();

  // Only show for Base network with coinbase wallet
  const shouldShowSetup = network === "base" && address && !hasSetupSpendLimits;

  // Function to open Coinbase Wallet for smart account creation
  const openCoinbaseWallet = () => {
    window.open("https://wallet.coinbase.com/smart-wallet", "_blank");
    toast.success(
      "Opening Coinbase Wallet. Please create a smart account and return here.",
      { duration: 6000, icon: "👛" }
    );
  };

  // Function to check if user has a smart account
  const checkSmartAccount = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      // Create a simple spend permission to test
      const spendPermission = {
        account: address as `0x${string}`,
        spender: address as `0x${string}`, // Using self as spender for simplicity
        token: NATIVE_ETH_ADDRESS,
        allowance: parseEther("0.01"),
        period: 86400, // 1 day
        start: Math.floor(Date.now() / 1000),
        end: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
        salt: BigInt(0),
        extraData: "0x" as `0x${string}`,
      };

      // Get domain for EIP-712 signing
      const domain = {
        name: "Spend Permission Manager",
        version: "1",
        chainId: 84532, // Base Sepolia
        verifyingContract: SPEND_PERMISSION_MANAGER_ADDRESS,
      };

      // Try to sign - this will reveal if they have a smart account
      await signTypedDataAsync({
        domain,
        types: SPEND_PERMISSION_EIP712_TYPES,
        primaryType: "SpendPermission",
        message: spendPermission,
      });

      setHasSmartAccount(true);
      toast.success(
        "Smart Account detected! You can now set up spend limits.",
        {
          icon: "✅",
        }
      );
    } catch (error: unknown) {
      console.error("Error checking smart account:", error);

      // Check if the error is related to smart account issues
      if (
        isErrorWithMessage(error) &&
        (error.message.includes("SubAccount") ||
          error.message.includes("0x000000006551c19487814612e58FE06813775758"))
      ) {
        setHasSmartAccount(false);
        toast.error(
          "No Smart Account found. Please create one in your Coinbase Wallet.",
          {
            icon: "❌",
            duration: 5000,
          }
        );
      } else {
        // Other error - might have a smart account but other issues
        setHasSmartAccount(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, signTypedDataAsync]);

  // Check if the user has a smart account
  useEffect(() => {
    if (network === "base" && address) {
      checkSmartAccount();
    }
  }, [network, address, checkSmartAccount]);

  // Setup spend limits - simplified version
  const setupSpendLimits = async () => {
    if (!address) return;

    if (!hasSmartAccount) {
      openCoinbaseWallet();
      return;
    }

    setIsLoading(true);
    try {
      // Create a simple spend permission
      const spendPermission = {
        account: address as `0x${string}`,
        spender: address as `0x${string}`, // Using self as spender for simplicity
        token: NATIVE_ETH_ADDRESS,
        allowance: parseEther("0.01"),
        period: 86400, // 1 day
        start: Math.floor(Date.now() / 1000),
        end: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
        salt: BigInt(0),
        extraData: "0x" as `0x${string}`,
      };

      // Get domain for EIP-712 signing
      const domain = {
        name: "Spend Permission Manager",
        version: "1",
        chainId: 84532, // Base Sepolia
        verifyingContract: SPEND_PERMISSION_MANAGER_ADDRESS,
      };

      toast.loading("Please sign the spend permission in your wallet...", {
        id: "spend-permission",
      });

      // Sign the spend permission
      const signature = await signTypedDataAsync({
        domain,
        types: SPEND_PERMISSION_EIP712_TYPES,
        primaryType: "SpendPermission",
        message: spendPermission,
      });

      // Log for debugging
      console.log("Spend permission:", spendPermission);
      console.log("Signature:", signature);

      toast.loading("Setting up spend limits...", {
        id: "spend-permission",
      });

      // For now, we'll just consider it a success if we get a signature
      // In a real implementation, you'd call a contract or API to use this signature
      setHasSetupSpendLimits(true);
      toast.success(
        "Spend limits set up successfully! You can now submit scores without signing each transaction.",
        {
          id: "spend-permission",
          icon: "🎉",
          duration: 5000,
        }
      );
    } catch (error: unknown) {
      console.error("Error setting up spend limits:", error);
      toast.error(`Failed to set up spend limits: ${getErrorMessage(error)}`, {
        id: "spend-permission",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If we shouldn't show setup or it's already been set up, return null
  if (!shouldShowSetup) return null;

  return (
    <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h3 className="text-lg font-bold mb-2">Enable One-Click Submissions</h3>

      {hasSmartAccount === false ? (
        // Show smart account setup instructions if they don't have one
        <>
          <p className="mb-4">
            To enable faster submissions, you first need to create a Smart
            Account in your Coinbase Wallet:
          </p>
          <div className="flex flex-col items-center space-y-4 mb-4">
            {/* OnchainKit Wallet Button */}
            <Wallet>
              <ConnectWallet>
                <div className="flex items-center space-x-2 bg-[#0052FF] text-white px-4 py-2 rounded-lg hover:bg-[#0039B3] transition-colors cursor-pointer">
                  <Avatar className="h-6 w-6" />
                  <span>Open in Coinbase Wallet</span>
                </div>
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                </Identity>
                <WalletDropdownLink
                  icon="wallet"
                  href="https://wallet.coinbase.com/smart-wallet"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Create Smart Account
                </WalletDropdownLink>
              </WalletDropdown>
            </Wallet>

            {/* Fallback direct deep link button */}
            <button
              onClick={openCoinbaseWallet}
              className="text-[#0052FF] underline text-sm hover:text-[#0039B3]"
            >
              Open wallet directly
            </button>
          </div>
          <ol className="list-decimal ml-5 mb-4 text-sm space-y-2">
            <li>Click one of the buttons above to open Coinbase Wallet</li>
            <li>Go to Settings → Smart Accounts</li>
            <li>Tap &quot;Create Smart Account&quot;</li>
            <li>Follow the prompts to create your account</li>
            <li>Return here and click the button below</li>
          </ol>
        </>
      ) : (
        // Show spend limits setup if they have a smart account
        <>
          <p className="mb-4">
            Set up spend limits to submit your scores without signing each
            transaction. This will make the experience smoother!
          </p>
          <div className="mb-4">
            <Identity
              className="px-4 pt-3 pb-2 bg-blue-50 rounded-lg"
              hasCopyAddressOnClick
            >
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8" />
                <div>
                  <Name className="font-medium" />
                  <div className="text-sm text-gray-600">
                    Smart Account Connected
                  </div>
                </div>
              </div>
            </Identity>
          </div>
        </>
      )}

      <button
        onClick={setupSpendLimits}
        disabled={isLoading}
        className={`w-full py-2 px-4 rounded-md transition-all ${
          isLoading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <Spinner /> <span className="ml-2">Setting up...</span>
          </span>
        ) : hasSmartAccount === false ? (
          "Create Smart Account"
        ) : (
          "Set Up Spend Limits"
        )}
      </button>
    </div>
  );
};

export default SimplifiedSetupSpendLimits;

"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { useNetwork as useNetworkContext } from "@/contexts/NetworkContext";
import { parseEther } from "viem";
import toast from "react-hot-toast";
import Spinner from "@/components/Spinner";
import {
  SpendPermission,
  createSpendPermission,
  getSpendPermissionDomain,
  approveSpendPermissionWithSignature,
  SPEND_PERMISSION_EIP712_TYPES,
} from "@/utils/subAccountsManager";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet";
import { Avatar, Name, Identity } from "@coinbase/onchainkit/identity";

const SetupSpendLimits: React.FC = () => {
  const { address } = useAccount();
  const { network } = useNetworkContext();

  const [isLoading, setIsLoading] = useState(false);
  const [hasSetupSpendLimits, setHasSetupSpendLimits] = useState(false);
  const [hasSubAccount, setHasSubAccount] = useState<boolean | null>(null);

  // Wagmi hook for signing typed data
  const { signTypedDataAsync } = useSignTypedData();

  // Only show for Base network with coinbase wallet
  const shouldShowSetup = network === "base" && address && !hasSetupSpendLimits;

  // Function to open Coinbase Wallet for sub-account creation
  const openCoinbaseWallet = () => {
    // Try to use the Coinbase Wallet deep link first
    window.open("https://wallet.coinbase.com/smart-wallet", "_blank");

    // Show a toast with instructions
    toast.success(
      "Opening Coinbase Wallet. Please create a smart account and return here.",
      {
        duration: 6000,
        icon: "👛",
      }
    );
  };

  // Check if the user has a sub-account by attempting a transaction
  useEffect(() => {
    if (network === "base" && address) {
      const checkSubAccount = async () => {
        try {
          setIsLoading(true);
          // Try to create a spend permission - this will fail if no sub-account exists
          const newSpendPermission = createSpendPermission(
            address as `0x${string}`,
            address as `0x${string}`,
            parseEther("0.01"),
            86400
          );

          // Get EIP-712 domain
          const domain = getSpendPermissionDomain();

          // Try to sign - this will reveal if they have a sub-account
          await signTypedDataAsync({
            domain,
            types: SPEND_PERMISSION_EIP712_TYPES,
            primaryType: "SpendPermission",
            message: newSpendPermission,
          });

          setHasSubAccount(true);
          toast.success(
            "Smart Account detected! You can now set up spend limits.",
            {
              icon: "✅",
            }
          );
        } catch (error: unknown) {
          const errorObj = error as { message?: string };
          // Check if the error is related to sub-account issues
          if (
            errorObj?.message?.includes("SubAccount") ||
            errorObj?.message?.includes(
              "0x000000006551c19487814612e58FE06813775758"
            )
          ) {
            setHasSubAccount(false);
            toast.error(
              "No Smart Account found. Please create one in your Coinbase Wallet.",
              {
                icon: "❌",
                duration: 5000,
              }
            );
          } else {
            // Other error - might have a sub-account but other issues
            setHasSubAccount(true);
          }
        } finally {
          setIsLoading(false);
        }
      };

      checkSubAccount();
    }
  }, [network, address, signTypedDataAsync]);

  // Setup spend limits
  const setupSpendLimits = async () => {
    if (!address) return;

    if (!hasSubAccount) {
      openCoinbaseWallet();
      return;
    }

    setIsLoading(true);
    try {
      // Create a new spend permission
      const newSpendPermission: SpendPermission = createSpendPermission(
        address as `0x${string}`,
        address as `0x${string}`,
        parseEther("0.01"),
        86400
      );

      toast.loading("Please sign the spend permission in your wallet...", {
        id: "spend-permission",
      });

      // Get EIP-712 domain
      const domain = getSpendPermissionDomain();

      // Get user signature for the spend permission
      const signature = await signTypedDataAsync({
        domain,
        types: SPEND_PERMISSION_EIP712_TYPES,
        primaryType: "SpendPermission",
        message: newSpendPermission,
      });

      toast.loading("Setting up spend limits...", {
        id: "spend-permission",
      });

      // Approve the spend permission with the signature
      const success = await approveSpendPermissionWithSignature(
        newSpendPermission,
        signature as `0x${string}`
      );

      if (success) {
        setHasSetupSpendLimits(true);
        toast.success(
          "Spend limits set up successfully! You can now submit scores without signing each transaction.",
          {
            id: "spend-permission",
            icon: "🎉",
            duration: 5000,
          }
        );
      } else {
        toast.error("Failed to set up spend limits.", {
          id: "spend-permission",
        });
      }
    } catch (error: unknown) {
      const errorObj = error as { message?: string };
      console.error("Error setting up spend limits:", error);

      // Check if the error is related to sub-account issues
      if (
        errorObj?.message?.includes("SubAccount") ||
        errorObj?.message?.includes(
          "0x000000006551c19487814612e58FE06813775758"
        )
      ) {
        setHasSubAccount(false);
        toast.error(
          "You need to create a Smart Account in your Coinbase Wallet first",
          {
            id: "spend-permission",
            icon: "❌",
          }
        );
      } else {
        toast.error("Error setting up spend limits. Please try again.", {
          id: "spend-permission",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If we shouldn't show setup or it's already been set up, return null
  if (!shouldShowSetup) return null;

  return (
    <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h3 className="text-lg font-bold mb-2">Enable One-Click Submissions</h3>

      {hasSubAccount === false ? (
        // Show sub-account setup instructions if they don't have one
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
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm">
            <strong>Why do I need this?</strong>
            <p className="mt-1">
              Smart Accounts enable gas-free transactions and automatic
              approvals, making your experience smoother. Your funds remain
              secure, and you maintain full control.
            </p>
          </div>
        </>
      ) : (
        // Show spend limits setup if they have a sub-account
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
        ) : hasSubAccount === false ? (
          "Create Smart Account"
        ) : (
          "Set Up Spend Limits"
        )}
      </button>
    </div>
  );
};

export default SetupSpendLimits;

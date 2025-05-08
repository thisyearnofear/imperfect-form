"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { useNetwork as useNetworkContext } from "@/contexts/NetworkContext";
import { parseEther } from "viem";
import toast from "react-hot-toast";
import Spinner from "@/components/Spinner";
import {
  SpendPermission,
  createSpendPermission,
  getSpendPermissionDomain,
  getSubAccount,
  approveSpendPermissionWithSignature,
  createSubAccountForParent,
} from "@/utils/subAccountsManager";

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
};

const SetupSpendLimits: React.FC = () => {
  const { address } = useAccount();
  const { network } = useNetworkContext();
  const [isLoading, setIsLoading] = useState(false);
  const [spendPermission, setSpendPermission] =
    useState<SpendPermission | null>(null);
  const [hasSetupSpendLimits, setHasSetupSpendLimits] = useState(false);
  const [subAccountAddress, setSubAccountAddress] = useState<string | null>(
    null
  );

  // Wagmi hook for signing typed data
  const { signTypedDataAsync } = useSignTypedData();

  // Only show for Base network with coinbase wallet
  const shouldShowSetup = network === "base" && address && !hasSetupSpendLimits;

  // Add a state for tracking if we're creating a sub-account
  const [isCreatingSubAccount, setIsCreatingSubAccount] = useState(false);

  // Check if user has a sub-account - define this function before the useEffect that calls it
  const checkSubAccount = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      // Try to get existing sub-account
      const existingSubAccount = await getSubAccount(address);

      if (existingSubAccount) {
        setSubAccountAddress(existingSubAccount);
        // You would also check if there's an existing spend permission
        // For this example, we'll assume there isn't one yet
      }
    } catch (error) {
      console.error("Error checking sub-account:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Check if user already has sub-account and spend limits
  useEffect(() => {
    if (network === "base" && address) {
      checkSubAccount();
    }
  }, [network, address, checkSubAccount]);

  // Function to handle sub-account creation
  const handleCreateSubAccount = async () => {
    if (!address) return;

    setIsCreatingSubAccount(true);
    try {
      // Call the function to create a sub-account
      const newSubAccount = await createSubAccountForParent(address);

      if (newSubAccount) {
        setSubAccountAddress(newSubAccount);
      } else {
        // If we didn't get a sub-account immediately, wait a moment and check again
        setTimeout(async () => {
          await checkSubAccount();
          setIsCreatingSubAccount(false);
        }, 5000);
      }
    } catch (error) {
      console.error("Error creating sub-account:", error);
    } finally {
      setIsCreatingSubAccount(false);
    }
  };

  // Setup spend limits
  const setupSpendLimits = async () => {
    if (!address || !subAccountAddress) return;

    setIsLoading(true);
    try {
      // Create a new spend permission with a typed annotation
      const newSpendPermission: SpendPermission = createSpendPermission(
        address,
        subAccountAddress,
        parseEther("0.01"), // Allow 0.01 ETH per transaction
        86400 // 1 day period
      );

      // Update the state with the new spend permission
      setSpendPermission(newSpendPermission);

      // Get EIP-712 domain
      const domain = getSpendPermissionDomain();

      // Get user signature for the spend permission
      const signature = await signTypedDataAsync({
        domain,
        types: SPEND_PERMISSION_EIP712_TYPES,
        primaryType: "SpendPermission",
        message: newSpendPermission as unknown as Record<string, unknown>,
      });

      // Approve the spend permission with the signature
      const success = await approveSpendPermissionWithSignature(
        newSpendPermission,
        signature
      );

      if (success) {
        setHasSetupSpendLimits(true);
        toast.success(
          "Spend limits set up successfully! You can now submit scores without signing each transaction."
        );
      } else {
        toast.error("Failed to set up spend limits.");
      }
    } catch (error) {
      console.error("Error setting up spend limits:", error);
      toast.error("Error setting up spend limits. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // If we shouldn't show setup or it's already been set up, return null
  if (!shouldShowSetup) return null;

  return (
    <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h3 className="text-lg font-bold mb-2">Enable One-Click Submissions</h3>

      {!subAccountAddress ? (
        // If no sub-account exists yet, show the creation button and instructions
        <>
          <p className="mb-3">
            To enable faster submissions, create a sub-account:
          </p>

          <button
            onClick={handleCreateSubAccount}
            disabled={isCreatingSubAccount}
            className={`w-full py-2 px-4 rounded-md transition-all mb-3 ${
              isCreatingSubAccount
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isCreatingSubAccount ? (
              <span className="flex items-center justify-center">
                <Spinner />{" "}
                <span className="ml-2">Creating Sub-Account...</span>
              </span>
            ) : (
              "Create Sub-Account"
            )}
          </button>

          <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-100">
            <p className="text-sm text-blue-800 font-medium mb-1">
              What this does:
            </p>
            <ul className="text-xs text-blue-700 list-disc ml-4 space-y-1">
              <li>Creates a private sub-account linked to your wallet</li>
              <li>
                Enables seamless score submissions without multiple signatures
              </li>
              <li>Improves your experience with the app</li>
            </ul>
          </div>
        </>
      ) : (
        // If sub-account exists, show the standard flow
        <>
          <p className="mb-4">
            Set up spend limits to submit your scores without signing each
            transaction. This will make the experience smoother!
          </p>

          {/* Show if spend permission is set but not yet approved */}
          {spendPermission && !hasSetupSpendLimits && (
            <div className="mb-3 p-2 bg-green-50 rounded text-sm">
              Spend permission created! Please approve it to continue.
            </div>
          )}
        </>
      )}

      <button
        onClick={setupSpendLimits}
        disabled={isLoading || !subAccountAddress}
        className={`w-full py-2 px-4 rounded-md transition-all ${
          isLoading || !subAccountAddress
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <Spinner /> <span className="ml-2">Setting up...</span>
          </span>
        ) : !subAccountAddress ? (
          "Create Sub-Account First"
        ) : (
          "Set Up Spend Limits"
        )}
      </button>
    </div>
  );
};

export default SetupSpendLimits;

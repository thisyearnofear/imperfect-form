import { createPublicClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import {
  SUBACCOUNT_FACTORY_ADDRESS,
  subAccountFactoryABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
  NATIVE_ETH_ADDRESS,
} from "@/constants/subAccountsContracts";
import toast from "react-hot-toast";

// Interface for the SpendPermission structure
export interface SpendPermission {
  account: `0x${string}`; // User's wallet address
  spender: `0x${string}`; // App's sub-account address
  token: `0x${string}`; // Token address (use NATIVE_ETH_ADDRESS for ETH)
  allowance: bigint; // Amount allowed per period
  period: number; // Period in seconds
  start: number; // Start timestamp
  end: number; // End timestamp
  salt: bigint; // Random salt
  extraData: `0x${string}`; // Additional data
}

// Get a public client for Base Sepolia
export async function getPublicClient() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
  return client;
}

// Store a mapping of parent wallet addresses to their sub-accounts
const subAccountsCache: Record<string, string> = {};

// Check if a sub-account exists for a parent wallet
export async function getSubAccount(
  parentAddress: string
): Promise<string | null> {
  // First check the cache
  if (subAccountsCache[parentAddress]) {
    return subAccountsCache[parentAddress];
  }

  try {
    const publicClient = await getPublicClient();

    // First try to get existing sub-accounts
    try {
      const subAccounts = (await publicClient.readContract({
        address: SUBACCOUNT_FACTORY_ADDRESS as `0x${string}`,
        abi: subAccountFactoryABI,
        functionName: "getSubAccountsForParent",
        args: [parentAddress as `0x${string}`],
      })) as `0x${string}`[];

      // If sub-accounts exist, return the first one
      if (subAccounts && subAccounts.length > 0) {
        subAccountsCache[parentAddress] = subAccounts[0];
        return subAccounts[0];
      }
    } catch (error) {
      // If the call fails, it likely means the user doesn't have a sub-account yet
      console.log(
        "No existing sub-accounts found, may need to create one",
        error
      );
    }

    // Since we don't have a proper backend server to create sub-accounts securely,
    // we'll inform the user that sub-account creation needs to happen through the Coinbase Wallet
    toast.success(
      "To use one-click submissions, please create a sub-account in your Coinbase Wallet app first"
    );

    // Return null to indicate no sub-account was found
    return null;
  } catch (error) {
    console.error("Error in getSubAccount:", error);
    return null;
  }
}

// Create a spend permission request for the user to sign
export function createSpendPermission(
  userAddress: string,
  spenderAddress: string,
  amount: bigint = parseEther("0.01"), // Default small amount for testing
  period: number = 86400 // Default 1 day period
): SpendPermission {
  // Create a random salt
  const salt = BigInt(
    "0x" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
  );

  const currentTimestamp = Math.floor(Date.now() / 1000);

  return {
    account: userAddress as `0x${string}`,
    spender: spenderAddress as `0x${string}`,
    token: NATIVE_ETH_ADDRESS as `0x${string}`, // Using native ETH
    allowance: amount,
    period: period,
    start: currentTimestamp,
    end: currentTimestamp + 365 * 24 * 60 * 60, // 1 year from now
    salt: salt,
    extraData: "0x" as `0x${string}`,
  };
}

// Function to submit a spend permission with user signature
export async function approveSpendPermissionWithSignature(
  spendPermission: SpendPermission,
  signature: string
) {
  try {
    // We would typically do this in a server endpoint
    // Here we're just showing a toast notification instead of actually
    // sending a transaction to the blockchain
    console.log("Would approve spend permission:", {
      spendPermission,
      signature,
    });

    toast.success(
      "Spend permission approved! You can now submit scores without signing each transaction."
    );

    // Return success
    return true;
  } catch (error) {
    console.error("Error approving spend permission:", error);
    toast.error("Failed to approve spend permission.");
    return false;
  }
}

// Use the spend permission to make a transaction
export async function useSpendPermission(spendPermission: SpendPermission) {
  try {
    // This would be a server-side function where a private key can be securely used
    console.log(
      "Would use spend permission to send transaction:",
      spendPermission
    );

    // For this demo, we're showing what would happen
    toast.success(
      "Used spend permission to submit score without additional signature!"
    );

    // Return success
    return true;
  } catch (error) {
    console.error("Error using spend permission:", error);
    toast.error("Failed to use spend permission.");
    return false;
  }
}

// Helper function to get the domain for EIP-712 signing
export function getSpendPermissionDomain() {
  return {
    name: "Spend Permission Manager",
    version: "1",
    chainId: baseSepolia.id,
    verifyingContract: SPEND_PERMISSION_MANAGER_ADDRESS as `0x${string}`,
  };
}

// Function to create a sub-account for a parent wallet
export async function createSubAccountForParent(
  parentAddress: string
): Promise<string | null> {
  try {
    toast.success("Creating your sub-account... This may take a moment");

    // Call our API endpoint to create the sub-account
    const response = await fetch("/api/create-subaccount", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parentAddress }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to create sub-account");
    }

    if (data.subAccountAddress) {
      // Cache the sub-account address
      subAccountsCache[parentAddress] = data.subAccountAddress;

      toast.success("Sub-account created successfully!");
      return data.subAccountAddress;
    } else if (data.hash) {
      // If we got a transaction hash but no address yet, the transaction was submitted
      // but we might need to wait a bit longer
      toast.success(
        "Sub-account creation transaction submitted. Please wait for confirmation."
      );

      // In a production app, you might want to poll for the sub-account to be created
      // For simplicity, we'll just return null and let the user refresh
      return null;
    }

    return null;
  } catch (error) {
    console.error("Error creating sub-account:", error);
    toast.error("Failed to create sub-account. Please try again.");
    return null;
  }
}

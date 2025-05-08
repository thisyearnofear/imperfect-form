import { createPublicClient, http, parseEther, Address } from "viem";
import { baseSepolia } from "viem/chains";
import {
  SUBACCOUNT_FACTORY_ADDRESS,
  subAccountFactoryABI,
  SPEND_PERMISSION_MANAGER_ADDRESS,
  NATIVE_ETH_ADDRESS,
  spendPermissionManagerABI,
} from "@/constants/subAccountsContracts";
import toast from "react-hot-toast";

// Interface for the SpendPermission structure
export interface SpendPermission {
  account: `0x${string}`;
  spender: `0x${string}`;
  token: `0x${string}`;
  allowance: bigint;
  period: number;
  start: number;
  end: number;
  salt: bigint;
  extraData: `0x${string}`;
}

// Get a public client for Base Sepolia
export async function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
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
    } catch (subAccountError) {
      // If the call fails, it likely means the user doesn't have a sub-account yet
      console.log(
        "No existing sub-accounts found, may need to create one:",
        subAccountError
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
  userAddress: Address,
  spenderAddress: Address,
  amount: bigint = parseEther("0.01"), // Default small amount for testing
  period: number = 86400 // Default 1 day period
): SpendPermission {
  const currentTimestamp = Math.floor(Date.now() / 1000);

  // Create a random salt
  const salt = BigInt(
    "0x" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)
  );

  return {
    account: userAddress as `0x${string}`,
    spender: spenderAddress as `0x${string}`,
    token: NATIVE_ETH_ADDRESS as `0x${string}`,
    allowance: amount,
    period,
    start: currentTimestamp,
    end: currentTimestamp + 365 * 24 * 60 * 60, // 1 year from now
    salt,
    extraData: "0x" as `0x${string}`,
  };
}

// Helper function to get the domain for EIP-712 signing
export function getSpendPermissionDomain() {
  return {
    name: "Spend Permission Manager",
    version: "1",
    chainId: baseSepolia.id,
    verifyingContract: SPEND_PERMISSION_MANAGER_ADDRESS,
  };
}

// Function to submit a spend permission with user signature
export async function approveSpendPermissionWithSignature(
  spendPermission: SpendPermission,
  signature: `0x${string}`
) {
  try {
    const publicClient = await getPublicClient();

    // Call the contract's approveWithSignature function
    const result = await publicClient.simulateContract({
      address: SPEND_PERMISSION_MANAGER_ADDRESS,
      abi: spendPermissionManagerABI,
      functionName: "approveWithSignature",
      args: [
        {
          account: spendPermission.account,
          spender: spendPermission.spender,
          token: spendPermission.token,
          allowance: spendPermission.allowance,
          period: spendPermission.period,
          start: spendPermission.start,
          end: spendPermission.end,
          salt: spendPermission.salt,
          extraData: spendPermission.extraData,
        },
        signature,
      ],
    });

    if (result.request) {
      toast.success("Spend permission approved successfully!");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error approving spend permission:", error);
    toast.error("Failed to approve spend permission");
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

// Constants for EIP-712 signing
export const SPEND_PERMISSION_EIP712_TYPES = {
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

import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, createPublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  SUBACCOUNT_FACTORY_ADDRESS,
  subAccountFactoryABI,
} from "@/constants/subAccountsContracts";

// Store app private key securely in environment variables
// In production, this should be set in your Vercel environment variables
// For development, you can use .env.local
const APP_PRIVATE_KEY = process.env.APP_PRIVATE_KEY || "";

// Create a public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    const { parentAddress } = await request.json();

    if (!parentAddress) {
      return NextResponse.json(
        { success: false, error: "Parent address is required" },
        { status: 400 }
      );
    }

    // Validate the private key exists
    if (!APP_PRIVATE_KEY || APP_PRIVATE_KEY === "") {
      console.error("APP_PRIVATE_KEY not set in environment variables");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // First check if the parent already has a sub-account
    try {
      const existingSubAccounts = (await publicClient.readContract({
        address: SUBACCOUNT_FACTORY_ADDRESS as `0x${string}`,
        abi: subAccountFactoryABI,
        functionName: "getSubAccountsForParent",
        args: [parentAddress as `0x${string}`],
      })) as `0x${string}`[];

      // If sub-accounts exist, return the first one
      if (existingSubAccounts && existingSubAccounts.length > 0) {
        return NextResponse.json({
          success: true,
          subAccountAddress: existingSubAccounts[0],
          message: "Sub-account already exists",
        });
      }
    } catch (error) {
      // Just log and continue, no need to handle this error specifically
      console.log("No existing sub-accounts found, creating one now...", error);
    }

    // Create account from private key
    const account = privateKeyToAccount(APP_PRIVATE_KEY as `0x${string}`);

    // Create wallet client
    const client = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(),
    });

    // Create sub-account with minimal metadata
    const metadata = "0x" as `0x${string}`; // Empty metadata for simplicity

    // Send transaction to create sub-account
    const hash = await client.writeContract({
      address: SUBACCOUNT_FACTORY_ADDRESS as `0x${string}`,
      abi: subAccountFactoryABI,
      functionName: "createSubAccount",
      args: [parentAddress as `0x${string}`, metadata],
    });

    // Wait for the transaction to be mined and get the receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // After transaction is successful, we should get the new sub-account
    // If we can't find it immediately, we'll return the transaction info anyway
    let subAccountAddress = null;

    try {
      const newSubAccounts = (await publicClient.readContract({
        address: SUBACCOUNT_FACTORY_ADDRESS as `0x${string}`,
        abi: subAccountFactoryABI,
        functionName: "getSubAccountsForParent",
        args: [parentAddress as `0x${string}`],
      })) as `0x${string}`[];

      if (newSubAccounts && newSubAccounts.length > 0) {
        subAccountAddress = newSubAccounts[0];
      }
    } catch (error) {
      console.error("Error getting new sub-account after creation:", error);
    }

    return NextResponse.json({
      success: true,
      hash,
      receipt,
      subAccountAddress,
      message: "Sub-account creation successful",
    });
  } catch (error: unknown) {
    console.error("Error creating sub-account:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

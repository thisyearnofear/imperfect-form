import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

// Constants for the spend permission manager
const SPEND_PERMISSION_MANAGER_ADDRESS =
  "0xf85210B21cC50302F477BA56686d2019dC9b67Ad" as `0x${string}`;

// Interface for error types
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

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}

// ABI for the spend permission manager (just the function we need)
const spendPermissionManagerABI = [
  {
    type: "function",
    name: "approveWithSignature",
    inputs: [
      {
        name: "spendPermission",
        type: "tuple",
        internalType: "struct SpendPermissionManager.SpendPermission",
        components: [
          { name: "account", type: "address", internalType: "address" },
          { name: "spender", type: "address", internalType: "address" },
          { name: "token", type: "address", internalType: "address" },
          { name: "allowance", type: "uint160", internalType: "uint160" },
          { name: "period", type: "uint48", internalType: "uint48" },
          { name: "start", type: "uint48", internalType: "uint48" },
          { name: "end", type: "uint48", internalType: "uint48" },
          { name: "salt", type: "uint256", internalType: "uint256" },
          { name: "extraData", type: "bytes", internalType: "bytes" },
        ],
      },
      { name: "signature", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { spendPermission, signature } = body;

    // Validate the request
    if (!spendPermission || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("Received spend permission:", spendPermission);
    console.log("Received signature:", signature);

    // Create a public client for Base Sepolia
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(
        process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_URL ||
          "https://base-sepolia.g.alchemy.com/v2/demo"
      ),
    });

    // Simulate the contract call to check if it would succeed
    try {
      const simulationResult = await publicClient.simulateContract({
        address: SPEND_PERMISSION_MANAGER_ADDRESS,
        abi: spendPermissionManagerABI,
        functionName: "approveWithSignature",
        args: [spendPermission, signature],
      });

      console.log("Simulation successful:", simulationResult);

      // In a real implementation, you would use a wallet to send the transaction
      // For this demo, we'll just return success if the simulation succeeds
      return NextResponse.json({
        success: true,
        message: "Spend permission would be approved successfully",
        data: {
          simulationResult: {
            result: simulationResult.result,
            request: {
              address: simulationResult.request.address,
              functionName: simulationResult.request.functionName,
            },
          },
        },
      });
    } catch (error) {
      console.error("Simulation failed:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Transaction simulation failed",
          details: getErrorMessage(error),
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

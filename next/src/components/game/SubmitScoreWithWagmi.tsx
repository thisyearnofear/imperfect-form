"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui";
import { useNetwork as useNetworkContext } from "@/contexts/NetworkContext";
import {
  useAccount,
  useWriteContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  BASE_CONTRACT_ADDRESS,
  POLYGON_CONTRACT_ADDRESS,
  fitnessLeaderboardABI,
} from "@/constants/contracts";

// Verify the ABI and contract address are valid
console.log("Contract config loaded:", {
  address: BASE_CONTRACT_ADDRESS,
  abiLength: fitnessLeaderboardABI.length,
});

interface SubmitScoreProps {
  score?: number;
  exerciseType?: "pushups" | "squats";
  forceDirectSubmission?: boolean;
  walletAddress?: string; // Add wallet address prop
}

// Component that handles score submission using Wagmi for direct contract interactions
export default function SubmitScoreWithWagmi({
  score,
  exerciseType,
  forceDirectSubmission = false,
  walletAddress,
}: SubmitScoreProps) {
  const [confirmStep, setConfirmStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address: wagmiAddress } = useAccount();
  const { network } = useNetworkContext();
  // Create a type-safe network variable
  const isPolygonNetwork = network === "polygon";
  const isBaseNetwork = network === "base";

  // Use the wallet address prop if provided, otherwise fall back to the wagmi address
  const address = walletAddress || wagmiAddress;

  // Only use wagmi hooks if we're on Base with a connected wallet
  const useWagmi = isBaseNetwork && Boolean(address);

  // Reduce console log verbosity
  if (process.env.NODE_ENV !== "production") {
    console.log("Submission config:", {
      network,
      address,
      useWagmi,
      contractAddress: BASE_CONTRACT_ADDRESS,
      forceDirectSubmissionProp: forceDirectSubmission,
    });
  }

  // Calculate the pushups and squats values and ensure they're BigInt for contract submission
  const pushups = exerciseType === "pushups" ? score || 0 : 0;
  const squats = exerciseType === "squats" ? score || 0 : 0;
  // Convert to BigInt for contract submission
  const pushupsBI = BigInt(pushups);
  const squatsBI = BigInt(squats);

  // Simulation hook
  // Get the appropriate contract address based on the network
  const contractAddress = isPolygonNetwork
    ? POLYGON_CONTRACT_ADDRESS
    : BASE_CONTRACT_ADDRESS;

  // Ensure contract address is properly formatted as 0x-prefixed string
  const formattedContractAddress = contractAddress.startsWith("0x")
    ? (contractAddress as `0x${string}`)
    : (`0x${contractAddress}` as `0x${string}`);

  if (process.env.NODE_ENV !== "production") {
    console.log("Using contract address:", formattedContractAddress);
  }

  // Simulation hook
  const { error: simulateError } = useSimulateContract({
    address: formattedContractAddress,
    abi: fitnessLeaderboardABI,
    functionName: "addScore",
    args: [pushupsBI, squatsBI],
    query: {
      enabled: useWagmi && Boolean(address),
    },
  });

  // Debug contract details and verify contract address format
  useEffect(() => {
    if (useWagmi && address) {
      // Verify contract address is in correct 0x format
      const selectedContractAddress = isPolygonNetwork
        ? POLYGON_CONTRACT_ADDRESS
        : BASE_CONTRACT_ADDRESS;
      const formattedSelectedContractAddress =
        selectedContractAddress.toLowerCase();

      if (process.env.NODE_ENV !== "production") {
        console.log("Contract details:", {
          contract: selectedContractAddress,
          formattedContract: formattedSelectedContractAddress,
          function: "addScore",
          args: [pushups, squats],
          address: address,
          chain: isPolygonNetwork
            ? "Polygon Amoy (80002)"
            : "Base Sepolia (84532)",
        });
      }
    }
  }, [useWagmi, address, pushups, squats, isPolygonNetwork]);

  // Write contract hook
  const { writeContract, isPending, data: txHash } = useWriteContract();

  // Hook to wait for transaction confirmation
  const { isLoading: isWaitingForTx, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

  // Listen for transaction hash
  useEffect(() => {
    // Log when we get a transaction hash
    if (txHash) {
      console.log("Transaction hash received:", txHash);
      console.log(
        "Transaction explorer URL:",
        `https://sepolia-explorer.base.org/tx/${txHash}`
      );

      // Show pending message
      toast.loading(
        <div>
          Transaction submitted! <br />
          <a
            href={`https://sepolia-explorer.base.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", color: "inherit" }}
          >
            View on explorer
          </a>
        </div>,
        { id: "submit-score" }
      );
    }
  }, [txHash]);

  // Listen for transaction confirmation
  useEffect(() => {
    // Only process if we have a transaction hash that's confirmed
    if (isConfirmed && txHash && useWagmi) {
      console.log("Transaction confirmed:", txHash);

      // Store transaction hash for social sharing
      if (typeof window !== "undefined") {
        window.transactionHash = txHash;
        window.selectedNetworkName = "Base Sepolia";
      }

      // Show success message
      const explorerUrl = `https://sepolia-explorer.base.org/tx/${txHash}`;

      toast.success(
        <div>
          Score submitted successfully! <br />
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", color: "inherit" }}
          >
            View on explorer
          </a>
        </div>,
        { id: "submit-score", duration: 8000 }
      );

      // Reset confirmation state and loading
      setConfirmStep(false);
      setIsLoading(false);
    }
  }, [isConfirmed, txHash, useWagmi]);

  // Handle button click to trigger transaction
  const handleSubmit = async () => {
    // Don't do anything if there's no address
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Check if score is zero - prevent submission of zero scores
    if (pushups === 0 && squats === 0) {
      toast.error(
        "Cannot submit a score of zero. Please complete some exercises first!"
      );
      return;
    }

    // When forcing direct submission, we bypass confirmation
    if (!confirmStep && !forceDirectSubmission) {
      setConfirmStep(true);
      toast.success("Click submit again to confirm your submission", {
        id: "confirm-submit",
        duration: 5000,
      });
      return;
    } else if (forceDirectSubmission && !confirmStep) {
      // With forced submission, we set the confirmation flag but continue execution
      setConfirmStep(true);
      console.log("Forced direct submission - bypassing confirmation step");
    }

    // Prevent double submission
    if (isPending || isLoading) {
      return;
    }

    setIsLoading(true);

    // If simulation failed, show error but continue with direct submission option
    if (simulateError) {
      console.error("Simulation error:", simulateError);
      console.error(
        "Simulation error details:",
        JSON.stringify(simulateError, null, 2)
      );

      // For testing purposes, when forcing submission, continue despite simulation errors
      if (forceDirectSubmission) {
        console.log("Forcing direct submission despite simulation error");
        // Show warning but continue
        toast.error(
          <div>
            Simulation error, but attempting direct submission! <br />
            <span className="text-xs">
              {simulateError.message || "Unknown error"}
            </span>
          </div>,
          { id: "submit-score" }
        );
      } else {
        // Normal error handling
        toast.error(
          `Failed to prepare transaction: ${
            simulateError.message || "Unknown error"
          }`,
          {
            id: "submit-score",
          }
        );
        setConfirmStep(false);
        setIsLoading(false);
        return;
      }
    }

    try {
      // For Polygon network, we should use the ThirdWeb wallet via directContractInteraction
      if (isPolygonNetwork) {
        // Show error message - we should be using ThirdWeb for Polygon
        toast.error(
          "Please use ThirdWeb wallet for Polygon network transactions",
          {
            id: "submit-score",
          }
        );
        setIsLoading(false);
        setConfirmStep(false);
        return;
      }

      // For Base network, use Wagmi
      if (process.env.NODE_ENV !== "production") {
        console.log("Submitting transaction via Wagmi:", {
          address: contractAddress,
          formattedAddress: formattedContractAddress,
          function: "addScore",
          args: [pushups, squats],
          chainId: 84532,
        });
      }

      // Show pending toast
      toast.loading("Preparing transaction with wallet...", {
        id: "submit-score",
      });

      // Create a transaction object with the correct format
      const txRequest = {
        address: formattedContractAddress,
        abi: fitnessLeaderboardABI,
        functionName: "addScore",
        args: [pushupsBI, squatsBI],
        chainId: 84532, // Explicitly set Base Sepolia chain ID
        gas: BigInt(500000), // Set a high gas limit to ensure transaction goes through
      };

      if (process.env.NODE_ENV !== "production") {
        console.log(
          "Final transaction request:",
          JSON.stringify(txRequest, (_, v) =>
            typeof v === "bigint" ? v.toString() : v
          )
        );
      }

      // Double check ABI for the correct function
      const addScoreAbi = fitnessLeaderboardABI.find(
        (item) => item.name === "addScore" && item.type === "function"
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("addScore ABI item:", addScoreAbi);
      }

      if (!addScoreAbi) {
        throw new Error("Could not find addScore function in ABI");
      }

      // Execute the contract write with explicit parameters
      writeContract({
        address: formattedContractAddress,
        abi: fitnessLeaderboardABI,
        functionName: "addScore",
        args: [pushupsBI, squatsBI],
        chainId: 84532,
        gas: BigInt(500000),
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(
          "writeContract call completed - transaction sent to wallet"
        );
      }

      // Toast will be updated in the success effect
      toast.loading("Transaction submitted. Waiting for confirmation...", {
        id: "submit-score",
      });
    } catch (error) {
      console.error("Error submitting via Wagmi:", error);
      toast.error("Error submitting transaction. Please try again.", {
        id: "submit-score",
      });
      setConfirmStep(false);
      setIsLoading(false);
    }
  };

  return (
    <button
      id="submitScoreButton"
      onClick={handleSubmit}
      disabled={isPending || isLoading || isWaitingForTx}
      className={`${
        confirmStep
          ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
      } text-white font-bold py-4 px-6 rounded-md transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg w-full flex items-center justify-center text-xl border-4 border-white z-50 relative`}
    >
      {isPending || isLoading || isWaitingForTx ? (
        <>
          <span className="mr-2 text-2xl font-extrabold">SUBMITTING...</span>
          <Spinner />
        </>
      ) : confirmStep ? (
        <span
          style={{ textShadow: "0px 0px 8px rgba(255,255,255,0.8)" }}
          className="text-2xl font-extrabold"
        >
          🔥 CONFIRM SUBMISSION 🔥
        </span>
      ) : (
        <span
          style={{ textShadow: "0px 0px 8px rgba(255,255,255,0.8)" }}
          className="text-2xl font-extrabold"
        >
          🏆 SUBMIT SCORE 🏆
        </span>
      )}
    </button>
  );
}

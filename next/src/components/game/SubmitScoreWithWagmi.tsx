"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAccount, useWriteContract, useSimulateContract } from "wagmi";
import {
  BASE_CONTRACT_ADDRESS,
  POLYGON_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
  fitnessLeaderboardABI,
  monadLeaderboardABI,
  polygonLeaderboardABI,
  baseLeaderboardABI,
} from "@/constants/contracts";
import { isFarcasterMiniApp } from "@/utils/farcasterMiniApp";

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
  const { wallet, user } = usePlatform();
  const { chainId } = wallet;

  // Map chainId to network name for backward compatibility
  const getNetworkFromChainId = (id: number | undefined) => {
    switch (id) {
      case 84532:
        return "base";
      case 137:
        return "polygon";
      case 42220:
        return "celo";
      case 10143:
        return "monad";
      default:
        // Default to CELO for Farcaster context, as it's the preferred chain
        return "celo";
    }
  };

  const network = getNetworkFromChainId(chainId || undefined);
  // Create type-safe network variables
  const isPolygonNetwork = network === "polygon";
  const isMonadNetwork = network === "monad";
  const isCeloNetwork = network === "celo";
  const isBaseNetwork = network === "base";

  // Check if this is a ThirdWeb network (Polygon, Monad, or Celo)
  const isThirdwebNetwork = isPolygonNetwork || isMonadNetwork || isCeloNetwork;

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
  let contractAddress = BASE_CONTRACT_ADDRESS;

  if (isPolygonNetwork) {
    contractAddress = POLYGON_CONTRACT_ADDRESS;
  } else if (isMonadNetwork) {
    contractAddress = MONAD_CONTRACT_ADDRESS;
  } else if (isCeloNetwork) {
    contractAddress = CELO_CONTRACT_ADDRESS;
  }

  // Ensure contract address is properly formatted as 0x-prefixed string
  const formattedContractAddress = contractAddress.startsWith("0x")
    ? (contractAddress as `0x${string}`)
    : (`0x${contractAddress}` as `0x${string}`);

  if (process.env.NODE_ENV !== "production") {
    console.log("Using contract address:", formattedContractAddress);
  }

  // Determine which ABI to use based on the network
  let contractABI = fitnessLeaderboardABI;

  if (isMonadNetwork) {
    contractABI = monadLeaderboardABI;
  } else if (isPolygonNetwork) {
    contractABI = polygonLeaderboardABI;
  } else if (isBaseNetwork) {
    contractABI = baseLeaderboardABI;
  } else if (isCeloNetwork) {
    contractABI = fitnessLeaderboardABI; // Already using the updated ABI
  }

  // Simulation hook
  const { error: simulateError } = useSimulateContract({
    address: formattedContractAddress,
    abi: contractABI,
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
      // Get the appropriate contract address based on the network
      let selectedContractAddress = BASE_CONTRACT_ADDRESS;
      let chainInfo = "Base Sepolia (84532)";

      if (isPolygonNetwork) {
        selectedContractAddress = POLYGON_CONTRACT_ADDRESS;
        chainInfo = "Polygon Mainnet (137)";
      } else if (isMonadNetwork) {
        selectedContractAddress = MONAD_CONTRACT_ADDRESS;
        chainInfo = "Monad Testnet (10143)";
      } else if (isCeloNetwork) {
        selectedContractAddress = CELO_CONTRACT_ADDRESS;
        chainInfo = "Celo Mainnet (42220)";
      }

      const formattedSelectedContractAddress =
        selectedContractAddress.toLowerCase();

      if (process.env.NODE_ENV !== "production") {
        console.log("Contract details:", {
          contract: selectedContractAddress,
          formattedContract: formattedSelectedContractAddress,
          function: "addScore",
          args: [pushups, squats],
          address: address,
          chain: chainInfo,
        });
      }
    }
  }, [
    useWagmi,
    address,
    pushups,
    squats,
    isPolygonNetwork,
    isMonadNetwork,
    isCeloNetwork,
  ]);

  // Write contract hook
  const { writeContract, isPending, data: txHash } = useWriteContract();

  // Since we treat submission as success, we don't need to wait for transaction confirmation
  // We only track if the transaction is being processed by the wallet

  // SIMPLIFIED APPROACH: Treat transaction submission as success
  useEffect(() => {
    // When we get a transaction hash, immediately treat it as success
    if (txHash) {
      console.log("✅ Transaction submitted successfully:", txHash);
      console.log(
        "Transaction explorer URL:",
        `https://sepolia-explorer.base.org/tx/${txHash}`
      );

      // Show immediate success message
      toast.success(
        <div>
          Score submitted! Check the leaderboard 🏆 <br />
          <a
            href={`https://sepolia-explorer.base.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "underline", color: "inherit" }}
          >
            View on explorer
          </a>
        </div>,
        { id: "submit-score", duration: 5000 }
      );

      // Track successful score submission
      if (user?.fid) {
        fetch("/api/analytics/engagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fid: user.fid,
            eventType: "score_submitted",
            metadata: {
              score: score || 0,
              exerciseType: exerciseType || "pushups",
              chain: "base",
              transactionHash: txHash,
            },
          }),
        }).catch((err) =>
          console.warn("Failed to track score submission:", err)
        );
      }

      // Reset UI state immediately since we consider submission as success
      setConfirmStep(false);
      setIsLoading(false);
    }
  }, [txHash, score, exerciseType, user?.fid]);

  // Since we now treat transaction submission as success, we don't need complex error handling
  // The transaction hash being generated means the transaction was successfully submitted

  // Since we treat submission as success, we don't need to wait for confirmation
  // The success handling is done immediately when txHash is received

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
      // For ThirdWeb networks (Polygon, Monad, Celo), use direct contract interaction
      // For Farcaster mini apps and Base network, we use Wagmi with proper connectors
      if (isThirdwebNetwork && !isFarcasterMiniApp()) {
        // Import the direct contract interaction function
        const { submitScoreDirectly } = await import(
          "@/utils/directContractInteraction"
        );

        // Get the appropriate contract address based on the network
        let contractAddress = POLYGON_CONTRACT_ADDRESS;
        if (network === "monad") {
          contractAddress = MONAD_CONTRACT_ADDRESS;
        } else if (network === "celo") {
          contractAddress = CELO_CONTRACT_ADDRESS;
        }

        // Show loading toast
        toast.loading("Preparing transaction with wallet...", {
          id: "submit-score",
        });

        // Use direct contract interaction for ThirdWeb networks only
        const result = await submitScoreDirectly(
          contractAddress,
          pushups,
          squats,
          false, // Not Base network in this path
          address
        );

        if (result.success) {
          // Don't show duplicate success toast - directContractInteraction already shows one
          console.log(
            "✅ Direct contract interaction succeeded:",
            result.transactionHash
          );

          // Store transaction hash for social sharing
          if (typeof window !== "undefined" && result.transactionHash) {
            window.transactionHash = result.transactionHash;
            window.selectedNetworkName =
              network === "polygon"
                ? "Polygon Mainnet"
                : network === "monad"
                ? "Monad Testnet"
                : network === "celo"
                ? "Celo Mainnet"
                : network === "base"
                ? "Base Sepolia"
                : "Unknown";
          }
        } else {
          throw new Error(result.error || "Transaction failed");
        }

        // CRITICAL FIX: Reset loading state immediately for Farcaster
        setIsLoading(false);
        setConfirmStep(false);
        return;
      }

      // For Base network and Farcaster mini apps, use Wagmi with appropriate connectors
      if (process.env.NODE_ENV !== "production") {
        console.log("Submitting transaction via Wagmi:", {
          address: contractAddress,
          formattedAddress: formattedContractAddress,
          function: "addScore",
          args: [pushups, squats],
        });
      }

      // Show pending toast
      toast.loading("Preparing transaction with wallet...", {
        id: "submit-score",
      });

      // Create a transaction object with the correct format
      const txRequest = {
        address: formattedContractAddress,
        abi: contractABI, // Use the network-specific ABI
        functionName: "addScore",
        args: [pushupsBI, squatsBI],
        chainId: 84532, // Explicitly set Base Sepolia chain ID
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
      const addScoreAbi = contractABI.find(
        (item) => item.name === "addScore" && item.type === "function"
      );

      if (process.env.NODE_ENV !== "production") {
        console.log("addScore ABI item:", addScoreAbi);
      }

      if (!addScoreAbi) {
        throw new Error("Could not find addScore function in ABI");
      }

      // Standard transaction flow - same as all other chains
      console.log("Using standard transaction flow");
      writeContract({
        address: formattedContractAddress,
        abi: contractABI, // Use the network-specific ABI
        functionName: "addScore",
        args: [pushupsBI, squatsBI],
        chainId: 84532, // Explicitly set Base Sepolia chain ID
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
      disabled={isPending || isLoading}
      className={`${
        confirmStep
          ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          : isPolygonNetwork
          ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
          : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
      } text-white font-bold py-4 px-6 rounded-md transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg w-full flex items-center justify-center text-xl border-4 border-white z-50 relative`}
    >
      {isPending || isLoading ? (
        <>
          <span className="mr-2 text-2xl font-extrabold">SUBMITTING...</span>
          <Spinner />
        </>
      ) : confirmStep ? (
        <div className="flex flex-col items-center">
          <span
            style={{ textShadow: "0px 0px 8px rgba(255,255,255,0.8)" }}
            className="text-2xl font-extrabold"
          >
            🔥 CONFIRM SUBMISSION 🔥
          </span>
          <div className="flex items-center mt-1 bg-black/30 px-3 py-1 rounded-full">
            <span className="text-xs text-gray-300">
              {isPolygonNetwork ? (
                <>
                  <span className="inline-block w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
                  Polygon Mainnet
                </>
              ) : isCeloNetwork ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                  Celo Mainnet
                </>
              ) : isMonadNetwork ? (
                <>
                  <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                  Monad Testnet
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
                  Base Sepolia
                </>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <span
            style={{ textShadow: "0px 0px 8px rgba(255,255,255,0.8)" }}
            className="text-2xl font-extrabold"
          >
            🏆 SUBMIT SCORE 🏆
          </span>
          <div className="flex items-center mt-1 bg-black/30 px-3 py-1 rounded-full">
            <span className="text-xs text-gray-300">
              {isPolygonNetwork ? (
                <>
                  <span className="inline-block w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
                  Polygon Mainnet
                </>
              ) : isCeloNetwork ? (
                <>
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                  Celo Mainnet
                </>
              ) : isMonadNetwork ? (
                <>
                  <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                  Monad Testnet
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
                  Base Sepolia
                </>
              )}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

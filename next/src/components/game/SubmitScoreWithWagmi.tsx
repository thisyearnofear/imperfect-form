"use client";

import React, { useState, useEffect } from "react";
import { chainConfigs, SupportedChain } from "@/utils/chainSwitching";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAccount, useWriteContract, useSimulateContract } from "wagmi";
import {
  isFirstTimeDivviUser,
  registerDivviReferral,
  showEnhancedFeaturesPrompt,
} from "@/utils/divviIntegration";
import {
  BASE_CONTRACT_ADDRESS,
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
  setSubmissionStatus: (
    status: "idle" | "submitting" | "success" | "error"
  ) => void;
}

// Component that handles score submission using Wagmi for direct contract interactions
export default function SubmitScoreWithWagmi({
  score,
  exerciseType,
  forceDirectSubmission = false,
  walletAddress,
  setSubmissionStatus,
}: SubmitScoreProps) {
  const [confirmStep, setConfirmStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address: wagmiAddress } = useAccount();
  const { wallet, user } = usePlatform();
  const { chainId } = wallet;

  // Get the network configuration from the centralized chainConfigs
  const getNetworkConfig = (id: number | undefined) => {
    if (!id) return null; // Return null if chainId is not available
    for (const key in chainConfigs) {
      if (chainConfigs[key as SupportedChain].id === id) {
        return {
          network: key as SupportedChain,
          ...chainConfigs[key as SupportedChain],
        };
      }
    }
    return null; // Return null if no matching network is found
  };

  const networkConfig = getNetworkConfig(chainId ?? undefined);

  // Use the wallet address prop if provided, otherwise fall back to the wagmi address
  const address = walletAddress || wagmiAddress;

  // Use wagmi hooks for all chains with a connected wallet
  const useWagmi = Boolean(address);

  // Reduce console log verbosity
  if (process.env.NODE_ENV !== "production") {
    console.log("Submission config:", {
      network: networkConfig?.network,
      address,
      useWagmi,
      contractAddress: networkConfig?.contractAddress,
      forceDirectSubmissionProp: forceDirectSubmission,
    });
  }

  // Calculate the pushups and squats values and ensure they're BigInt for contract submission
  const pushups = exerciseType === "pushups" ? score || 0 : 0;
  const squats = exerciseType === "squats" ? score || 0 : 0;
  // Convert to BigInt for contract submission
  const pushupsBI = BigInt(pushups);
  const squatsBI = BigInt(squats);

  // Get contract address and ABI from the network configuration
  const contractAddress = networkConfig?.contractAddress;
  const contractABI = networkConfig?.abi;

  // Ensure contract address is properly formatted as 0x-prefixed string
  const formattedContractAddress = contractAddress
    ? contractAddress.startsWith("0x")
      ? (contractAddress as `0x${string}`)
      : (`0x${contractAddress}` as `0x${string}`)
    : undefined;

  if (process.env.NODE_ENV !== "production") {
    console.log("Using contract address:", formattedContractAddress);
  }

  // Simulation hook
  const { error: simulateError } = useSimulateContract({
    address: formattedContractAddress,
    abi: contractABI,
    functionName: "addScore",
    args: [pushupsBI, squatsBI],
    query: {
      enabled: useWagmi && Boolean(address) && Boolean(networkConfig),
    },
  });

  // Debug contract details and verify contract address format
  useEffect(() => {
    if (useWagmi && address && networkConfig) {
      if (process.env.NODE_ENV !== "production") {
        console.log("Contract details:", {
          contract: networkConfig.contractAddress,
          function: "addScore",
          args: [pushups, squats],
          address: address,
          chain: `${networkConfig.name} (${networkConfig.id})`,
        });
      }
    }
  }, [useWagmi, address, pushups, squats, networkConfig]);

  // Write contract hook
  const {
    writeContract,
    isPending,
    data: txHash,
    error: writeError,
  } = useWriteContract();

  // Debug the write contract states
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("WriteContract states:", {
        isPending,
        txHash,
        writeError: writeError?.message,
        network: networkConfig?.network,
      });
    }
  }, [isPending, txHash, writeError, networkConfig]);

  // SIMPLIFIED APPROACH: Treat transaction submission as success
  useEffect(() => {
    // When we get a transaction hash, immediately treat it as success
    if (txHash && networkConfig) {
      // Handle Divvi registration for first-time users
      const handleDivviRegistration = async () => {
        if (!address) return;

        const currentChainId = networkConfig.id;

        // Only register for supported networks (Polygon, Celo, Base)
        if (
          currentChainId === 137 ||
          currentChainId === 42220 ||
          currentChainId === 8453
        ) {
          try {
            const isFirstTime = await isFirstTimeDivviUser(
              address,
              currentChainId
            );
            if (isFirstTime) {
              console.log(
                `First-time Divvi user detected on chain ${currentChainId}, registering referral`
              );
              await registerDivviReferral(txHash, currentChainId, address);
            }
          } catch (divviError) {
            console.error("Error with Divvi registration:", divviError);
            // Don't fail the transaction if Divvi registration fails
          }
        }
      };

      handleDivviRegistration();
      // Get the correct explorer URL from the network configuration
      const explorerUrl = `${networkConfig.blockExplorerUrls[0]}tx/${txHash}`;
      const networkName = networkConfig.name;

      console.log("✅ Transaction submitted successfully:", txHash);
      console.log("Transaction explorer URL:", explorerUrl);

      // Show immediate success message with correct explorer
      toast.success(
        <div>
          Score submitted on {networkName}! Check the leaderboard 🏆 <br />
          <a
            href={explorerUrl}
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
              chain: networkConfig.network,
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
      setSubmissionStatus("success");
    }
  }, [
    txHash,
    score,
    exerciseType,
    user?.fid,
    networkConfig,
    address,
    setSubmissionStatus,
  ]);

  // Handle button click to trigger transaction
  const handleSubmit = async () => {
    // Don't do anything if there's no address or network config
    if (!address || !networkConfig) {
      toast.error("Please connect your wallet and select a supported network.");
      return;
    }

    // Check if score is zero - prevent submission of zero scores
    if (pushups === 0 && squats === 0) {
      toast.error(
        "Cannot submit a score of zero. Please complete some exercises first!"
      );
      return;
    }

    // Check for first-time Divvi user and show prompt if needed
    const currentChainId = networkConfig.id;

    // Only check for supported networks (Polygon, Celo, Base)
    if (
      currentChainId === 137 ||
      currentChainId === 42220 ||
      currentChainId === 8453
    ) {
      try {
        const isFirstTime = await isFirstTimeDivviUser(address, currentChainId);
        if (isFirstTime) {
          console.log(
            `First-time Divvi user detected on chain ${currentChainId}`
          );
          await showEnhancedFeaturesPrompt();
        }
      } catch (divviError) {
        console.error("Error checking Divvi status:", divviError);
        // Continue with transaction even if Divvi check fails
      }
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
    setSubmissionStatus("submitting");

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
        setSubmissionStatus("error");
        return;
      }
    }

    try {
      // SIMPLIFIED APPROACH: Use Wagmi for all chains
      // This is more reliable and consistent across all networks
      console.log(
        "Using Wagmi for transaction submission on",
        networkConfig.network
      );

      // Use Wagmi for all networks - more reliable and consistent
      if (process.env.NODE_ENV !== "production") {
        console.log("Submitting transaction via Wagmi:", {
          address: networkConfig.contractAddress,
          formattedAddress: formattedContractAddress,
          function: "addScore",
          args: [pushups, squats],
        });
      }

      // Show pending toast
      toast.loading("Preparing transaction with wallet...", {
        id: "submit-score",
      });

      // Get the appropriate chain ID based on the network
      const currentChainId = networkConfig.id;

      // Create a transaction object with the correct format
      const txRequest = {
        address: formattedContractAddress!,
        abi: networkConfig.abi, // Use the network-specific ABI
        functionName: "addScore",
        args: [pushupsBI, squatsBI],
        chainId: currentChainId, // Use the current network's chain ID
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
      const addScoreAbi = (
        contractABI as { name: string; type: string }[]
      )?.find((item) => item.name === "addScore" && item.type === "function");

      if (process.env.NODE_ENV !== "production") {
        console.log("addScore ABI item:", addScoreAbi);
      }

      if (!addScoreAbi) {
        throw new Error("Could not find addScore function in ABI");
      }

      // Standard transaction flow - same as all other chains
      console.log("Using standard transaction flow");

      try {
        writeContract({
          address: formattedContractAddress!,
          abi: networkConfig.abi, // Use the network-specific ABI
          functionName: "addScore",
          args: [pushupsBI, squatsBI],
          chainId: currentChainId, // Use the current network's chain ID
        });

        if (process.env.NODE_ENV !== "production") {
          console.log(
            "writeContract call completed - transaction sent to wallet"
          );
        }
      } catch (writeError) {
        console.error("Error in writeContract call:", writeError);
        throw writeError;
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
      setSubmissionStatus("error");
    }
  };

  return (
    <button
      id="submitScoreButton"
      onClick={handleSubmit}
      disabled={isPending || isLoading || !networkConfig}
      className={`${
        !networkConfig
          ? "bg-gray-500 cursor-not-allowed"
          : confirmStep
          ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          : networkConfig.network === "polygon"
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
            CONFIRM & SEND
          </span>
          <div className="flex items-center mt-1 bg-black/30 px-3 py-1 rounded-full">
            <span className="text-xs text-gray-300">
              {networkConfig ? (
                <>
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      networkConfig.network === "polygon"
                        ? "bg-purple-400"
                        : networkConfig.network === "celo"
                        ? "bg-green-400"
                        : networkConfig.network === "monad"
                        ? "bg-yellow-400"
                        : "bg-blue-400"
                    }`}
                  ></span>
                  {networkConfig.name}
                </>
              ) : (
                "Unsupported Network"
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
            SUBMIT SCORE
          </span>
          <div className="flex items-center mt-1 bg-black/30 px-3 py-1 rounded-full">
            <span className="text-xs text-gray-300">
              {networkConfig ? (
                <>
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      networkConfig.network === "polygon"
                        ? "bg-purple-400"
                        : networkConfig.network === "celo"
                        ? "bg-green-400"
                        : networkConfig.network === "monad"
                        ? "bg-yellow-400"
                        : "bg-blue-400"
                    }`}
                  ></span>
                  {networkConfig.name}
                </>
              ) : (
                "Unsupported Network"
              )}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}

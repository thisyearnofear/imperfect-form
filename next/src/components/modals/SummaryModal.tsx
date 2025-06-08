"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui";
import { usePlatform } from "@/contexts/PlatformContext";
import { UniversalConnectButton } from "@/components/wallet";
import { FarcasterShare } from "@/components/social";
import SubmitScoreWithWagmi from "@/components/game/SubmitScoreWithWagmi";
import { submitScoreDirectly } from "@/utils/directContractInteraction";
import {
  POLYGON_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
} from "@/constants/contracts";
import toast from "react-hot-toast";
import { AddMiniAppButton } from "@/components/miniapp/AddMiniAppButton";

// Initialize window properties if they don't exist
if (typeof window !== "undefined") {
  if (window.transactionHash === undefined) {
    window.transactionHash = "";
  }
  if (window.selectedNetworkName === undefined) {
    window.selectedNetworkName = "";
  }
}

export interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  repCount: number;
  timeLeft: number;
  mode?: "pushups" | "squats";
  address?: string; // Optional wallet address
}

const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  repCount,
  timeLeft,
  mode = "pushups",
  address,
}) => {
  const { platform, wallet } = usePlatform();
  const { address: walletAddress, chainId } = wallet;
  const isInMiniApp = platform === "farcaster";

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
        return "base";
    }
  };

  const network = getNetworkFromChainId(chainId || undefined);

  // Type assertion to help TypeScript understand the network type
  const networkType = network as "polygon" | "base" | "monad" | "celo";

  // Use the address from props if provided, otherwise fall back to wallet address from context
  const effectiveAddress = address || walletAddress;
  const [useSpendLimits, setUseSpendLimits] = useState(false);
  const [showDirectSubmit, setShowDirectSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to get the actual ethereum provider from unified context
  const getEthereumProvider = async () => {
    if (platform === "farcaster") {
      // For Farcaster, use the provider from the unified context
      try {
        const { sdk } = await import("@farcaster/frame-sdk");
        if (sdk.wallet?.ethProvider) {
          console.log(
            "Using Farcaster SDK ethereum provider from unified context"
          );
          return sdk.wallet.ethProvider;
        }
      } catch (error) {
        console.warn("Failed to get Farcaster SDK provider:", error);
      }
    }

    // Fallback to window.ethereum
    if (
      typeof window !== "undefined" &&
      (window as unknown as { ethereum?: unknown }).ethereum
    ) {
      console.log("Using window.ethereum provider");
      return (window as unknown as { ethereum: unknown }).ethereum;
    }

    console.warn("No ethereum provider found");
    return null;
  };

  // Debug logging for mobile wallet issues
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.log("SummaryModal Debug Info:", {
        network: networkType,
        addressFromProps: address,
        walletAddress,
        effectiveAddress,
        isOpen,
        platform,
        walletProvider: wallet.provider,
        walletIsConnected: wallet.isConnected,
        walletChainId: wallet.chainId,
        isInMiniApp,
      });
    }
  }, [
    networkType,
    address,
    walletAddress,
    effectiveAddress,
    isOpen,
    platform,
    wallet.provider,
    wallet.isConnected,
    wallet.chainId,
    isInMiniApp,
  ]);

  // Function to handle ThirdWeb submission for Polygon network
  const handleThirdwebSubmission = async () => {
    if (!effectiveAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Check if score is zero - prevent submission of zero scores
    if (repCount === 0) {
      toast.error(
        "Cannot submit a score of zero. Please complete some exercises first!"
      );
      return;
    }

    // Only proceed if we're on a network supported by ThirdWeb
    if (
      networkType !== "polygon" &&
      networkType !== "monad" &&
      networkType !== "celo"
    ) {
      toast.error(
        "ThirdWeb wallet can only be used with Polygon, Monad, or Celo networks"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine pushups or squats based on mode
      const pushups = mode === "pushups" ? repCount : 0;
      const squats = mode === "squats" ? repCount : 0;

      toast.loading("Preparing transaction...", {
        id: "submit-score",
      });

      // Get the appropriate contract address based on the network
      let contractAddress = POLYGON_CONTRACT_ADDRESS;
      if (networkType === "monad") {
        contractAddress = MONAD_CONTRACT_ADDRESS;
      } else if (networkType === "celo") {
        contractAddress = CELO_CONTRACT_ADDRESS;
      }

      // Get the ethereum provider from the unified context
      const ethereumProvider = await getEthereumProvider();

      console.log("SummaryModal submission debug:", {
        platform,
        effectiveAddress,
        networkType,
        contractAddress,
        hasEthereumProvider: !!ethereumProvider,
        providerType: ethereumProvider?.constructor?.name || "unknown",
      });

      // Use direct contract interaction for ThirdWeb
      const result = await submitScoreDirectly(
        contractAddress,
        pushups,
        squats,
        false, // not Base network
        effectiveAddress,
        false, // skipSubAccountCheck
        ethereumProvider // Pass the provider from unified context
      );

      if (result.success) {
        // Store transaction hash for social sharing
        if (typeof window !== "undefined" && result.transactionHash) {
          window.transactionHash = result.transactionHash;

          // Set the appropriate network name
          if (networkType === "polygon") {
            window.selectedNetworkName = "Polygon Amoy";
          } else if (networkType === "monad") {
            window.selectedNetworkName = "Monad Testnet";
          } else if (networkType === "celo") {
            window.selectedNetworkName = "Celo Mainnet";
          }
        }

        // Get the appropriate explorer URL based on the network
        let explorerUrl;
        if (networkType === "polygon") {
          explorerUrl = `https://polygonscan.com/tx/${result.transactionHash}`;
        } else if (networkType === "monad") {
          explorerUrl = `https://testnet.monadexplorer.com/tx/${result.transactionHash}`;
        } else if (networkType === "celo") {
          explorerUrl = `https://explorer.celo.org/mainnet/tx/${result.transactionHash}`;
        }

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
      } else {
        toast.error(result.error || "Failed to submit score", {
          id: "submit-score",
        });
      }
    } catch (error) {
      console.error("Error submitting with ThirdWeb:", error);
      toast.error("Error submitting transaction. Please try again.", {
        id: "submit-score",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Network switching is no longer supported in the summary modal
  // This prevents wallet compatibility issues

  if (!isOpen) return null;

  // Format exercise time to handle durations over 2 minutes correctly
  const formatExerciseTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return minutes === 1 ? `1 minute` : `${minutes} minutes`;
      } else {
        return `${minutes} min ${remainingSeconds} sec`;
      }
    }
  };

  // Determine the medal based on rep count
  const getMedalEmoji = () => {
    if (mode === "pushups") {
      if (repCount >= 30) return "🥇";
      else if (repCount >= 20) return "🥈";
      else if (repCount >= 10) return "🥉";
    } else {
      if (repCount >= 40) return "🥇";
      else if (repCount >= 25) return "🥈";
      else if (repCount >= 15) return "🥉";
    }
    return "💪";
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Record Your Score"
      description={`${getMedalEmoji()} You completed ${repCount} ${mode} in ${
        120 - timeLeft
      } seconds!`}
      preventClose={false}
    >
      <div className="space-y-6">
        {/* Network Info - Simplified */}
        <div className="border-b border-gray-700 pb-2">
          <div className="text-center">
            <p className="text-sm">
              Network:{" "}
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                  networkType === "polygon"
                    ? "bg-purple-900/50 text-purple-300"
                    : networkType === "monad"
                    ? "bg-yellow-900/50 text-yellow-300"
                    : networkType === "celo"
                    ? "bg-green-900/50 text-green-300"
                    : "bg-blue-900/50 text-blue-300"
                }`}
              >
                {networkType === "polygon"
                  ? "Polygon Amoy"
                  : networkType === "monad"
                  ? "Monad Testnet"
                  : networkType === "celo"
                  ? "Celo Mainnet"
                  : "Base Sepolia"}
              </span>
            </p>
          </div>
        </div>

        {/* Wallet Connection */}
        {!effectiveAddress ? (
          <div className="text-center py-2">
            <p className="mb-2 text-sm">Connect your wallet to submit:</p>
            <UniversalConnectButton size="lg" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Smart Wallet submission options */}
            {chainId === 84532 &&
              networkType === "base" &&
              !showDirectSubmit && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
                  <h3 className="font-bold mb-2 text-blue-800">
                    Submission Options
                  </h3>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setShowDirectSubmit(true);
                        setUseSpendLimits(false);
                      }}
                      className="px-4 py-3 rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700 flex-1 flex flex-col items-center"
                    >
                      <span className="font-bold">Standard</span>
                      <span className="text-xs text-blue-200">
                        Sign each transaction
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDirectSubmit(true);
                        setUseSpendLimits(true);
                      }}
                      className="px-4 py-3 rounded-md transition-colors bg-green-600 text-white hover:bg-green-700 flex-1 flex flex-col items-center"
                    >
                      <span className="font-bold">One-Click</span>
                      <span className="text-xs text-green-200">
                        No signatures needed
                      </span>
                    </button>
                  </div>
                </div>
              )}

            {/* One-click info when using spend limits */}
            {chainId === 84532 &&
              networkType === "base" &&
              showDirectSubmit &&
              useSpendLimits && (
                <div className="mb-2 p-2 bg-green-100 rounded-md">
                  <p className="text-xs text-green-800 text-center">
                    One-click submission is ready! No signatures needed.
                  </p>
                </div>
              )}

            {/* Submit Score component */}
            {(chainId !== 84532 ||
              networkType !== "base" ||
              showDirectSubmit) && (
              <div className="rounded-md p-3">
                <h3 className="text-center font-bold mb-2 text-white">
                  Submit Your Score
                </h3>

                {/* Use different submission methods based on network */}
                {networkType === "polygon" ||
                networkType === "monad" ||
                networkType === "celo" ? (
                  <button
                    id="submitScoreButton"
                    onClick={handleThirdwebSubmission}
                    disabled={isSubmitting}
                    className={`text-white font-bold py-3 px-4 rounded-md w-full flex items-center justify-center transition-all transform hover:scale-[1.02] ${
                      networkType === "polygon"
                        ? "bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                        : networkType === "monad"
                        ? "bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                        : networkType === "celo"
                        ? "bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 shadow-[0_0_10px_rgba(74,222,128,0.3)]"
                        : "bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-500 hover:to-cyan-600 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="mr-2">Submitting...</span>
                        <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                      </>
                    ) : (
                      <span className="font-bold">Submit Score</span>
                    )}
                  </button>
                ) : (
                  <SubmitScoreWithWagmi
                    score={repCount}
                    exerciseType={mode}
                    forceDirectSubmission={true}
                    walletAddress={effectiveAddress}
                    useSpendLimits={useSpendLimits} // Pass the flag to control transaction flow
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Social sharing buttons */}
        {window.transactionHash && (
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-center text-gray-400 mb-2">
              Share your achievement:
            </p>
            <div className="flex flex-col items-center space-y-4">
              {/* Enhanced Farcaster integration */}
              <FarcasterShare
                reps={repCount}
                exerciseMode={mode}
                timeSpent={formatExerciseTime(120 - timeLeft)} // Calculate elapsed time: 120 seconds (2 min) - timeLeft
                network={networkType} // Pass the direct network type (polygon, base, celo, monad)
              />

              {/* Twitter sharing */}
              <button
                className="twitter-button transition-all transform hover:scale-105"
                onClick={() => {
                  const text = `I just completed ${repCount} ${mode} in the Onchain Olympics! 💪`;
                  const url = `https://imperfect-form.vercel.app?ref=twitter`;
                  const hashtags = ["OnchainOlympics", "FitnessOnchain"];
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      text
                    )}&url=${encodeURIComponent(url)}&hashtags=${hashtags.join(
                      ","
                    )}`,
                    "_blank"
                  );
                }}
              >
                Twitter
              </button>
            </div>
          </div>
        )}

        {/* Add Mini App prompt - show after successful workout in Farcaster */}
        {isInMiniApp && repCount > 0 && (
          <div className="border-t border-gray-700 pt-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-purple-300 font-medium">
                🎯 Great workout! Save this app for quick access
              </p>
              <AddMiniAppButton
                variant="secondary"
                showAfterWorkout={true}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default SummaryModal;

"use client";

import React from "react";
import { chainConfigs, SupportedChain } from "@/utils/chainSwitching";
import { Dialog } from "@/components/ui";
import { usePlatform } from "@/contexts/PlatformContext";
import { UniversalConnectButton } from "@/components/wallet";
import FarcasterShare from "@/components/social/FarcasterShare";
import SubmitScoreWithWagmi from "@/components/game/SubmitScoreWithWagmi";
// Removed unused imports - now using unified Wagmi submission
// Removed unused toast import
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
  const { platform, wallet, user } = usePlatform();
  const { address: walletAddress, chainId } = wallet;
  const isInMiniApp = platform === "farcaster";

  // Map chainId to network name using centralized config
  const getNetworkFromChainId = (id: number | undefined) => {
    if (!id) return "base"; // Default to base if unknown
    for (const [key, config] of Object.entries(chainConfigs)) {
      if (config.id === id) {
        return key;
      }
    }
    return "base"; // Default to base if unknown
  };

  const network = getNetworkFromChainId(chainId || undefined);

  // Type assertion to help TypeScript understand the network type
  const networkType = network as "polygon" | "base" | "monad" | "celo";

  // Use the address from props if provided, otherwise fall back to wallet address from context
  const effectiveAddress = address || walletAddress;
  // Removed unused isSubmitting state - now using unified Wagmi submission

  // Removed unused getEthereumProvider function - now using unified Wagmi submission

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

  // Removed handleThirdwebSubmission - now using unified Wagmi submission

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
      description={`${getMedalEmoji()} You aced ${repCount} ${mode} in ${
        120 - timeLeft
      } secs!`}
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
                  ? chainConfigs[SupportedChain.POLYGON].name
                  : networkType === "monad"
                  ? chainConfigs[SupportedChain.MONAD].name
                  : networkType === "celo"
                  ? chainConfigs[SupportedChain.CELO].name
                  : chainConfigs[SupportedChain.BASE].name}
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
            {/* Submit Score component */}
            <div className="rounded-md p-3">
              <h3 className="text-center font-bold mb-2 text-white">
                Submit Your Score
              </h3>

              {/* Use unified Wagmi-based submission for all networks */}
              <SubmitScoreWithWagmi
                score={repCount}
                exerciseType={mode}
                forceDirectSubmission={true}
                walletAddress={effectiveAddress}
              />
            </div>
          </div>
        )}

        {/* Social sharing buttons - Enhanced for mini app context */}
        {window.transactionHash && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex flex-col items-center space-y-4">
              {/* Enhanced Farcaster integration */}
              <FarcasterShare
                reps={repCount}
                exerciseMode={mode}
                timeSpent={formatExerciseTime(120 - timeLeft)} // Calculate elapsed time: 120 seconds (2 min) - timeLeft
                network={networkType} // Pass the direct network type (polygon, base, celo, monad)
                isInMiniApp={isInMiniApp}
                user={user}
              />

              {/* Twitter sharing - only show outside mini app context */}
              {!isInMiniApp && (
                <button
                  className="twitter-button transition-all transform hover:scale-105"
                  onClick={() => {
                    const text = `I just completed ${repCount} ${mode} in the Onchain Olympics! 💪`;
                    const url = `https://imperfect-form.vercel.app?ref=twitter`;
                    const hashtags = ["OnchainOlympics", "FitnessOnchain"];
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        text
                      )}&url=${encodeURIComponent(
                        url
                      )}&hashtags=${hashtags.join(",")}`,
                      "_blank"
                    );
                  }}
                >
                  Twitter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add Mini App prompt - show after successful workout in Farcaster only */}
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

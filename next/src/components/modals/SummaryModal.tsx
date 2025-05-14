"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui";
import { useNetwork } from "@/contexts/NetworkContext";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import { ConnectWallet } from "@/components/wallet";
import SubmitScoreWithWagmi from "@/components/game/SubmitScoreWithWagmi";
import { submitScoreDirectly } from "@/utils/directContractInteraction";
import { POLYGON_CONTRACT_ADDRESS } from "@/constants/contracts";
import toast from "react-hot-toast";

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
  const { network } = useNetwork();
  const { walletProvider, userAddress } = useWalletProvider();

  // Type assertion to help TypeScript understand the network type
  const networkType = network as "polygon" | "base";

  // Use the address from props if provided, otherwise fall back to userAddress from context
  const effectiveAddress = address || userAddress;
  const [useSpendLimits, setUseSpendLimits] = useState(false);
  const [showDirectSubmit, setShowDirectSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Only proceed if we're on Polygon network
    if (networkType !== "polygon") {
      toast.error("ThirdWeb wallet can only be used with Polygon network");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine pushups or squats based on mode
      const pushups = mode === "pushups" ? repCount : 0;
      const squats = mode === "squats" ? repCount : 0;

      toast.loading("Preparing transaction with ThirdWeb wallet...", {
        id: "submit-score",
      });

      // Use direct contract interaction for ThirdWeb
      const result = await submitScoreDirectly(
        POLYGON_CONTRACT_ADDRESS,
        pushups,
        squats,
        false, // not Base network
        effectiveAddress
      );

      if (result.success) {
        // Store transaction hash for social sharing
        if (typeof window !== "undefined" && result.transactionHash) {
          window.transactionHash = result.transactionHash;
          window.selectedNetworkName = "Polygon Amoy";
        }

        // Show success message with explorer link
        const explorerUrl = `https://amoy.polygonscan.com/tx/${result.transactionHash}`;

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
              Network: <span className="font-bold">{networkType === "polygon" ? "Polygon Amoy" : "Base Sepolia"}</span>
            </p>
          </div>
        </div>

        {/* Wallet Connection */}
        {!effectiveAddress ? (
          <div className="text-center py-2">
            <p className="mb-2 text-sm">Connect your wallet to submit:</p>
            <ConnectWallet />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Smart Wallet submission options */}
            {walletProvider === "smart" &&
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
            {walletProvider === "smart" &&
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
            {(!walletProvider ||
              walletProvider !== "smart" ||
              networkType !== "base" ||
              showDirectSubmit) && (
              <div className="rounded-md p-3">
                <h3 className="text-center font-bold mb-2 text-white">
                  Submit Your Score
                </h3>

                {/* Use different submission methods based on network */}
                {networkType === "polygon" ? (
                  <button
                    id="submitScoreButton"
                    onClick={handleThirdwebSubmission}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md w-full flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="mr-2">Submitting...</span>
                        <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                      </>
                    ) : (
                      <span className="font-bold">
                        Submit Score
                      </span>
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

        {/* Social sharing buttons - Simplified */}
        {window.transactionHash && (
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-center text-gray-400 mb-2">Share your achievement:</p>
            <div className="flex justify-center space-x-4">
              <button
                className="farcaster-button"
                onClick={() => {
                  const text = `I just completed ${repCount} ${mode} in the Onchain Olympics! 💪`;
                  const url = `https://imperfect-form.vercel.app?ref=farcaster`;
                  window.open(
                    `https://warpcast.com/~/compose?text=${encodeURIComponent(text + " " + url)}`,
                    "_blank"
                  );
                }}
              >
                Farcaster
              </button>
              <button
                className="twitter-button"
                onClick={() => {
                  const text = `I just completed ${repCount} ${mode} in the Onchain Olympics! 💪`;
                  const url = `https://imperfect-form.vercel.app?ref=twitter`;
                  const hashtags = ["OnchainOlympics", "FitnessOnchain"];
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags.join(",")}`,
                    "_blank"
                  );
                }}
              >
                Twitter
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default SummaryModal;

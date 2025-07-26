"use client";

import React, { useState } from "react";
import { Spinner } from "@/components/ui";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAccount, useWriteContract } from "wagmi";
import {
  submitScore,
  showSubmissionResult,
  canUserSubmit,
  type SubmissionParams,
} from "@/utils/unifiedSubmission";
import { getEthereumProvider } from "@/utils/farcasterMiniApp";

interface SubmitScoreProps {
  score?: number;
  exerciseType?: "pushups" | "squats";
  forceDirectSubmission?: boolean;
  walletAddress?: string;
  setSubmissionStatus: (
    status: "idle" | "submitting" | "success" | "error"
  ) => void;
}

// Clean, unified score submission component
export default function SubmitScoreWithWagmi({
  score,
  exerciseType = "pushups",
  forceDirectSubmission = false,
  walletAddress,
  setSubmissionStatus,
}: SubmitScoreProps) {
  const [confirmStep, setConfirmStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address: wagmiAddress } = useAccount();
  const { wallet } = usePlatform();
  const { chainId } = wallet;
  const { writeContract } = useWriteContract();

  // Get current user address
  const address = wagmiAddress || walletAddress;

  // Unified submission handler
  const handleSubmit = async () => {
    if (!address || !chainId || !score) {
      setSubmissionStatus("error");
      showSubmissionResult({
        success: false,
        error: "Missing required parameters",
        processingType: "direct",
      });
      return;
    }

    setIsLoading(true);
    setSubmissionStatus("submitting");

    try {
      // Check if user can submit
      const canSubmitResult = await canUserSubmit(address, chainId);
      if (!canSubmitResult.canSubmit) {
        throw new Error(canSubmitResult.reason || "Cannot submit");
      }

      // Get the appropriate Ethereum provider (handles Farcaster Mini App detection)
      const ethereumProvider = await getEthereumProvider();

      // Prepare submission parameters
      const submissionParams: SubmissionParams = {
        score: score,
        exerciseType: exerciseType,
        userAddress: address,
        chainId: chainId,
        provider: ethereumProvider, // Use proper provider detection
        useWagmi: !forceDirectSubmission,
        wagmiWriteContract: writeContract,
      };

      // Submit using unified logic
      const result = await submitScore(submissionParams);

      if (result.success) {
        setSubmissionStatus("success");
      } else {
        setSubmissionStatus("error");
      }

      showSubmissionResult(result);
    } catch (error) {
      console.error("Submission error:", error);
      setSubmissionStatus("error");
      showSubmissionResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processingType: "direct",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if no score or address
  if (!score || !address) {
    return null;
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {!confirmStep ? (
        <button
          onClick={() => setConfirmStep(true)}
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Submit Score ({score} {exerciseType})
        </button>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              Confirm Submission
            </p>
            <p className="text-gray-200">
              Submit {score} {exerciseType} to the leaderboard?
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading && <Spinner />}
              <span>{isLoading ? "Submitting..." : "Confirm"}</span>
            </button>

            <button
              onClick={() => {
                setConfirmStep(false);
                setIsLoading(false);
                setSubmissionStatus("idle");
              }}
              disabled={isLoading}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

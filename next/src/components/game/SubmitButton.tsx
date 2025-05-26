"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNetwork } from "@/contexts/NetworkContext";
import { useAccount as useWagmiAccount, useWriteContract } from "wagmi";

import { Spinner } from "@/components/ui";
import {
  POLYGON_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
  fitnessLeaderboardABI,
} from "@/constants/contracts";
import {
  submitScoreDirectly,
  canUserSubmit,
} from "@/utils/directContractInteraction";

interface SubmitButtonProps {
  score?: number;
  exerciseType?: "pushups" | "squats";
  thirdwebAddress?: string;
}

export default function SubmitButton({
  score = 0,
  exerciseType = "pushups",
  thirdwebAddress,
}: SubmitButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  // Get network from context
  const { network } = useNetwork();

  // For Wagmi (Base), we can always call this hook
  const wagmiAccount = useWagmiAccount();

  // Log wallet and network state but don't force changes
  useEffect(() => {
    // Just log the current state without forcing changes
    if (thirdwebAddress) {
      console.log(`ThirdWeb wallet is connected with network: ${network}`);

      // Store the wallet type in localStorage for persistence
      localStorage.setItem("selectedWalletProvider", "signature");
    } else if (wagmiAccount?.address) {
      console.log(`Wagmi wallet is connected with network: ${network}`);

      // Store the wallet type in localStorage for persistence
      localStorage.setItem("selectedWalletProvider", "smart");
    }
  }, [thirdwebAddress, wagmiAccount?.address, network]);

  // Get the address based on which network is active
  // For ThirdWeb networks (Polygon, Monad, Celo), use thirdwebAddress
  // For Base network, use wagmiAccount address
  const address =
    network === "polygon" || network === "monad" || network === "celo"
      ? thirdwebAddress
      : wagmiAccount?.address;

  // Get contract address based on the active network
  const getContractAddress = () => {
    switch (network) {
      case "polygon":
        return POLYGON_CONTRACT_ADDRESS;
      case "monad":
        return MONAD_CONTRACT_ADDRESS;
      case "celo":
        return CELO_CONTRACT_ADDRESS;
      case "base":
        return BASE_CONTRACT_ADDRESS;
      default:
        return BASE_CONTRACT_ADDRESS;
    }
  };

  const contractAddress = getContractAddress();

  // Wagmi hooks for Base network transactions
  const {
    writeContract,
    isPending,
    isSuccess,
    data: wagmiTxHash,
  } = useWriteContract();

  // Function to check if the user's wallet matches the selected network
  const walletMatchesNetwork = (): boolean => {
    // ThirdWeb networks (Polygon, Monad, Celo) should use thirdwebAddress
    if (
      (network === "polygon" || network === "monad" || network === "celo") &&
      thirdwebAddress
    )
      return true;
    // Base network should use wagmiAccount
    if (network === "base" && wagmiAccount?.address) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Check if the user's wallet matches the selected network
    if (!walletMatchesNetwork()) {
      const networkName =
        network === "polygon"
          ? "Polygon"
          : network === "monad"
          ? "Monad"
          : network === "celo"
          ? "Celo"
          : "Base";
      toast.error(
        `Your connected wallet doesn't match the selected ${networkName} network`
      );
      return;
    }

    // If we're not in the confirm step yet, show confirmation message
    if (!confirmStep) {
      setConfirmStep(true);
      toast.success("Click submit again to confirm your submission", {
        id: "confirm-submit",
        duration: 5000,
      });
      return;
    }

    try {
      setIsLoading(true);

      // Calculate the scores based on exercise type
      const pushups = exerciseType === "pushups" ? score : 0;
      const squats = exerciseType === "squats" ? score : 0;

      console.log("Submitting score to blockchain:", {
        network,
        contractAddress,
        address,
        pushups,
        squats,
      });

      // Check if user can submit (cooldown period)
      const canSubmit = await canUserSubmit(
        contractAddress,
        address,
        network === "base"
      );

      if (!canSubmit.canSubmit) {
        const minutes = Math.ceil((canSubmit.timeRemaining || 60) / 60);
        toast.error(
          `You need to wait ${minutes} minute${
            minutes > 1 ? "s" : ""
          } before submitting again`,
          { id: "submit-score" }
        );
        setIsLoading(false);
        setConfirmStep(false);
        return;
      }

      // Make sure we're submitting to the right network based on connected wallet
      if (wagmiAccount?.address && network === "base") {
        // For Base network with Wagmi wallet, use writeContract
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: fitnessLeaderboardABI,
          functionName: "addScore",
          args: [BigInt(pushups), BigInt(squats)],
        });

        // Success is handled in the useEffect below
        return;
      } else if (
        thirdwebAddress &&
        (network === "polygon" || network === "monad" || network === "celo")
      ) {
        // For ThirdWeb networks (Polygon, Monad, Celo) with ThirdWeb wallet, use direct contract interaction
        const result = await submitScoreDirectly(
          contractAddress,
          pushups,
          squats,
          false, // not Base network
          thirdwebAddress // pass ThirdWeb address as the connectedAddress parameter
        );

        if (!result.success) {
          throw new Error(result.error || "Transaction failed");
        }

        const txHash = result.transactionHash || "";

        // Store transaction hash for social sharing
        if (typeof window !== "undefined") {
          window.transactionHash = txHash;

          // Set network name based on the actual network
          const networkName =
            network === "polygon"
              ? "Polygon Mainnet"
              : network === "monad"
              ? "Monad Testnet"
              : network === "celo"
              ? "Celo Mainnet"
              : "Unknown";
          window.selectedNetworkName = networkName;

          // Also save which network was used to localStorage for consistency
          localStorage.setItem("selectedNetwork", network);
          localStorage.setItem(
            "selectedChain",
            network === "polygon" ? "polygon" : network
          );
        }

        // Show success message with appropriate explorer URL
        const getExplorerUrl = (txHash: string) => {
          switch (network) {
            case "polygon":
              return `https://polygonscan.com/tx/${txHash}`;
            case "monad":
              return `https://testnet.monadexplorer.com/tx/${txHash}`;
            case "celo":
              return `https://explorer.celo.org/tx/${txHash}`;
            default:
              return `#`;
          }
        };

        const explorerUrl = getExplorerUrl(txHash);

        toast.success(
          <div>
            Score submitted! <br />
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

        // Enable social sharing buttons
        if (typeof document !== "undefined") {
          const shareButtons = document.querySelectorAll(
            ".share-button button"
          );
          shareButtons.forEach((button) => {
            (button as HTMLButtonElement).disabled = false;
          });
        }

        // Reset states
        setIsLoading(false);
        setConfirmStep(false);
      }
    } catch (error) {
      console.error("Error submitting score:", error);
      toast.error(
        `Error submitting score: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        {
          id: "submit-score",
        }
      );
      setIsLoading(false);
      setConfirmStep(false);
    }
  };

  // Handle Wagmi transaction result
  useEffect(() => {
    if (isSuccess && wagmiTxHash && network === "base") {
      // Store transaction hash for social sharing
      if (typeof window !== "undefined") {
        window.transactionHash = wagmiTxHash;
        window.selectedNetworkName = "Base Sepolia";
        // Also save which network was used to localStorage for consistency
        localStorage.setItem("selectedNetwork", "base");
        localStorage.setItem("selectedChain", "base");
      }

      // Show success message
      const explorerUrl = `https://sepolia-explorer.base.org/tx/${wagmiTxHash}`;

      toast.success(
        <div>
          Score submitted! <br />
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

      // Enable social sharing buttons
      if (typeof document !== "undefined") {
        const shareButtons = document.querySelectorAll(".share-button button");
        shareButtons.forEach((button) => {
          (button as HTMLButtonElement).disabled = false;
        });
      }

      // Reset states
      setIsLoading(false);
      setConfirmStep(false);
    }
  }, [isSuccess, wagmiTxHash, network]);

  return (
    <button
      id="submit-score-btn"
      onClick={handleSubmit}
      disabled={isLoading || isPending || !address}
      className={`
        ${
          confirmStep
            ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
            : "bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
        }
        text-white font-bold py-4 px-6 rounded-md transition-all duration-300 transform hover:scale-105
        shadow-lg hover:shadow-xl w-full flex items-center justify-center text-xl border-2 border-white
        min-h-16 relative z-50
      `}
      style={{
        boxShadow: "0 0 20px rgba(255, 255, 255, 0.5)",
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)",
        background: confirmStep
          ? "linear-gradient(to right, #f59e0b, #ea580c)"
          : "linear-gradient(to right, #10b981, #3b82f6)",
        opacity: 1,
      }}
    >
      {isLoading || isPending ? (
        <>
          <span className="mr-3 text-xl font-bold">
            SUBMITTING TO {network?.toUpperCase()}...
          </span>
          <Spinner />
        </>
      ) : confirmStep ? (
        <span className="text-xl font-bold">🔥 CONFIRM SUBMISSION 🔥</span>
      ) : (
        <span className="text-xl font-bold">
          🏆 SUBMIT TO {network?.toUpperCase()} 🏆
        </span>
      )}
    </button>
  );
}

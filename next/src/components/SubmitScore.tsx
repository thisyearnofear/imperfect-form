"use client";

import React, { useState, useContext, useEffect } from "react";
import toast from "react-hot-toast";
import { useAddress } from "@thirdweb-dev/react";
import { ChainContext } from "@/components/Providers";
import Spinner from "@/components/Spinner";
import {
  submitScoreDirectly,
  canUserSubmit,
} from "@/utils/directContractInteraction";

interface SubmitScoreProps {
  score?: number;
  exerciseType?: "pushups" | "squats";
}

const SubmitScore: React.FC<SubmitScoreProps> = ({
  score = 0,
  exerciseType = "pushups",
}) => {
  const address = useAddress();
  const [pushups, setPushups] = useState<number>(0);
  const [squats, setSquats] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const { contractAddress, chainId } = useContext(ChainContext);

  // Update scores based on props when they change
  useEffect(() => {
    if (exerciseType === "pushups") {
      setPushups(score);
      setSquats(0);
    } else {
      setSquats(score);
      setPushups(0);
    }
  }, [score, exerciseType]);

  // Function to check if user is on the correct network and switch if needed
  const checkNetwork = async () => {
    try {
      // Get the current chain ID from the wallet
      const provider = window.ethereum;
      if (!provider) return false;

      const currentChainId = await provider.request({ method: "eth_chainId" });
      const currentChainIdDecimal = parseInt(currentChainId, 16);

      // Get the expected chain ID from the context
      const expectedChainId = chainId;

      if (currentChainIdDecimal !== expectedChainId) {
        // Get network name for better user experience
        let expectedNetworkName = "the correct network";
        if (expectedChainId === 80001) expectedNetworkName = "Polygon Mumbai";
        else if (expectedChainId === 80002)
          expectedNetworkName = "Polygon Amoy";
        else if (expectedChainId === 84532)
          expectedNetworkName = "Base Sepolia";

        // Ask user if they want to switch networks automatically
        toast.dismiss("network-error");
        toast.loading(`Switching to ${expectedNetworkName}...`, {
          id: "network-switch",
        });

        try {
          // Try to switch the network
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x" + expectedChainId.toString(16) }],
          });

          toast.success(`Successfully switched to ${expectedNetworkName}`, {
            id: "network-switch",
            duration: 3000,
          });

          return true;
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              // Add the network to the wallet
              const networkParams =
                expectedChainId === 80002
                  ? {
                      chainId: "0x" + expectedChainId.toString(16),
                      chainName: "Polygon Amoy Testnet",
                      nativeCurrency: {
                        name: "MATIC",
                        symbol: "MATIC",
                        decimals: 18,
                      },
                      rpcUrls: [
                        "https://polygon-amoy.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
                        "https://rpc-amoy.polygon.technology",
                      ],
                      blockExplorerUrls: ["https://amoy.polygonscan.com/"],
                    }
                  : {
                      chainId: "0x" + expectedChainId.toString(16),
                      chainName: "Base Sepolia Testnet",
                      nativeCurrency: {
                        name: "ETH",
                        symbol: "ETH",
                        decimals: 18,
                      },
                      rpcUrls: [
                        "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
                        "https://sepolia.base.org",
                        "https://1rpc.io/base-sepolia",
                      ],
                      blockExplorerUrls: ["https://sepolia-explorer.base.org/"],
                    };

              await provider.request({
                method: "wallet_addEthereumChain",
                params: [networkParams],
              });

              toast.success(`Added and switched to ${expectedNetworkName}`, {
                id: "network-switch",
                duration: 3000,
              });

              return true;
            } catch (addError) {
              console.error("Failed to add the network", addError);
              toast.error(
                `Failed to add ${expectedNetworkName} to your wallet`,
                {
                  id: "network-switch",
                }
              );
            }
          } else {
            console.error("Failed to switch network:", switchError);
            toast.error(
              `Failed to switch to ${expectedNetworkName}. Please switch manually.`,
              {
                id: "network-switch",
              }
            );
          }
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error checking network:", error);
      toast.error("Error checking network. Please try again.", {
        id: "network-error",
      });
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!contractAddress) {
      toast.error(
        "Contract not initialized. Please check your network connection."
      );
      return;
    }

    // Validate scores
    if (pushups < 0 || squats < 0) {
      toast.error("Scores cannot be negative");
      return;
    }

    if (pushups === 0 && squats === 0) {
      toast.error("At least one score must be greater than zero");
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

    // Check if user is on the correct network
    const isCorrectNetwork = await checkNetwork();
    if (!isCorrectNetwork) {
      return;
    }

    try {
      // First, ensure we're on the correct network
      const networkSwitched = await checkNetwork();
      if (!networkSwitched) {
        // If network switching failed, don't proceed
        setConfirmStep(false);
        return;
      }

      // Check if user can submit (cooldown period)
      if (address) {
        const canSubmit = await canUserSubmit(contractAddress, address);
        if (!canSubmit.canSubmit) {
          const minutes = Math.ceil(canSubmit.timeRemaining! / 60);
          toast.error(
            `You need to wait ${minutes} minute${
              minutes > 1 ? "s" : ""
            } before submitting again`,
            { id: "submit-score" }
          );
          setConfirmStep(false);
          return;
        }
      }

      // Set loading state
      setIsLoading(true);

      // Store the network for social sharing
      if (typeof window !== "undefined") {
        // @ts-ignore - Adding custom property to window
        window.selectedNetworkName =
          chainId === 80002 ? "Polygon Amoy" : "Base Sepolia";
      }

      // Ensure the wallet is ready to receive transactions
      if (window.ethereum) {
        try {
          // Request account access if needed
          await window.ethereum.request({ method: "eth_requestAccounts" });

          // Check if we're on the correct chain
          const chainIdHex = await window.ethereum.request({
            method: "eth_chainId",
          });
          const currentChainId = parseInt(chainIdHex, 16);

          if (currentChainId !== chainId) {
            // If we're on the wrong chain, try to switch
            toast.loading(`Switching to the correct network...`, {
              id: "network-switch",
            });

            try {
              await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: `0x${chainId.toString(16)}` }],
              });

              toast.success(`Successfully switched networks`, {
                id: "network-switch",
                duration: 3000,
              });
            } catch (switchError: any) {
              // This error code indicates that the chain has not been added to MetaMask
              if (switchError.code === 4902) {
                toast.error(`Please add the network to your wallet manually`, {
                  id: "network-switch",
                });
                setIsLoading(false);
                setConfirmStep(false);
                return;
              } else {
                toast.error(
                  `Failed to switch networks: ${switchError.message}`,
                  {
                    id: "network-switch",
                  }
                );
                setIsLoading(false);
                setConfirmStep(false);
                return;
              }
            }
          }
        } catch (error) {
          console.error("Error preparing wallet:", error);
        }
      }

      // Use our direct contract interaction utility
      toast.loading(`Preparing to submit your score...`, {
        id: "submit-score",
      });

      const result = await submitScoreDirectly(
        contractAddress,
        pushups,
        squats
      );

      if (result.success && result.transactionHash) {
        // Store transaction hash for social sharing
        if (typeof window !== "undefined") {
          // @ts-ignore - Adding custom property to window
          window.transactionHash = result.transactionHash;
        }

        // Show success message with explorer link
        const explorerUrl =
          chainId === 80002
            ? `https://amoy.polygonscan.com/tx/${result.transactionHash}`
            : `https://sepolia-explorer.base.org/tx/${result.transactionHash}`;

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
      } else {
        // Show error message with a more user-friendly format
        toast.error(
          <div style={{ maxWidth: "300px", wordBreak: "break-word" }}>
            {result.error || "Failed to submit score"}
          </div>,
          {
            id: "submit-score",
            duration: 5000,
          }
        );
      }

      // Reset confirm step
      setConfirmStep(false);

      return result;
    } catch (err: any) {
      console.error("Contract error:", err);

      // Reset states
      setIsLoading(false);
      setConfirmStep(false);

      // Handle specific error types with cleaner messages
      if (err.message?.includes("user rejected") || err.code === 4001) {
        toast.dismiss("submit-score");
        toast.error("Transaction cancelled", {
          id: "submit-score",
          duration: 3000,
          icon: "❌",
        });
      } else if (
        err.code === "CALL_EXCEPTION" ||
        err.message?.includes("execution reverted")
      ) {
        toast.error(
          "Contract call failed. You may have already submitted recently.",
          { id: "submit-score" }
        );
      } else if (
        err.message?.includes("missing response") ||
        err.message?.includes("timeout")
      ) {
        toast.error(
          "Network is slow or unresponsive. Please try again later or switch networks.",
          { id: "submit-score" }
        );
      } else if (err.message?.includes("Cannot read properties")) {
        toast.error(
          "Contract not available. Please check your network connection.",
          { id: "submit-score" }
        );
      } else if (err.message?.includes("underlying network changed")) {
        // Handle the specific network change error
        toast.error("Network changed during transaction. Please try again.", {
          id: "submit-score",
        });

        // Try to automatically switch back to the correct network
        try {
          if (window.ethereum) {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x" + chainId.toString(16) }],
            });

            toast.success(
              "Switched back to the correct network. Please try submitting again.",
              {
                id: "network-switch",
                duration: 5000,
              }
            );
          }
        } catch (switchError) {
          console.error("Failed to switch network after error:", switchError);
        }
      } else {
        // Simplify error message for better UX
        let errorMsg = "Error submitting score";
        if (err.message) {
          // Extract just the main part of the error message
          const simpleError = err.message.split("\n")[0].trim();
          // Limit the length of the error message
          if (simpleError.length > 100) {
            errorMsg = `${errorMsg}: ${simpleError.substring(0, 100)}...`;
          } else {
            errorMsg = `${errorMsg}: ${simpleError}`;
          }
        }

        toast.error(errorMsg, { id: "submit-score" });
      }
    } finally {
      // Always reset loading state
      setIsLoading(false);
    }
  };

  if (!address) {
    return null; // Don't render anything if not connected - ConnectWalletButton will be shown instead
  }

  return (
    <button
      id="submitScoreButton"
      onClick={handleSubmit}
      disabled={isLoading}
      className={`${
        confirmStep
          ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          : "bg-[#800080] hover:bg-[#9932cc]"
      } text-white font-bold py-2 px-4 rounded-md transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg w-full flex items-center justify-center`}
      style={{ display: address ? "block" : "none" }}
    >
      {isLoading ? (
        <>
          <span className="mr-2">Submitting...</span>
          <Spinner />
        </>
      ) : confirmStep ? (
        "Confirm Submission"
      ) : (
        "Submit Score"
      )}
    </button>
  );
};

export default SubmitScore;

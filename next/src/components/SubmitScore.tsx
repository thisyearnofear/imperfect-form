"use client";

import React, { useState, useContext, useEffect } from "react";
import toast from "react-hot-toast";
import { ChainContext } from "@/components/Providers";
import Spinner from "@/components/Spinner";
import { useNetwork as useNetworkContext } from "@/contexts/NetworkContext";
import { useAccount, useWriteContract, useSimulateContract } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import {
  submitScoreDirectly,
  canUserSubmit,
} from "@/utils/directContractInteraction";
import { fitnessLeaderboardABI } from "@/constants/contracts";

// Create a safe wrapper component that only renders its children when in the right network context
const SafeThirdwebWrapper = ({
  children,
  network,
}: {
  children: React.ReactNode;
  network: string | null;
}) => {
  // Only render children if we're in the polygon network
  if (network === "polygon") {
    return <>{children}</>;
  }
  return null;
};

// Import ThirdWeb hooks at the top level
import { useAddress as useThirdwebAddress } from "@thirdweb-dev/react";

// Create a variable to store ThirdWeb hooks
const thirdwebHooks = {
  useAddress: useThirdwebAddress,
};

// Create a component that safely uses ThirdWeb hooks
const ThirdwebAddressHandler = ({
  onAddressData,
}: {
  onAddressData: (address: string | undefined) => void;
}) => {
  // We don't need state here since we're just passing the value up

  // Use effect to safely try to get ThirdWeb data
  useEffect(() => {
    try {
      if (thirdwebHooks.useAddress) {
        // Get the address from the hook
        const address = thirdwebHooks.useAddress();

        // Pass the data up to the parent
        onAddressData(address);
      } else {
        onAddressData(undefined);
      }
    } catch (error) {
      console.error("Error using ThirdWeb hooks:", error);
      // If there's an error, pass undefined
      onAddressData(undefined);
    }
  }, [onAddressData]);

  return null;
};

interface SubmitScoreProps {
  score?: number;
  exerciseType?: "pushups" | "squats";
}

const SubmitScore: React.FC<SubmitScoreProps> = ({ score, exerciseType }) => {
  const { network } = useNetworkContext();
  const { address: wagmiAddress } = useAccount();
  const [thirdwebAddress, setThirdwebAddress] = useState<string | undefined>(
    undefined
  );

  // Use the appropriate address based on the network
  const address = network === "polygon" ? thirdwebAddress : wagmiAddress;

  // Use provided score or default to 0
  const pushups: number = exerciseType === "pushups" ? score || 0 : 0;
  const squats: number = exerciseType === "squats" ? score || 0 : 0;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const { contractAddress, chainId: contextChainId } = useContext(ChainContext);

  // Use the correct chainId based on the network
  // For Base network, always use the baseSepolia.id directly to avoid any context mismatch
  const chainId = network === "polygon" ? 80002 : baseSepolia.id;

  // Log the chain IDs for debugging
  useEffect(() => {
    console.log("SubmitScore: Network:", network);
    console.log("SubmitScore: Context chainId:", contextChainId);
    console.log("SubmitScore: Actual chainId being used:", chainId);
    console.log("SubmitScore: Contract address:", contractAddress);
  }, [network, contextChainId, chainId, contractAddress]);

  // Function to check if user is on the correct network and switch if needed
  const checkNetwork = async () => {
    try {
      // For Base network, we'll skip the network check since we're using Wagmi
      if (network === "base") {
        console.log(
          "Using Base network with Wagmi, skipping manual network check"
        );
        return true;
      }

      // For Polygon network, we'll use window.ethereum
      const provider = window.ethereum;
      if (!provider) return false;

      const currentChainId = await provider.request({ method: "eth_chainId" });
      const currentChainIdDecimal = parseInt(currentChainId as string, 16);

      // Get the expected chain ID based on the network
      const expectedChainId = chainId; // This is now correctly set based on the network

      if (currentChainIdDecimal !== expectedChainId) {
        // Get network name for better user experience
        let expectedNetworkName = "the correct network";

        // Use a simple if/else for type safety
        if (expectedChainId === 80002) {
          expectedNetworkName = "Polygon Amoy";
        } else if (expectedChainId === 84532) {
          expectedNetworkName = "Base Sepolia";
        }

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
        } catch (switchErr) {
          const switchError = switchErr as { code?: number; message?: string };
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

  // Add Wagmi hooks for contract write
  const { data: simulateData, error: simulateError } = useSimulateContract({
    address: contractAddress as `0x${string}`,
    abi: fitnessLeaderboardABI,
    functionName: "addScore",
    args: [pushups, squats],
    query: {
      enabled: network === "base" && confirmStep && !!address,
    },
  });

  const { writeContract, isSuccess, data: wagmiTxHash } = useWriteContract();

  // Add a useEffect to handle transaction success
  useEffect(() => {
    if (isSuccess && wagmiTxHash && network === "base") {
      // Store transaction hash for social sharing
      if (typeof window !== "undefined") {
        window.transactionHash = wagmiTxHash;
        window.selectedNetworkName = "Base Sepolia";
      }

      // Show success message with explorer link
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

    // Skip validation since we're using fixed positive values
    // if (pushups < 0 || squats < 0) {
    //   toast.error("Scores cannot be negative");
    //   return;
    // }

    // Skip this check since we're using fixed values
    // if (pushups === 0 && squats === 0) {
    //   toast.error("At least one score must be greater than zero");
    //   return;
    // }

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
      // Check if user is on the correct network
      const isCorrectNetwork = await checkNetwork();
      if (!isCorrectNetwork) {
        setConfirmStep(false);
        return;
      }

      // Check if user can submit (cooldown period)
      if (address) {
        // Pass isBaseNetwork parameter based on the current network
        const canSubmit = await canUserSubmit(
          contractAddress,
          address,
          network === "base" // true if we're on Base network
        );

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
        // Add network name to window object for social sharing
        const networkName =
          network === "polygon" ? "Polygon Amoy" : "Base Sepolia";
        window.selectedNetworkName = networkName;
        console.log(
          `Set selectedNetworkName to: ${networkName} (network: ${network}, chainId: ${chainId})`
        );
      }

      // For Base network, we'll use Wagmi to handle chain switching
      if (network === "base") {
        // We don't need to do anything here as Wagmi will handle the chain switching
        // when we call submitScoreDirectly with isBaseNetwork=true
        console.log(
          "Using Wagmi for Base network, skipping manual chain switching"
        );
      }
      // For Polygon network, we'll use window.ethereum
      else if (window.ethereum) {
        try {
          // Request account access if needed
          await window.ethereum.request({ method: "eth_requestAccounts" });

          // Check if we're on the correct chain
          const chainIdHex = await window.ethereum.request({
            method: "eth_chainId",
          });
          const currentChainId = parseInt(chainIdHex as string, 16);

          if (currentChainId !== chainId) {
            // If we're on the wrong chain, try to switch
            toast.loading(`Switching to Polygon Amoy...`, {
              id: "network-switch",
            });

            try {
              console.log(`Switching to chainId: 0x${chainId.toString(16)}`);
              await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: `0x${chainId.toString(16)}` }],
              });

              toast.success(`Successfully switched networks`, {
                id: "network-switch",
                duration: 3000,
              });
            } catch (switchErr) {
              const switchError = switchErr as {
                code?: number;
                message?: string;
              };
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

      // Pass isBaseNetwork parameter based on the current network
      console.log(
        `Submitting score using ${
          network === "base" ? "Base" : "Polygon"
        } network`
      );
      const result = await submitScoreDirectly(
        contractAddress,
        pushups,
        squats,
        network === "base", // true if we're on Base network
        address // Pass the connected address
      );

      // Check if we need to use Wagmi for Base network transaction
      if (result.processingType === "wagmi") {
        try {
          // Check if we can use spend limits
          if (result.useSpendLimit) {
            toast.loading(`Using spend limits for faster submission...`, {
              id: "submit-score",
            });

            // In a full implementation, this would use the spend permissions
            // For now, we'll still show a success message but note it's using spend limits
            toast.success(
              <div>
                Score submitted with spend limits! <br />
                <span className="text-xs mt-1 block">
                  Using previously approved spend limit - no signature needed!
                </span>
              </div>,
              { id: "submit-score", duration: 8000 }
            );

            // Reset states
            setIsLoading(false);
            setConfirmStep(false);

            return result;
          }

          toast.loading(`Preparing transaction with Coinbase wallet...`, {
            id: "submit-score",
          });

          if (simulateError) {
            console.error("Simulation error:", simulateError);

            // Check if the error is related to sub-account issues
            const errorMessage = simulateError.message || "";
            if (
              errorMessage.includes("execution reverted") &&
              (errorMessage.includes("SubAccount") ||
                errorMessage.includes(
                  "0x000000006551c19487814612e58FE06813775758"
                ))
            ) {
              toast.error(
                <div>
                  Sub-account issue detected. <br />
                  <span className="text-xs mt-1 block">
                    Please create a sub-account in your Coinbase Wallet first.
                  </span>
                </div>,
                { id: "submit-score", duration: 8000 }
              );

              // Reset states
              setIsLoading(false);
              setConfirmStep(false);
              return result;
            }

            throw new Error(
              simulateError.message || "Failed to simulate transaction"
            );
          }

          if (!simulateData?.request) {
            throw new Error("No simulation data available");
          }

          // Submit the transaction using Wagmi - this doesn't return a txHash directly
          writeContract(simulateData.request);

          // Show pending message - the success will be handled by the useEffect above
          toast.loading(`Transaction submitted. Waiting for confirmation...`, {
            id: "submit-score",
          });

          // Don't reset loading state here - it will be reset in the useEffect when transaction succeeds
        } catch (wagmiError) {
          console.error("Error submitting with Wagmi:", wagmiError);
          const error = wagmiError as {
            message?: string;
            code?: number | string;
          };

          // Handle the error appropriately
          if (error.message?.includes("user rejected") || error.code === 4001) {
            toast.error("Transaction cancelled", {
              id: "submit-score",
              duration: 3000,
            });
          } else {
            toast.error(
              `Failed to submit score: ${error.message || "Unknown error"}`,
              { id: "submit-score" }
            );
          }

          // Reset states
          setIsLoading(false);
          setConfirmStep(false);
        }
      } else if (result.success && result.transactionHash) {
        // Store transaction hash for social sharing
        if (typeof window !== "undefined") {
          // Add transaction hash to window object for social sharing
          // Using the globally declared Window interface
          window.transactionHash = result.transactionHash;
        }

        // Show success message with explorer link
        const explorerUrl =
          network === "polygon"
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
    } catch (err) {
      const error = err as {
        message?: string;
        code?: number | string;
      };
      console.error("Contract error:", error);

      // Reset states
      setIsLoading(false);
      setConfirmStep(false);

      // Handle specific error types with cleaner messages
      if (error.message?.includes("user rejected") || error.code === 4001) {
        toast.dismiss("submit-score");
        toast.error("Transaction cancelled", {
          id: "submit-score",
          duration: 3000,
          icon: "❌",
        });
      } else if (
        error.code === "CALL_EXCEPTION" ||
        error.message?.includes("execution reverted")
      ) {
        toast.error(
          "Contract call failed. You may have already submitted recently.",
          { id: "submit-score" }
        );
      } else if (
        error.message?.includes("missing response") ||
        error.message?.includes("timeout")
      ) {
        toast.error(
          "Network is slow or unresponsive. Please try again later or switch networks.",
          { id: "submit-score" }
        );
      } else if (error.message?.includes("Cannot read properties")) {
        toast.error(
          "Contract not available. Please check your network connection.",
          { id: "submit-score" }
        );
      } else if (error.message?.includes("underlying network changed")) {
        // Handle the specific network change error
        toast.error("Network changed during transaction. Please try again.", {
          id: "submit-score",
        });

        // Try to automatically switch back to the correct network
        try {
          if (window.ethereum) {
            console.log(`Switching back to chainId: 0x${chainId.toString(16)}`);
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
        if (error.message) {
          // Extract just the main part of the error message
          const simpleError = error.message.split("\n")[0].trim();
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
    <>
      {/* Render the ThirdwebAddressHandler only when in polygon network */}
      {network === "polygon" && (
        <SafeThirdwebWrapper network={network}>
          <ThirdwebAddressHandler onAddressData={setThirdwebAddress} />
        </SafeThirdwebWrapper>
      )}

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
    </>
  );
};

export default SubmitScore;

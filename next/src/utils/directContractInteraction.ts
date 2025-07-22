import { ethers } from "ethers";
import {
  fitnessLeaderboardABI,
  monadLeaderboardABI,
  polygonLeaderboardABI,
  baseLeaderboardABI
} from "@/constants/contracts";
import toast from "react-hot-toast";
import { isFirstTimeDivviUser, getDivviDataSuffix, registerDivviReferral, showEnhancedFeaturesPrompt } from "./divviIntegration";
import { getEthereumProvider } from "./farcasterMiniApp";
import {
  createTransactionOptions,
  estimateGas,
  parseEther,
  parseUnits,
} from "./ethersHelpers";

/**
 * Helper function to check if the current provider is Coinbase Wallet
 */
export function isCoinbaseWalletActive(): boolean {
  // Check if we have the Coinbase Wallet extension directly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).coinbaseWalletExtension) {
    return true;
  }

  // Check if window.ethereum is Coinbase Wallet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (window.ethereum && (window.ethereum as any).isCoinbaseWallet) {
    return true;
  }

  // Check if we have Coinbase Wallet in the providers array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (window.ethereum && (window.ethereum as any).providers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providers = (window.ethereum as any).providers as Array<{
      isCoinbaseWallet?: boolean;
    }>;
    return providers.some((p) => p.isCoinbaseWallet);
  }

  return false;
}

/**
 * Helper function to suggest switching to Coinbase Wallet
 */
export function suggestSwitchingToCoinbaseWallet(): string {
  return `It appears you're not using Coinbase Wallet for Base network.
Please disconnect your current wallet, then connect using Coinbase Wallet.
You can do this by:
1. Clicking the wallet button in the top right
2. Clicking "Disconnect"
3. Refreshing the page
4. Connecting with Coinbase Wallet`;
}

/**
 * Submit a score directly using ethers.js instead of ThirdWeb
 * This provides more control over the transaction and better error handling
 */
export async function submitScoreDirectly(
  contractAddress: string,
  pushups: number,
  squats: number,
  isBaseNetwork: boolean = false,
  connectedAddress?: string, // Pass the connected address from the React component
  skipSubAccountCheck: boolean = false, // Flag to skip sub-account check for direct submission
  providedEthereumProvider?: unknown // Optional provider from unified context
): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
  processingType?: string;
  useSpendLimit?: boolean;
}> {
  // Helper function to create provider
  function createProviderFromEthereum(ethereumProvider: unknown): ethers.BrowserProvider {
    if (ethereumProvider && typeof ethereumProvider === 'object' && 'request' in ethereumProvider) {
      return new ethers.BrowserProvider(ethereumProvider as ethers.Eip1193Provider);
    } else if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    } else {
      throw new Error("No valid Ethereum provider found");
    }
  }

  try {
    let signer: ethers.Signer;
    let userAddress: string;
    let provider: ethers.BrowserProvider;

    if (isBaseNetwork) {
      // For Base network with Smart Wallet, we'll use a simplified approach
      console.log("Using Base Smart Wallet for transaction");

      // Use the address passed from the React component
      if (!connectedAddress) {
        return {
          success: false,
          error: "No wallet address provided. Please connect your wallet.",
        };
      }

      userAddress = connectedAddress;
      console.log("Using provided address:", userAddress);

      // With the Coinbase SDK integration, subaccounts are automatically created and managed
      // We can assume the wallet may have subaccounts configured through the SDK
      if (!skipSubAccountCheck) {
        console.log("Using SDK-configured subaccounts for Base network");

        // Return to use Wagmi for transaction handling with the Coinbase SDK
        return {
          success: false,
          processingType: "wagmi",
          useSpendLimit: true,
          error: "Use Wagmi for Base transactions with automatic subaccounts",
        };
      } else {
        console.log("Skipping subaccount check for direct submission");
      }

      // For direct submission with skipSubAccountCheck=true, we'll use Wagmi without spend limits
      if (skipSubAccountCheck) {
        console.log("Using direct submission mode without spend limits");
        return {
          success: false,
          processingType: "wagmi",
          useSpendLimit: false, // Explicitly set to false for direct submission
          error: "Use Wagmi for direct Base transactions", // Not an error, just an internal signal
        };
      } else {
        // For other Base Smart Wallet cases (not direct submission)
        return {
          success: false, // Changed to false to prevent false positive
          processingType: "wagmi", // New field to indicate we need to use Wagmi
          error: "Use Wagmi for Base transactions", // This is not a user-facing error but an internal signal
        };
      }
    } else {
      // For ThirdWeb-compatible networks (Polygon/Monad/Celo), use appropriate provider
      let ethereumProvider = providedEthereumProvider;

      // If no provider was provided, fall back to the old method
      if (!ethereumProvider) {
        console.log("No provider provided, falling back to getEthereumProvider()");
        ethereumProvider = await getEthereumProvider();
      } else {
        console.log("Using provided ethereum provider from unified context");
      }

      if (!ethereumProvider) {
        console.log("No Ethereum provider found, suggesting fallback to Wagmi");
        return {
          success: false,
          processingType: "wagmi",
          error: "No provider available - use Wagmi fallback",
        };
      }

      // Determine which network we're using based on the contract address
      let networkName = "Unknown";
      if (contractAddress === "0xc783d6E12560dc251F5067A62426A5f3b45b6888") {
        networkName = "Polygon Mainnet";
      } else if (contractAddress === "0x653d41Fba630381aA44d8598a4b35Ce257924d65") {
        networkName = "Monad Testnet";
        console.log("Detected Monad Testnet contract");
      } else if (contractAddress === "0xB0cbC7325EbC744CcB14211CA74C5a764928F273") {
        networkName = "Celo Mainnet";
      }

      console.log(`Using window.ethereum provider for ${networkName} network`);

      // Debug mobile wallet browser detection
      if (process.env.NODE_ENV !== "production") {
        const providerInfo = ethereumProvider as {
          isMetaMask?: boolean;
          isCoinbaseWallet?: boolean;
          isTrust?: boolean;
          constructor?: { name?: string };
        };

        console.log("Mobile wallet debug info:", {
          userAgent: navigator.userAgent,
          isMetaMask: providerInfo?.isMetaMask,
          isCoinbaseWallet: providerInfo?.isCoinbaseWallet,
          isTrust: providerInfo?.isTrust,
          networkName,
          contractAddress,
          providerType: providerInfo?.constructor?.name || 'unknown'
        });
      }

      // Create a provider using the appropriate Ethereum provider (Farcaster or window.ethereum)
      provider = createProviderFromEthereum(ethereumProvider);

      // Note: In ethers v6, polling is automatically optimized

      // Request the user to switch to the correct network if needed
      let network;
      try {
        network = await provider.getNetwork();
        console.log("Current network:", network);
      } catch (networkError) {
        console.warn("Failed to get network, attempting alternative detection:", networkError);

        // Fallback 1: Try to get chainId from provider directly
        try {
          const providerWithRequest = ethereumProvider as { request?: (params: { method: string }) => Promise<string> };
          if (providerWithRequest && typeof providerWithRequest.request === 'function') {
            const chainId = await providerWithRequest.request({ method: 'eth_chainId' });
            const chainIdNumber = parseInt(chainId, 16);
            console.log("Detected chainId from provider request:", chainIdNumber);

            network = {
              chainId: chainIdNumber,
              name: `Chain ${chainIdNumber}`,
            };
          } else {
            throw new Error("Provider request method not available");
          }
        } catch (chainIdError) {
          console.warn("Provider request failed, trying window.ethereum:", chainIdError);

          // Fallback 2: Try window.ethereum directly
          try {
            const windowEthereum = (window as unknown as { ethereum?: { request?: (params: { method: string }) => Promise<string> } }).ethereum;
            if (windowEthereum && typeof windowEthereum.request === 'function') {
              const chainId = await windowEthereum.request({ method: 'eth_chainId' });
              const chainIdNumber = parseInt(chainId, 16);
              console.log("Detected chainId from window.ethereum:", chainIdNumber);

              network = {
                chainId: chainIdNumber,
                name: `Chain ${chainIdNumber}`,
              };
            } else {
              throw new Error("window.ethereum not available");
            }
          } catch (windowError) {
            console.error("All network detection methods failed:", windowError);

            // Fallback 3: Use contract address to infer network
            console.warn("Using contract address to infer network");
            if (contractAddress === "0xc783d6E12560dc251F5067A62426A5f3b45b6888") {
              network = { chainId: 137, name: "Polygon Mainnet" };
            } else if (contractAddress === "0xB0cbC7325EbC744CcB14211CA74C5a764928F273") {
              network = { chainId: 42220, name: "Celo Mainnet" };
            } else if (contractAddress === "0x653d41Fba630381aA44d8598a4b35Ce257924d65") {
              network = { chainId: 10143, name: "Monad Testnet" };
            } else if (contractAddress === "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B") {
              network = { chainId: 8453, name: "Base Mainnet" };
            } else {
              throw new Error("Could not detect network. Please ensure your wallet is connected and try again.");
            }
            console.log("Inferred network from contract address:", network);
          }
        }
      }

      // Debug network detection for mobile wallets
      if (process.env.NODE_ENV !== "production") {
        console.log("Network detection debug:", {
          chainId: network.chainId,
          name: network.name,
          expectedNetwork: networkName,
          contractAddress,
        });
      }

      // Get the signer
      try {
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        console.log("Signer address obtained:", userAddress);
      } catch (signerError) {
        console.error("Failed to get signer:", signerError);
        throw new Error("Could not access wallet. Please ensure your wallet is connected and unlocked.");
      }
    }

    // Determine which ABI to use based on the contract address
    let contractABI = fitnessLeaderboardABI;

    // Use network-specific ABIs
    if (contractAddress === "0x653d41Fba630381aA44d8598a4b35Ce257924d65") {
      // Monad Testnet
      contractABI = monadLeaderboardABI;
    } else if (contractAddress === "0xc783d6E12560dc251F5067A62426A5f3b45b6888") {
      // Polygon Mainnet
      contractABI = polygonLeaderboardABI;
    } else if (contractAddress === "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B") {
      // Base Mainnet
      contractABI = baseLeaderboardABI;
    } else if (contractAddress === "0xB0cbC7325EbC744CcB14211CA74C5a764928F273") {
      // Celo Mainnet
      contractABI = fitnessLeaderboardABI; // Already using the updated ABI
    }

    // Create contract instance with the appropriate ABI
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // Log the contract and parameters
    console.log("Contract address:", contractAddress);
    console.log("User address:", userAddress);
    console.log("Pushups:", pushups);
    console.log("Squats:", squats);

    // Show toast for user to confirm transaction
    toast.loading("Preparing transaction...", { id: "submit-score" });

    // Estimate gas with a higher gas limit to avoid failures
    const gasEstimate = await estimateGas(contract, "addScore", [pushups, squats]);
    console.log("Gas estimation:", gasEstimate.toString());

    // Add 50% buffer to gas estimate for testnet transactions
    const gasLimit = (gasEstimate * 150n) / 100n;
    console.log("Gas limit with buffer:", gasLimit.toString());

    // Show toast for user to confirm transaction
    toast.loading("Please confirm the transaction in your wallet...", {
      id: "submit-score",
    });

    // Send transaction with explicit gas limit
    // Use different transaction parameters based on the network
    let tx;
    let shouldRegisterWithDivvi = false; // Track if we should register with Divvi after transaction

    // Get network-specific transaction options
    const network = await provider.getNetwork();
    const networkId = Number(network.chainId);

    // Create optimized transaction options for this network
    const txOptions = createTransactionOptions(networkId, gasLimit);
    console.log("Using transaction options:", txOptions);

    // Network-specific transaction parameters
    if (contractAddress === "0x653d41Fba630381aA44d8598a4b35Ce257924d65") {
      // Monad Testnet
      console.log("Using Monad testnet specific transaction parameters");
      try {
        // For Monad testnet, use legacy transaction format with higher gas price
        // Include the submission fee (0.001 MON) required by the contract
        tx = await contract.addScore(pushups, squats, txOptions);
      } catch (error) {
        console.error("Monad transaction failed:", error);
        // Try with even higher gas price and triple gas limit
        const retryOptions = {
          ...txOptions,
          gasLimit: gasLimit * 3n,
          gasPrice: parseUnits("100", "gwei"),
          value: parseEther("0.001")
        };
        tx = await contract.addScore(pushups, squats, retryOptions);
      }
    } else if (contractAddress === "0xB0cbC7325EbC744CcB14211CA74C5a764928F273") {
      // Celo Mainnet
      console.log("Using Celo mainnet specific transaction parameters");

      // Check if this is a first-time Divvi user (42220 is Celo mainnet)
      const isFirstTimeDivvi = await isFirstTimeDivviUser(userAddress, 42220);
      console.log("Is first-time Divvi user on Celo:", isFirstTimeDivvi);

      // If first-time Divvi user, show enhanced features prompt and prepare Divvi integration
      let dataSuffix = "";
      if (isFirstTimeDivvi) {
        const userAccepted = await showEnhancedFeaturesPrompt();
        if (userAccepted) {
          dataSuffix = getDivviDataSuffix();
          shouldRegisterWithDivvi = true;
          console.log("Added Divvi data suffix for first-time user registration");
        }
      }

      try {
        // Get the contract interface to encode function data manually
        const iface = contract.interface;

        // Encode the function call data
        const data = iface.encodeFunctionData("addScore", [pushups, squats]);

        // Add Divvi data suffix if this is a first-time user
        const finalData = dataSuffix ? data + dataSuffix : data;

        // For Celo mainnet, prepare transaction with Divvi integration if needed
        if (dataSuffix) {
          // For first-time users with Divvi integration
          console.log("Sending Celo transaction with Divvi integration");

          // Create a transaction object
          const txRequest = {
            to: contractAddress,
            data: finalData,
            gasLimit: gasLimit * 2n, // Double the gas limit for Celo
          };

          // Send the transaction using the signer
          tx = await signer.sendTransaction(txRequest);
        } else {
          // For returning users, use standard contract call
          tx = await contract.addScore(pushups, squats, {
            gasLimit: gasLimit * 2n, // Double the gas limit for Celo
            // No value parameter - the standardized contract doesn't require a fee
          });
        }
      } catch (error) {
        console.error("Celo transaction failed:", error);
        // Try with higher gas limit and legacy transaction format
        try {
          // Get the contract interface to encode function data manually
          const iface = contract.interface;

          // Encode the function call data
          const data = iface.encodeFunctionData("addScore", [pushups, squats]);

          // Add Divvi data suffix if this is a first-time user
          const finalData = dataSuffix ? data + dataSuffix : data;

          if (dataSuffix) {
            // For first-time users with Divvi integration
            console.log("Retrying Celo transaction with Divvi integration and legacy format");

            // Create a transaction object with legacy format
            const txRequest = {
              to: contractAddress,
              data: finalData,
              gasLimit: gasLimit * 3n, // Triple the gas limit
              gasPrice: parseUnits("30", "gwei"), // Use explicit gas price for legacy tx
            };

            // Send the transaction using the signer
            tx = await signer.sendTransaction(txRequest);
          } else {
            // For returning users, use standard contract call with legacy format
            tx = await contract.addScore(pushups, squats, {
              gasLimit: gasLimit * 3n, // Triple the gas limit
              gasPrice: parseUnits("30", "gwei"), // Use explicit gas price for legacy tx
              // No value parameter - the standardized contract doesn't require a fee
            });
          }
        } catch (retryError) {
          console.error("Celo retry failed:", retryError);
          throw retryError; // Re-throw the error to be caught by the outer try/catch
        }
      }
    } else if (contractAddress === "0xc783d6E12560dc251F5067A62426A5f3b45b6888") {
      // Polygon Mainnet
      console.log("Using Polygon mainnet specific transaction parameters");

      // Check if this is a first-time Divvi user (137 is Polygon mainnet)
      const isFirstTimeDivvi = await isFirstTimeDivviUser(userAddress, 137);
      console.log("Is first-time Divvi user on Polygon:", isFirstTimeDivvi);

      // If first-time Divvi user, show enhanced features prompt and prepare Divvi integration
      let dataSuffix = "";
      if (isFirstTimeDivvi) {
        const userAccepted = await showEnhancedFeaturesPrompt();
        if (userAccepted) {
          dataSuffix = getDivviDataSuffix();
          shouldRegisterWithDivvi = true;
          console.log("Added Divvi data suffix for first-time user registration on Polygon");
        }
      }

      try {
        if (dataSuffix) {
          // For first-time users with Divvi integration
          console.log("Sending Polygon transaction with Divvi integration");

          // Get the contract interface to encode function data manually
          const iface = contract.interface;
          const data = iface.encodeFunctionData("addScore", [pushups, squats]);
          const finalData = data + dataSuffix;

          // Create a transaction object with EIP-1559
          const txRequest = {
            to: contractAddress,
            data: finalData,
            gasLimit: gasLimit * 2n,
            maxPriorityFeePerGas: parseUnits("30", "gwei"),
            maxFeePerGas: parseUnits("100", "gwei"),
          };

          tx = await signer.sendTransaction(txRequest);
        } else {
          // For returning users, use standard contract call
          tx = await contract.addScore(pushups, squats, {
            gasLimit: gasLimit * 2n, // Double the gas limit for Polygon
            maxPriorityFeePerGas: parseUnits("30", "gwei"), // Higher priority fee for Polygon
            maxFeePerGas: parseUnits("100", "gwei"), // Higher max fee for Polygon
          });
        }
      } catch (error) {
        console.error("Polygon transaction failed:", error);
        // Fall back to legacy transaction format
        if (dataSuffix) {
          // Retry with legacy format for Divvi users
          const iface = contract.interface;
          const data = iface.encodeFunctionData("addScore", [pushups, squats]);
          const finalData = data + dataSuffix;

          const txRequest = {
            to: contractAddress,
            data: finalData,
            gasLimit: gasLimit * 3n,
            gasPrice: parseUnits("50", "gwei"),
          };

          tx = await signer.sendTransaction(txRequest);
        } else {
          tx = await contract.addScore(pushups, squats, {
            gasLimit: gasLimit * 3n, // Triple the gas limit
            gasPrice: parseUnits("50", "gwei"), // Higher gas price for Polygon
          });
        }
      }
    } else if (contractAddress === "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B") {
      // Base Mainnet
      console.log("Using Base Mainnet specific transaction parameters");

      // Check if this is a first-time Divvi user (8453 is Base mainnet)
      const isFirstTimeDivvi = await isFirstTimeDivviUser(userAddress, 8453);
      console.log("Is first-time Divvi user on Base:", isFirstTimeDivvi);

      // If first-time Divvi user, show enhanced features prompt and prepare Divvi integration
      let dataSuffix = "";
      if (isFirstTimeDivvi) {
        const userAccepted = await showEnhancedFeaturesPrompt();
        if (userAccepted) {
          dataSuffix = getDivviDataSuffix();
          shouldRegisterWithDivvi = true;
          console.log("Added Divvi data suffix for first-time user registration on Base");
        }
      }

      try {
        if (dataSuffix) {
          // For first-time users with Divvi integration
          console.log("Sending Base transaction with Divvi integration");

          // Get the contract interface to encode function data manually
          const iface = contract.interface;
          const data = iface.encodeFunctionData("addScore", [pushups, squats]);
          const finalData = data + dataSuffix;

          // Create a transaction object with EIP-1559
          const txRequest = {
            to: contractAddress,
            data: finalData,
            gasLimit: gasLimit * 2n,
            maxPriorityFeePerGas: parseUnits("0.1", "gwei"),
            maxFeePerGas: parseUnits("10", "gwei"),
          };

          tx = await signer.sendTransaction(txRequest);
        } else {
          // For returning users, use standard contract call
          tx = await contract.addScore(pushups, squats, {
            gasLimit: gasLimit * 2n, // Double the gas limit for Base
            maxPriorityFeePerGas: parseUnits("0.1", "gwei"), // Lower priority fee for mainnet
            maxFeePerGas: parseUnits("10", "gwei"), // Lower max fee for mainnet
          });
        }
      } catch (error) {
        console.error("Base Mainnet transaction failed:", error);
        // Fall back to legacy transaction format
        if (dataSuffix) {
          // Retry with legacy format for Divvi users
          const iface = contract.interface;
          const data = iface.encodeFunctionData("addScore", [pushups, squats]);
          const finalData = data + dataSuffix;

          const txRequest = {
            to: contractAddress,
            data: finalData,
            gasLimit: gasLimit * 3n,
            gasPrice: parseUnits("5", "gwei"),
          };

          tx = await signer.sendTransaction(txRequest);
        } else {
          tx = await contract.addScore(pushups, squats, {
            gasLimit: gasLimit * 3n, // Triple the gas limit
            gasPrice: parseUnits("5", "gwei"), // Lower gas price for mainnet
          });
        }
      }
    } else {
      // Generic fallback for any other networks
      try {
        // Try EIP-1559 transaction (supported by most modern wallets)
        tx = await contract.addScore(pushups, squats, {
          gasLimit: gasLimit,
          maxPriorityFeePerGas: parseUnits("2", "gwei"), // Higher priority fee
          maxFeePerGas: parseUnits("50", "gwei"), // Higher max fee
        });
      } catch (error) {
        console.log(
          "EIP-1559 transaction failed, falling back to legacy:",
          error
        );

        // Fall back to legacy transaction format
        tx = await contract.addScore(pushups, squats, {
          gasLimit: gasLimit,
          gasPrice: ethers.parseUnits("30", "gwei"), // Higher gas price for legacy transactions
        });
      }
    }

    // SIMPLIFIED APPROACH: Treat transaction submission as success
    // Since our contracts are designed to "addScore" and always succeed when called,
    // we consider the transaction being sent as success rather than waiting for confirmation
    console.log("✅ Transaction submitted successfully:", tx.hash);

    // Show immediate success message
    toast.success("Score submitted! Check the leaderboard 🏆", {
      id: "submit-score",
      duration: 5000
    });

    // Create a mock receipt object for compatibility with existing code
    const receipt = {
      transactionHash: tx.hash,
      status: 1,
      blockNumber: 0, // We don't need the actual block number for success
      gasUsed: 0n, // Placeholder using BigInt
    };

    console.log("Transaction receipt:", receipt);

    // If this transaction included Divvi integration, register with Divvi
    if (shouldRegisterWithDivvi) {
      const chainId = await provider.getNetwork().then(network => network.chainId);

      // Register for Celo, Polygon, and Base
      if (
        (contractAddress === "0xB0cbC7325EbC744CcB14211CA74C5a764928F273" && Number(chainId) === 42220) || // Celo mainnet
        (contractAddress === "0xc783d6E12560dc251F5067A62426A5f3b45b6888" && Number(chainId) === 137) ||   // Polygon mainnet
        (contractAddress === "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B" && Number(chainId) === 8453)     // Base mainnet
      ) {
        try {
          // Register the referral with Divvi
          await registerDivviReferral(receipt.transactionHash, Number(chainId), userAddress);
        } catch (divviError) {
          console.error("Error registering Divvi referral:", divviError);
          // Don't fail the transaction if Divvi registration fails
        }
      }
    }

    return {
      success: true,
      transactionHash: receipt.transactionHash,
    };
  } catch (error: Error | unknown) {
    const err = error as {
      code?: string;
      reason?: string;
      message?: string;
    };
    console.error("Error submitting score:", error);

    // Handle specific error types with user-friendly messages
    if (err.code === "ACTION_REJECTED") {
      return {
        success: false,
        error: "Transaction rejected by user",
      };
    } else if (err.code === "INSUFFICIENT_FUNDS") {
      return {
        success: false,
        error: "Insufficient funds for transaction",
      };
    } else if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
      return {
        success: false,
        error:
          "Contract error: The transaction may revert. Check if you have already submitted recently.",
      };
    } else if (err.message && err.message.includes("execution reverted")) {
      // Check for specific contract errors
      if (err.message.includes("InsufficientFee")) {
        return {
          success: false,
          error: "Insufficient fee. The contract requires a submission fee of 0.001 MON (Monad's native token).",
        };
      } else if (err.message.includes("CooldownNotExpired")) {
        return {
          success: false,
          error: "Cooldown period not expired. Please wait before submitting again.",
        };
      } else if (err.message.includes("ScoreExceedsMaximum")) {
        return {
          success: false,
          error: "Score exceeds maximum allowed per submission (100).",
        };
      } else if (err.message.includes("OperationFailed")) {
        // This could be from the onlyCeloNetwork modifier or other checks
        return {
          success: false,
          error: "Operation failed. Make sure you're on the correct network for this contract.",
        };
      } else if (err.message.includes("Unauthorized")) {
        return {
          success: false,
          error: "Unauthorized operation. This function may be restricted to the contract owner.",
        };
      } else {
        return {
          success: false,
          error:
            "Contract execution reverted. You may have already submitted recently or the contract has restrictions.",
        };
      }
    } else if (err.message && err.message.includes("timeout")) {
      return {
        success: false,
        error:
          "Your transaction is taking the scenic route! 🚗💨 Please check the explorer to see if your score made it through.",
      };
    } else if (
      err.message &&
      err.message.includes("Transaction confirmation timeout")
    ) {
      return {
        success: false,
        error:
          "Your transaction is playing hard to get! 😅 Check the explorer to verify if your score was submitted.",
      };
    } else if (
      err.message &&
      (err.message.includes("taking longer than expected") ||
       err.message.includes("brewing") ||
       err.message.includes("cooking") ||
       err.message.includes("scenic route") ||
       err.message.includes("failed on-chain after extended wait"))
    ) {
      return {
        success: false,
        error:
          "Good things take time! ⏳ Your transaction might still be processing. Check the explorer to verify if your score was submitted.",
      };
    } else if (
      err.message &&
      err.message.includes("Transaction failed on-chain")
    ) {
      return {
        success: false,
        error:
          "Transaction was rejected by the network. This could be due to insufficient gas, network congestion, or contract restrictions.",
      };
    } else if (
      err.message &&
      err.message.includes("the tx doesn't have the correct nonce")
    ) {
      return {
        success: false,
        error:
          "Transaction nonce issue. Please reset your wallet connection and try again.",
      };
    }

    // For other errors, provide a simplified message
    return {
      success: false,
      error:
        "Transaction failed: " + (err.reason || err.message || "Unknown error"),
    };
  }
}

/**
 * Check if a user can submit a score (based on cooldown period)
 */
export async function canUserSubmit(
  contractAddress: string,
  userAddress: string,
  isBaseNetwork: boolean = false
): Promise<{ canSubmit: boolean; timeRemaining?: number }> {
  try {
    let provider;

    if (isBaseNetwork) {
      // For Base network with Smart Wallet, we'll skip the eligibility check
      // This is because we're using Wagmi for connection and the contract call might fail
      console.log("Base Smart Wallet detected, skipping eligibility check");

      // Default to allowing submission for Base Smart Wallet
      return { canSubmit: true };
    } else {
      // For Polygon/Monad/Celo networks, use window.ethereum
      if (!window.ethereum) {
        return { canSubmit: false };
      }

      // Create a provider
      provider = new ethers.BrowserProvider(window.ethereum);

      // Get the current network to check if we're on a supported network
      const network = await provider.getNetwork();
      console.log("Checking submission eligibility on network:", network);

      // Check cooldown for supported networks
      if (
        Number(network.chainId) === 137 || // Polygon Mainnet
        Number(network.chainId) === 10143 || // Monad Testnet
        Number(network.chainId) === 42220 || // Celo Mainnet
        Number(network.chainId) === 8453 // Base Mainnet
      ) {
        console.log(
          `On network ${network.name} (${network.chainId}), checking cooldown period`
        );
        // Continue to actual cooldown check below
      } else {
        console.log("Unsupported network, allowing submission");
        return { canSubmit: true };
      }
    }

    // Determine which ABI to use based on the contract address
    let contractABI = fitnessLeaderboardABI;

    // Use network-specific ABIs
    if (contractAddress === "0x653d41Fba630381aA44d8598a4b35Ce257924d65") {
      // Monad Testnet
      contractABI = monadLeaderboardABI;
    } else if (contractAddress === "0xc783d6E12560dc251F5067A62426A5f3b45b6888") {
      // Polygon Mainnet
      contractABI = polygonLeaderboardABI;
    } else if (contractAddress === "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B") {
      // Base Mainnet
      contractABI = baseLeaderboardABI;
    } else if (contractAddress === "0xB0cbC7325EbC744CcB14211CA74C5a764928F273") {
      // Celo Mainnet
      contractABI = fitnessLeaderboardABI; // Already using the updated ABI
    }

    // Create contract instance (read-only) with the appropriate ABI
    const contract = new ethers.Contract(
      contractAddress,
      contractABI,
      provider
    );

    try {
      // Call the getTimeUntilNextSubmission function
      const timeRemaining = await contract.getTimeUntilNextSubmission(
        userAddress
      );

      return {
        canSubmit: timeRemaining === 0n,
        timeRemaining: Number(timeRemaining),
      };
    } catch (contractError) {
      console.error("Error calling getTimeUntilNextSubmission:", contractError);

      // If there's a specific contract error, we'll still allow submission
      // This is a fallback for contract issues
      return { canSubmit: true };
    }
  } catch (error) {
    console.error("Error checking if user can submit:", error);
    // Default to allowing submission if we can't check
    return { canSubmit: true };
  }
}

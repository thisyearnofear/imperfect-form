/**
 * Contract Interaction Helper Utilities
 * 
 * Clean, modular utilities for smart contract interactions
 * Maintains DRY principles and provides consistent interfaces
 * across the application for contract operations.
 */

import { ethers } from "ethers";
import { createTransactionOptions, parseEther } from "./ethersHelpers";
import { enhanceTransactionWithDivvi, completeDivviWorkflow, isValidDivviAddress } from "./divviHelpers";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ContractSubmissionParams {
  contractAddress: string;
  abi: ethers.InterfaceAbi;
  functionName: string;
  args: unknown[];
  userAddress: string;
  chainId: number;
  value?: bigint;
  provider?: unknown;
}

export interface SubmissionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  processingType?: string;
  divviResult?: {
    success: boolean;
    isFirstTime?: boolean;
    error?: string;
  };
}

// =============================================================================
// CORE CONTRACT UTILITIES
// =============================================================================

/**
 * Submit a transaction to a smart contract with Divvi integration
 * @param params - Contract submission parameters
 * @returns Promise resolving to submission result
 */
export async function submitContractTransaction(
  params: ContractSubmissionParams
): Promise<SubmissionResult> {
  const {
    contractAddress,
    abi,
    functionName,
    args,
    userAddress,
    chainId,
    value = 0n,
    provider: providedProvider
  } = params;

  try {
    // Validate inputs
    if (!isValidDivviAddress(userAddress)) {
      throw new Error("Invalid user address");
    }

    if (!isValidDivviAddress(contractAddress)) {
      throw new Error("Invalid contract address");
    }

    // Create provider and signer
    const ethereumProvider = providedProvider || window.ethereum;
    if (!ethereumProvider) {
      throw new Error("No Ethereum provider found");
    }

    const provider = new ethers.BrowserProvider(ethereumProvider as ethers.Eip1193Provider);
    const signer = await provider.getSigner();

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, signer);

    // Prepare transaction data
    const iface = new ethers.Interface(abi);
    const originalData = iface.encodeFunctionData(functionName, args);

    // Enhance with Divvi referral tracking
    const enhancedData = enhanceTransactionWithDivvi({
      userAddress,
      originalData,
      chainId
    });

    // Create transaction options
    const baseGasLimit = await contract[functionName].estimateGas(...args, { value });
    const txOptions = createTransactionOptions(chainId, baseGasLimit);

    // Send transaction
    const tx = await signer.sendTransaction({
      to: contractAddress,
      data: enhancedData,
      value: value || txOptions.value,
      gasLimit: txOptions.gasLimit,
      gasPrice: txOptions.gasPrice,
      maxFeePerGas: txOptions.maxFeePerGas,
      maxPriorityFeePerGas: txOptions.maxPriorityFeePerGas,
    });

    console.log("Transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (!receipt || receipt.status !== 1) {
      throw new Error("Transaction failed");
    }

    // Handle Divvi post-transaction workflow
    const divviResult = await completeDivviWorkflow({
      userAddress,
      chainId,
      originalData,
      txHash: tx.hash
    });

    return {
      success: true,
      transactionHash: tx.hash,
      processingType: "direct_contract",
      divviResult
    };

  } catch (error) {
    console.error("Contract submission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      processingType: "direct_contract"
    };
  }
}

/**
 * Estimate gas for a contract function call
 * @param params - Contract parameters
 * @returns Promise resolving to estimated gas
 */
export async function estimateContractGas(
  params: Omit<ContractSubmissionParams, 'userAddress' | 'chainId'>
): Promise<bigint> {
  const { contractAddress, abi, functionName, args, value = 0n, provider: providedProvider } = params;

  try {
    const ethereumProvider = providedProvider || window.ethereum;
    if (!ethereumProvider) {
      throw new Error("No Ethereum provider found");
    }

    const provider = new ethers.BrowserProvider(ethereumProvider as ethers.Eip1193Provider);
    const contract = new ethers.Contract(contractAddress, abi, provider);

    return await contract[functionName].estimateGas(...args, { value });
  } catch (error) {
    console.error("Gas estimation error:", error);
    // Return a reasonable default
    return parseEther("0.1");
  }
}

/**
 * Check if a user can submit to a contract (has sufficient balance, etc.)
 * @param params - Contract parameters
 * @returns Promise resolving to whether user can submit
 */
export async function canUserSubmitToContract(
  params: ContractSubmissionParams
): Promise<{ canSubmit: boolean; reason?: string }> {
  const { userAddress, value = 0n, provider: providedProvider } = params;

  try {
    if (!isValidDivviAddress(userAddress)) {
      return { canSubmit: false, reason: "Invalid user address" };
    }

    const ethereumProvider = providedProvider || window.ethereum;
    if (!ethereumProvider) {
      return { canSubmit: false, reason: "No Ethereum provider found" };
    }

    const provider = new ethers.BrowserProvider(ethereumProvider as ethers.Eip1193Provider);
    const balance = await provider.getBalance(userAddress);

    // Estimate gas cost
    const estimatedGas = await estimateContractGas(params);
    const gasPrice = (await provider.getFeeData()).gasPrice || parseEther("0.00002"); // 20 gwei default
    const estimatedCost = estimatedGas * gasPrice + value;

    if (balance < estimatedCost) {
      return { 
        canSubmit: false, 
        reason: `Insufficient balance. Need ${ethers.formatEther(estimatedCost)} ETH, have ${ethers.formatEther(balance)} ETH` 
      };
    }

    return { canSubmit: true };
  } catch (error) {
    console.error("Error checking user submission capability:", error);
    return { canSubmit: false, reason: "Error checking balance" };
  }
}

// =============================================================================
// NETWORK-SPECIFIC UTILITIES
// =============================================================================

/**
 * Get network-specific contract configuration
 * @param chainId - Chain ID
 * @returns Network configuration
 */
export function getNetworkConfig(chainId: number) {
  const configs = {
    137: { name: "Polygon", requiresValue: false, gasMultiplier: 2 },
    8453: { name: "Base", requiresValue: false, gasMultiplier: 1 },
    42220: { name: "Celo", requiresValue: false, gasMultiplier: 3 },
    10143: { name: "Monad", requiresValue: true, gasMultiplier: 2 },
  };

  return configs[chainId as keyof typeof configs] || { 
    name: "Unknown", 
    requiresValue: false, 
    gasMultiplier: 1.5 
  };
}

/**
 * Check if network requires special handling
 * @param chainId - Chain ID
 * @returns Boolean indicating if special handling is needed
 */
export function requiresSpecialHandling(chainId: number): boolean {
  return chainId === 10143; // Monad requires submission fee
}
/**
 * CONSOLIDATED SUBMISSION INTERFACE
 * ENHANCEMENT: Single entry point replacing all legacy submission methods
 * AGGRESSIVE CONSOLIDATION: Eliminates directContractInteraction.ts completely
 */

import { contractService } from "@/services/ContractService";
import { walletService } from "@/services/WalletService";
import { walletDetectionService } from "@/services/WalletDetectionService";
import { getNetworkByContractAddress } from "@/config/networks";
import { ScoreSubmissionResult } from "@/types/contracts";
import toast from "react-hot-toast";

/**
 * Submission parameters interface
 * CONSOLIDATION: Unified parameter structure
 */
export interface SubmissionParams {
  pushups: number;
  squats: number;
  contractAddress: string;
  networkName: string;
  connectedAddress?: string;
  skipSubAccountCheck?: boolean;
  useWagmi?: boolean;
  providedEthereumProvider?: unknown;
}

/**
 * SINGLE SOURCE OF TRUTH for all score submissions
 * CONSOLIDATION: Replaces submitScoreDirectly, submitScoreV2, and all variants
 */
export async function submitScore(
  pushups: number,
  squats: number,
  contractAddress: string,
  networkName: string,
  connectedAddress?: string,
  options: {
    skipSubAccountCheck?: boolean;
    useWagmi?: boolean;
    providedEthereumProvider?: unknown;
  } = {}
): Promise<ScoreSubmissionResult> {
  try {
    // Input validation with clear error messages
    if (!contractAddress || !networkName) {
      throw new Error("Contract address and network name are required");
    }

    if (pushups < 0 || squats < 0 || pushups > 10000 || squats > 10000) {
      throw new Error("Score values must be between 0 and 10000");
    }

    // Get network configuration
    const networkConfig = getNetworkByContractAddress(contractAddress);
    if (!networkConfig) {
      throw new Error(`Unsupported contract address: ${contractAddress}`);
    }

    // Check current network and switch if needed
    const currentChainId = walletService.getChainId();
    if (currentChainId && currentChainId !== networkConfig.chainId) {
      toast.loading("Switching network...", { id: "network-switch" });
      
      const switched = await walletService.switchNetwork(networkConfig.chainId);
      if (!switched) {
        throw new Error(`Please switch to ${networkConfig.name} in your wallet`);
      }
      
      toast.success("Network switched successfully", { id: "network-switch" });
    }

    // Initialize services if needed
    if (!walletService.isConnected()) {
      await walletService.connect(connectedAddress);
    }

    if (!contractService.isInitialized()) {
      await contractService.initialize(connectedAddress);
    }

    // Route to appropriate submission method
    return await contractService.submitScore(
      pushups,
      squats,
      contractAddress,
      networkName,
      connectedAddress,
      options.skipSubAccountCheck
    );

  } catch (error) {
    console.error("Unified submission failed:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Get user's current score with caching
 * ENHANCEMENT: Optimized score retrieval with error handling
 */
export async function getUserScore(
  contractAddress: string,
  userAddress?: string
): Promise<{ pushups: number; squats: number; totalScore: number } | null> {
  try {
    // Ensure services are initialized
    if (!walletService.isConnected()) {
      await walletService.connect(userAddress);
    }

    if (!contractService.isInitialized()) {
      await contractService.initialize(userAddress);
    }

    const score = await contractService.getUserScore(contractAddress);
    
    if (score) {
      return {
        ...score,
        totalScore: score.pushups + score.squats
      };
    }
    
    return null;
  } catch (error) {
    console.error("Failed to get user score:", error);
    return null;
  }
}

/**
 * Check network compatibility and wallet capabilities
 * ENHANCEMENT: Comprehensive pre-flight checks
 */
export function checkSubmissionCompatibility(contractAddress: string): {
  isCompatible: boolean;
  networkMatch: boolean;
  walletCapabilities: ReturnType<typeof walletDetectionService.detectWalletCapabilities>;
  recommendations: string[];
} {
  const networkConfig = getNetworkByContractAddress(contractAddress);
  const currentChainId = walletService.getChainId();
  const capabilities = walletDetectionService.detectWalletCapabilities();
  
  const networkMatch = !!(networkConfig && currentChainId === networkConfig.chainId);
  const recommendations: string[] = [];
  
  if (!networkMatch && networkConfig) {
    recommendations.push(`Switch to ${networkConfig.name} network`);
  }
  
  if (networkConfig?.chainId === 8453 && capabilities.type !== 'coinbase') {
    recommendations.push("Consider using Coinbase Wallet for optimal Base network experience");
  }
  
  if (!capabilities.isInjected) {
    recommendations.push("Install a browser wallet extension");
  }
  
  return {
    isCompatible: networkMatch && capabilities.isInjected,
    networkMatch,
    walletCapabilities: capabilities,
    recommendations
  };
}

/**
 * Get network switching prompt message
 * CONSOLIDATION: Unified messaging
 */
export function getNetworkSwitchMessage(contractAddress: string): string {
  const networkConfig = getNetworkByContractAddress(contractAddress);
  if (!networkConfig) {
    return "Unknown network required";
  }
  
  return `Please switch to ${networkConfig.name} to continue`;
}

/**
 * Legacy compatibility wrapper - DEPRECATED
 * MIGRATION: Use submitScore() for new implementations
 * @deprecated Use submitScore() instead
 */
export async function submitScoreDirectly(
  pushups: number,
  squats: number,
  contractAddress: string,
  networkName: string,
  connectedAddress?: string,
  skipSubAccountCheck = false
): Promise<ScoreSubmissionResult> {
  console.warn("submitScoreDirectly is deprecated. Use submitScore() instead.");
  
  return submitScore(pushups, squats, contractAddress, networkName, connectedAddress, {
    skipSubAccountCheck
  });
}

/**
 * Check if the current network matches the contract's network
 * CONSOLIDATION: Unified network checking
 */
export function isCorrectNetwork(contractAddress: string): boolean {
  const networkConfig = getNetworkByContractAddress(contractAddress);
  const currentChainId = walletService.getChainId();
  
  return !!(networkConfig && currentChainId === networkConfig.chainId);
}

/**
 * Get wallet detection utilities
 * ENHANCEMENT: Expose wallet capabilities for UI components
 */
export function getWalletCapabilities() {
  return {
    detect: () => walletDetectionService.detectWalletCapabilities(),
    isCoinbaseWallet: () => walletDetectionService.isCoinbaseWalletActive(),
    supportsBaseSmartWallet: () => walletDetectionService.supportsBaseSmartWallet(),
    getSuggestion: () => walletDetectionService.getCoinbaseWalletSuggestion()
  };
}

/**
 * Show submission result with user feedback
 * CONSOLIDATION: Unified result display
 */
export function showSubmissionResult(result: ScoreSubmissionResult): void {
  if (result.success) {
    toast.success(`Score submitted successfully! ${result.transactionHash ? `TX: ${result.transactionHash.slice(0, 10)}...` : ''}`, {
      duration: 5000
    });
  } else {
    toast.error(result.error || "Submission failed", {
      duration: 5000
    });
  }
}

/**
 * Check if user can submit based on current state
 * ENHANCEMENT: Comprehensive submission eligibility check
 */
export function canUserSubmit(contractAddress: string): {
  canSubmit: boolean;
  reason?: string;
  suggestions: string[];
} {
  const compatibility = checkSubmissionCompatibility(contractAddress);
  const isConnected = walletService.isConnected();
  
  if (!isConnected) {
    return {
      canSubmit: false,
      reason: "Wallet not connected",
      suggestions: ["Connect your wallet to continue"]
    };
  }
  
  if (!compatibility.isCompatible) {
    return {
      canSubmit: false,
      reason: compatibility.networkMatch ? "Wallet compatibility issues" : "Wrong network",
      suggestions: compatibility.recommendations
    };
  }
  
  return {
    canSubmit: true,
    suggestions: compatibility.recommendations
  };
}
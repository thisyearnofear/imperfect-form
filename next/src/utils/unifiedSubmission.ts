/**
 * Unified Score Submission Utility
 * 
 * Clean, DRY, performant solution that consolidates all score submission logic
 * Eliminates duplication and provides better UX with minimal notification spam
 */

import { ethers } from "ethers";
import toast from "react-hot-toast";
import { submitScoreDirectly } from "./directContractInteraction";
import {
  isFirstTimeDivviUser,
  showEnhancedFeaturesPrompt,
  registerDivviReferral
} from "./divviIntegration";
import { getEthereumProvider } from "./farcasterMiniApp";
import {
  POLYGON_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
  fitnessLeaderboardABI,
} from "@/constants/contracts";

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SubmissionParams {
  score: number;
  exerciseType: "pushups" | "squats";
  userAddress: string;
  chainId: number;
  provider?: unknown;
  useWagmi?: boolean;
  wagmiWriteContract?: (params: {
    address: `0x${string}`;
    abi: readonly unknown[];
    functionName: string;
    args: readonly unknown[];
    chainId?: number;
  }) => void;
}

export interface SubmissionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  processingType: "wagmi" | "direct" | "divvi_direct";
  divviRegistered?: boolean;
}

// =============================================================================
// CORE SUBMISSION LOGIC
// =============================================================================

/**
 * Get contract address for the given chain ID
 */
function getContractAddress(chainId: number): string {
  const addressMap: Record<number, string> = {
    137: POLYGON_CONTRACT_ADDRESS,    // Polygon
    8453: BASE_CONTRACT_ADDRESS,      // Base
    10143: MONAD_CONTRACT_ADDRESS,    // Monad
    42220: CELO_CONTRACT_ADDRESS,     // Celo
  };
  
  const address = addressMap[chainId];
  if (!address) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  
  return address;
}

/**
 * Check if user needs Divvi onboarding (silent)
 */
async function handleDivviOnboardingIfNeeded(
  userAddress: string, 
  chainId: number
): Promise<boolean> {
  try {
    const isFirstTime = await isFirstTimeDivviUser(userAddress, chainId);
    if (isFirstTime) {
      console.log("First-time Divvi user detected (silent onboarding)");
      await showEnhancedFeaturesPrompt();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking Divvi status:", error);
    return false;
  }
}

/**
 * Submit score using wagmi (without Divvi integration)
 */
async function submitWithWagmi(
  params: SubmissionParams
): Promise<SubmissionResult> {
  const { score, exerciseType, chainId, wagmiWriteContract } = params;
  
  if (!wagmiWriteContract) {
    throw new Error("wagmiWriteContract function is required for wagmi submission");
  }
  
  try {
    const contractAddress = getContractAddress(chainId);
    const pushups = exerciseType === "pushups" ? score : 0;
    const squats = exerciseType === "squats" ? score : 0;
    
    // Use wagmi for standard submission
    wagmiWriteContract({
      address: contractAddress as `0x${string}`,
      abi: fitnessLeaderboardABI,
      functionName: "addScore",
      args: [BigInt(pushups), BigInt(squats)],
      chainId: chainId,
    });
    
    return {
      success: true,
      processingType: "wagmi"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Wagmi submission failed",
      processingType: "wagmi"
    };
  }
}

/**
 * Submit score using direct contract interaction (with Divvi integration)
 */
async function submitWithDivvi(
  params: SubmissionParams
): Promise<SubmissionResult> {
  const { score, exerciseType, userAddress, chainId, provider } = params;
  
  try {
    const contractAddress = getContractAddress(chainId);
    const pushups = exerciseType === "pushups" ? score : 0;
    const squats = exerciseType === "squats" ? score : 0;
    
    // Handle Divvi onboarding if needed (silent)
    await handleDivviOnboardingIfNeeded(userAddress, chainId);
    
    // Use direct submission with Divvi integration
    // Ensure we have a provider - use proper detection for Farcaster Mini Apps
    let ethereumProvider = provider;
    if (!ethereumProvider) {
      ethereumProvider = await getEthereumProvider();
    }

    const result = await submitScoreDirectly(
      contractAddress,
      pushups,
      squats,
      chainId === 8453, // isBaseNetwork
      userAddress,
      true, // skipSubAccountCheck - sub-accounts not live on mainnet
      ethereumProvider
    );
    
    if (result.success && result.transactionHash) {
      // Register with Divvi if successful (silent)
      try {
        await registerDivviReferral(result.transactionHash, chainId, userAddress);
        return {
          ...result,
          processingType: "divvi_direct",
          divviRegistered: true
        };
      } catch (divviError) {
        console.error("Divvi registration failed:", divviError);
        return {
          ...result,
          processingType: "divvi_direct",
          divviRegistered: false
        };
      }
    }
    
    return {
      ...result,
      processingType: "divvi_direct"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Direct submission failed",
      processingType: "divvi_direct"
    };
  }
}

// =============================================================================
// MAIN SUBMISSION FUNCTION
// =============================================================================

/**
 * Unified score submission function
 * Automatically chooses the best submission method based on context
 */
export async function submitScore(params: SubmissionParams): Promise<SubmissionResult> {
  const { userAddress, chainId } = params;
  
  try {
    // Validate inputs
    if (!userAddress || !userAddress.startsWith('0x')) {
      throw new Error("Invalid user address");
    }
    
    if (!chainId || chainId <= 0) {
      throw new Error("Invalid chain ID");
    }
    
    // Check if user is first-time Divvi user
    const isFirstTimeDivviUser_result = await isFirstTimeDivviUser(userAddress, chainId);
    
    // If first-time user or Base network, use Divvi integration
    if (isFirstTimeDivviUser_result || chainId === 8453) {
      console.log("Using Divvi-integrated submission");
      return await submitWithDivvi(params);
    }
    
    // Otherwise, use standard wagmi submission
    console.log("Using standard wagmi submission");
    return await submitWithWagmi(params);
    
  } catch (error) {
    console.error("Submission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown submission error",
      processingType: "direct"
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Show appropriate success/error messages with improved UX
 */
export function showSubmissionResult(result: SubmissionResult): void {
  if (result.success) {
    // Simple, clean success message - no technical details
    toast.success("Score submitted! Check the leaderboard", { 
      duration: 3000,
      style: {
        background: '#10B981', // Green background
        color: '#FFFFFF',      // White text
        fontWeight: '600',
        border: '1px solid #059669',
      }
    });
  } else {
    toast.error(result.error || "Submission failed", { 
      duration: 4000,
      style: {
        background: '#EF4444', // Red background
        color: '#FFFFFF',      // White text
        fontWeight: '600',
        border: '1px solid #DC2626',
      }
    });
  }
}

/**
 * Check if user can submit (has sufficient balance, etc.)
 */
export async function canUserSubmit(
  userAddress: string,
  chainId: number,
  provider?: unknown
): Promise<{ canSubmit: boolean; reason?: string }> {
  try {
    if (!userAddress || !userAddress.startsWith('0x')) {
      return { canSubmit: false, reason: "Invalid user address" };
    }
    
    let ethereumProvider = provider;
    if (!ethereumProvider) {
      ethereumProvider = await getEthereumProvider();
    }
    if (!ethereumProvider) {
      return { canSubmit: false, reason: "No Ethereum provider found" };
    }
    
    const ethProvider = new ethers.BrowserProvider(ethereumProvider as ethers.Eip1193Provider);
    const balance = await ethProvider.getBalance(userAddress);
    
    // Check minimum balance (0.001 ETH for gas)
    const minBalance = ethers.parseEther("0.001");
    if (balance < minBalance) {
      return { 
        canSubmit: false, 
        reason: `Insufficient balance. Need at least ${ethers.formatEther(minBalance)} ETH for gas fees.` 
      };
    }
    
    return { canSubmit: true };
  } catch (error) {
    console.error("Error checking user submission capability:", error);
    return { canSubmit: false, reason: "Error checking balance" };
  }
}

/**
 * Check if address is valid for operations
 */
export function isValidAddress(address: string | undefined): address is string {
  return Boolean(address && address.startsWith('0x') && address.length === 42);
}
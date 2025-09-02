/**
 * CONSOLIDATED SUBMISSION INTERFACE
 * ENHANCEMENT: Single entry point replacing all legacy submission methods
 * AGGRESSIVE CONSOLIDATION: Eliminates directContractInteraction.ts completely
 */

import { walletDetectionService } from '@/services/WalletDetectionService';
import { getNetworkByContractAddress } from '@/config/networks';
import { ScoreSubmissionResult } from '@/types/contracts';
import { validateWalletForSubmission } from '@/utils/walletUtils';
import { WalletState } from '@/contexts/PlatformContext';
import { ethers } from 'ethers';
import { getEthereumProvider } from '@/utils/farcasterMiniApp';
import { addReferralTagToCalldata, registerDivviReferral } from '@/utils/divviIntegration';
import { estimateGasWithBuffer, getSignerFromProvider } from '@/utils/ethersHelpers';
import toast from 'react-hot-toast';

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
  chainId?: number;
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
    chainId?: number;
    skipSubAccountCheck?: boolean;
    useWagmi?: boolean;
    providedEthereumProvider?: unknown;
  } = {}
): Promise<ScoreSubmissionResult> {
  try {
    // Input validation with clear error messages
    if (!contractAddress || !networkName) {
      throw new Error('Contract address and network name are required');
    }

    if (pushups < 0 || squats < 0 || pushups > 10000 || squats > 10000) {
      throw new Error('Score values must be between 0 and 10000');
    }

    if (!connectedAddress) {
      throw new Error('Connected address is required');
    }

    // Get network configuration
    const networkConfig = getNetworkByContractAddress(contractAddress);
    if (!networkConfig) {
      throw new Error(`Unsupported contract address: ${contractAddress}`);
    }

    // Get Ethereum provider using existing consolidated utilities
    const ethereumProvider = options.providedEthereumProvider || (await getEthereumProvider());

    if (!ethereumProvider) {
      throw new Error('No Ethereum provider available. Please connect your wallet and try again.');
    }

    // Enhanced provider validation using existing patterns
    if (typeof ethereumProvider !== 'object' || !('request' in ethereumProvider)) {
      throw new Error('Invalid Ethereum provider. Please reconnect your wallet and try again.');
    }

    const signer = await getSignerFromProvider(ethereumProvider);

    // Verify the signer address matches connected address
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== connectedAddress.toLowerCase()) {
      throw new Error('Signer address does not match connected address');
    }

    // Additional check: verify we're on the correct network
    const network = await signer.provider?.getNetwork();
    if (network && network.chainId !== BigInt(networkConfig.chainId)) {
      throw new Error(`Please switch to ${networkConfig.name} network to submit your score`);
    }

    // Create contract instance
    const contract = new ethers.Contract(contractAddress, networkConfig.abi, signer);

    // Prepare transaction with consolidated gas estimation
    const gasLimit = await estimateGasWithBuffer(contract, 'addScore', [pushups, squats]);

    // Add referral tag if applicable
    const calldata = contract.interface.encodeFunctionData('addScore', [pushups, squats]);
    const taggedCalldata = addReferralTagToCalldata(connectedAddress, calldata);

    // Submit transaction
    const tx = await signer.sendTransaction({
      to: contractAddress,
      data: taggedCalldata,
      gasLimit: gasLimit,
    });

    toast.loading(`Submitting to ${networkName}...`, { id: 'submission' });

    // Wait for confirmation
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
      toast.success(`Score submitted to ${networkName}!`, { id: 'submission' });

      // Register Divvi referral if applicable
      try {
        await registerDivviReferral(tx.hash, options.chainId || 1);
      } catch (referralError) {
        console.warn('Referral registration failed:', referralError);
        // Don't fail the submission for referral errors
      }

      return {
        success: true,
        transactionHash: tx.hash,
        processingType: 'direct',
      };
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Score submission failed:', error);

    // More specific error messages for common issues
    let errorMessage = 'Submission failed. Please try again.';
    if (error instanceof Error) {
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        errorMessage = 'Transaction was rejected. Please confirm the transaction in your wallet.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction. Please check your wallet balance.';
      } else if (error.message.includes('network') || error.message.includes('chain')) {
        errorMessage = 'Network error. Please check your wallet network settings.';
      } else {
        errorMessage = error.message;
      }
    }

    toast.error(errorMessage, { id: 'submission' });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingType: 'direct',
    };
  }
}

/**
 * Get user's current score - delegates to existing leaderboard system
 * CONSOLIDATION: Uses existing robust contract reading infrastructure
 */
export async function getUserScore(
  _contractAddress: string,
  _userAddress?: string
): Promise<{ pushups: number; squats: number; totalScore: number } | null> {
  // CONSOLIDATION: Don't duplicate contract reading - use existing leaderboard system
  // The leaderboard system in leaderboardData.ts already handles:
  // - Fallback RPC support
  // - Proper ABI selection per network
  // - BigNumber parsing
  // - Error handling and retries
  // - Caching for performance

  // Users should use useUserStats hook which extracts data from cached leaderboard
  console.info('getUserScore: Use useUserStats hook for better performance and consistency');
  return null;
}

/**
 * Check network compatibility and wallet capabilities
 * ENHANCEMENT: Comprehensive pre-flight checks
 */
export function checkSubmissionCompatibility(
  contractAddress: string,
  currentChainId?: number
): {
  isCompatible: boolean;
  networkMatch: boolean;
  walletCapabilities: ReturnType<typeof walletDetectionService.detectWalletCapabilities>;
  recommendations: string[];
} {
  const networkConfig = getNetworkByContractAddress(contractAddress);
  const capabilities = walletDetectionService.detectWalletCapabilities();

  const networkMatch = !!(networkConfig && currentChainId === networkConfig.chainId);
  const recommendations: string[] = [];

  if (!networkMatch && networkConfig) {
    recommendations.push(`Switch to ${networkConfig.name} network`);
  }

  if (networkConfig?.chainId === 8453 && capabilities.type !== 'coinbase') {
    recommendations.push('Consider using Coinbase Wallet for optimal Base network experience');
  }

  if (!capabilities.isInjected) {
    recommendations.push('Install a browser wallet extension');
  }

  return {
    isCompatible: networkMatch && capabilities.isInjected,
    networkMatch,
    walletCapabilities: capabilities,
    recommendations,
  };
}

/**
 * Get network switching prompt message
 * CONSOLIDATION: Unified messaging
 */
export function getNetworkSwitchMessage(contractAddress: string): string {
  const networkConfig = getNetworkByContractAddress(contractAddress);
  if (!networkConfig) {
    return 'Unknown network required';
  }

  return `Please switch to ${networkConfig.name} to continue`;
}

/**
 * Check if the current network matches the contract's network
 * CONSOLIDATION: Unified network checking
 */
export function isCorrectNetwork(contractAddress: string, chainId?: number): boolean {
  const networkConfig = getNetworkByContractAddress(contractAddress);

  return !!(networkConfig && chainId === networkConfig.chainId);
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
    getSuggestion: () => walletDetectionService.getCoinbaseWalletSuggestion(),
  };
}

/**
 * Show submission result with user feedback
 * CONSOLIDATION: Unified result display
 */
export function showSubmissionResult(result: ScoreSubmissionResult): void {
  if (result.success) {
    toast.success(
      `Score submitted successfully! ${result.transactionHash ? `TX: ${result.transactionHash.slice(0, 10)}...` : ''}`,
      {
        duration: 5000,
      }
    );
  } else {
    toast.error(result.error || 'Submission failed', {
      duration: 5000,
    });
  }
}

/**
 * Check if user can submit based on wallet state
 * ENHANCEMENT: Uses unified wallet utilities
 */
export function canUserSubmit(
  wallet: WalletState,
  contractAddress?: string
): {
  canSubmit: boolean;
  reason?: string;
  suggestions: string[];
} {
  // Get required chain ID if contract address provided
  let requiredChainId: number | undefined;
  if (contractAddress) {
    const networkConfig = getNetworkByContractAddress(contractAddress);
    requiredChainId = networkConfig?.chainId;
  }

  // Use unified wallet validation
  const validation = validateWalletForSubmission(wallet, requiredChainId);

  if (!validation.isValid) {
    return {
      canSubmit: false,
      reason: validation.reason,
      suggestions: validation.suggestions,
    };
  }

  // Additional compatibility checks if contract address provided
  if (contractAddress && wallet.chainId) {
    const compatibility = checkSubmissionCompatibility(contractAddress, wallet.chainId);

    if (!compatibility.isCompatible) {
      return {
        canSubmit: false,
        reason: compatibility.networkMatch ? 'Wallet compatibility issues' : 'Wrong network',
        suggestions: compatibility.recommendations,
      };
    }
  }

  return {
    canSubmit: true,
    suggestions: [],
  };
}

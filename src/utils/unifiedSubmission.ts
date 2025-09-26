/**
 * CONSOLIDATED SUBMISSION INTERFACE
 * ENHANCEMENT: Single entry point replacing all legacy submission methods
 * AGGRESSIVE CONSOLIDATION: Eliminates directContractInteraction.ts completely
 *
 * ENHANCED: Now uses robust error handling and provider management
 */

import { walletDetectionService } from '@/services/WalletDetectionService';
import { getNetworkByContractAddress } from '@/config/networks';
import { ScoreSubmissionResult } from '@/types/contracts';
import { validateWalletForSubmission } from '@/utils/walletUtils';
import { WalletState } from '@/contexts/PlatformContext';
import { ethers } from 'ethers';
import {
  getEthereumProvider,
  isFarcasterMiniApp,
  handleFarcasterError,
} from '@/utils/farcasterMiniApp';
import { addReferralTagToCalldata, registerDivviReferral } from '@/utils/divviIntegration';
import { estimateGasWithBuffer, getSignerFromProvider } from '@/utils/ethersHelpers';
import toast from 'react-hot-toast';
import { verifiedFitnessLeaderboardABI } from '@/constants/contracts';
import {
  applyBrowserSpecificFixes,
  getProviderForPrivacyBrowsers,
  submitScoreDirect,
} from '@/utils/farcasterMiniApp';

// CONSOLIDATED: Import from the new consolidated web3 error handling module
import {
  initializeWeb3Robustly,
  CommonErrorHandlers,
  preventiveWalletConnectCleanup,
  initializeProviderSafely,
} from '@/utils/web3ErrorHandling';

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
  isVerifiedSubmission?: boolean; // New parameter for verified submissions
}

/*
 * SINGLE SOURCE OF TRUTH for all score submissions
 * CONSOLIDATION: Replaces submitScoreDirectly, submitScoreV2, and all variants
 *
 * ENHANCEMENT: Now includes fallback to simpler direct submission for compatibility
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
    isVerifiedSubmission?: boolean;
  } = {}
): Promise<ScoreSubmissionResult> {
  try {
    // CONSOLIDATED: Use single robust initialization
    await preventiveWalletConnectCleanup();

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

    // Apply browser-specific fixes before attempting to get provider
    await applyBrowserSpecificFixes();

    // ENHANCEMENT FIRST: Use existing consolidated provider logic
    let ethereumProvider = options.providedEthereumProvider;
    if (!ethereumProvider) {
      // Use the enhanced provider access for privacy browsers (like Brave)
      // This handles potential delays and conflicts in provider availability
      ethereumProvider = await getProviderForPrivacyBrowsers();

      // Fallback to robust initialization if needed
      if (!ethereumProvider) {
        const web3Setup = await initializeWeb3Robustly(networkConfig.chainId);
        if (!web3Setup.success) {
          throw new Error('Failed to initialize Web3 provider');
        }
        ethereumProvider = web3Setup.provider;
      }
    }

    // ENHANCEMENT: Enhanced provider validation with Farcaster-specific handling
    if (
      !ethereumProvider ||
      typeof ethereumProvider !== 'object' ||
      !('request' in ethereumProvider)
    ) {
      // Check if we're in Farcaster context for better error messaging
      const isFarcasterContext = isFarcasterMiniApp();
      const errorMsg = isFarcasterContext
        ? 'Farcaster wallet provider not available. Please ensure your wallet is connected in the Farcaster app and try again.'
        : 'Invalid Ethereum provider. Please reconnect your wallet and try again.';
      throw new Error(errorMsg);
    }

    const signer = await getSignerFromProvider(ethereumProvider);

    // Get the actual signer address and use it as the authoritative source
    const signerAddress = await signer.getAddress();

    // Log address comparison for debugging
    console.log('Address comparison:', {
      connectedAddress,
      signerAddress,
      match: signerAddress.toLowerCase() === connectedAddress?.toLowerCase(),
    });

    // Use the signer address as the authoritative source instead of failing
    // This handles cases where Farcaster or other providers return different addresses
    // than what the UI state thinks is connected
    const actualAddress = signerAddress;

    // Only warn if addresses don't match, but continue with signer address
    if (connectedAddress && signerAddress.toLowerCase() !== connectedAddress.toLowerCase()) {
      console.warn('Signer address differs from connected address, using signer address:', {
        expected: connectedAddress,
        actual: signerAddress,
      });
    }

    // Additional check: verify we're on the correct network
    const network = await signer.provider?.getNetwork();
    if (network && network.chainId !== BigInt(networkConfig.chainId)) {
      // Try to automatically switch to the correct network using platform capabilities
      let switchResult = false;
      try {
        // Import platform context to get switchChain functionality
        const { getEthereumProvider, isBraveBrowser, applyBrowserSpecificFixes } = await import(
          '@/utils/farcasterMiniApp'
        );

        // Apply browser-specific fixes before network switching
        if (isBraveBrowser()) {
          await applyBrowserSpecificFixes();
        }

        // Try to switch the network using the Ethereum provider
        const provider = await getEthereumProvider();
        if (provider && typeof provider.request === 'function') {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${networkConfig.chainId.toString(16)}` }],
          });
          switchResult = true;
        }
      } catch (switchError) {
        console.warn('Automatic network switch failed:', switchError);
      }

      if (!switchResult) {
        throw new Error(`Please switch to ${networkConfig.name} network to submit your score`);
      }
    }

    // Check if this is the verified fitness contract
    const isVerifiedFitnessContract =
      options.isVerifiedSubmission ||
      networkName.includes('Verified') ||
      contractAddress === process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT;

    if (isVerifiedFitnessContract) {
      try {
        // Handle verified fitness contract submission using robust contract interaction
        const { createRobustContract, executeContractWrite } = await import(
          '@/utils/contractInteractionManager'
        );

        const contract = await createRobustContract(
          contractAddress,
          verifiedFitnessLeaderboardABI,
          signer,
          networkConfig.chainId
        );

        if (!contract) {
          throw new Error('Failed to create contract instance');
        }

        // Submit pushups if provided
        if (pushups > 0) {
          const pushupResult = await executeContractWrite(contract, 'submitScore', [
            pushups,
            'pushups',
          ]);

          if (!pushupResult.success) {
            throw new Error(pushupResult.error || 'Failed to submit pushups');
          }

          toast.success(`Pushups submitted to ${networkName}!`);
        }

        // Submit squats if provided
        if (squats > 0) {
          const squatResult = await executeContractWrite(contract, 'submitScore', [
            squats,
            'squats',
          ]);

          if (!squatResult.success) {
            throw new Error(squatResult.error || 'Failed to submit squats');
          }

          toast.success(`Squats submitted to ${networkName}!`);
        }

        return {
          success: true,
          processingType: 'direct',
        };
      } catch (complexError) {
        console.warn('Complex submission failed, trying direct submission:', complexError);

        // Fallback to simple direct submission
        if (pushups > 0) {
          const pushupResult = await submitScoreDirect(
            pushups,
            0,
            contractAddress,
            networkConfig.chainId,
            true
          );
          if (!pushupResult.success) {
            throw new Error(pushupResult.error || 'Failed to submit pushups via direct method');
          }
          toast.success(`Pushups submitted to ${networkName}!`);
        }

        if (squats > 0) {
          const squatResult = await submitScoreDirect(
            0,
            squats,
            contractAddress,
            networkConfig.chainId,
            true
          );
          if (!squatResult.success) {
            throw new Error(squatResult.error || 'Failed to submit squats via direct method');
          }
          toast.success(`Squats submitted to ${networkName}!`);
        }

        return {
          success: true,
          processingType: 'direct',
        };
      }
    } else {
      try {
        // Handle standard contract submission using robust contract interaction
        const { createRobustContract } = await import('@/utils/contractInteractionManager');

        const contract = await createRobustContract(
          contractAddress,
          networkConfig.abi,
          signer,
          networkConfig.chainId
        );

        if (!contract) {
          throw new Error('Failed to create contract instance');
        }

        // Check if we're submitting to Monad network which requires a fee
        const isMonadNetwork = networkConfig.chainId === 10143; // Monad Testnet chain ID
        let submissionFee = 0n;

        if (isMonadNetwork) {
          // Monad contract requires a fixed fee (no feeConfig function available)
          submissionFee = ethers.parseEther('0.001'); // 0.001 MON
          console.log(
            'Using fixed Monad submission fee:',
            ethers.formatEther(submissionFee),
            'MON'
          );

          // Check if user has sufficient balance for fee + gas
          const balance = await signer.provider?.getBalance(actualAddress);
          if (balance && balance < submissionFee + ethers.parseEther('0.001')) {
            // fee + estimated gas
            throw new Error(
              `Insufficient MON balance. You need at least ${ethers.formatEther(submissionFee + ethers.parseEther('0.001'))} MON for the submission fee and gas.`
            );
          }
        }

        // Prepare transaction with robust gas estimation
        let gasLimit: bigint;
        try {
          const gasEstimationOptions =
            isMonadNetwork && submissionFee > 0n ? { value: submissionFee } : {};
          gasLimit = await estimateGasWithBuffer(
            contract,
            'addScore',
            [pushups, squats],
            gasEstimationOptions
          );
        } catch (gasError) {
          // Fallback gas limit if estimation fails
          console.warn('Gas estimation failed, using fallback:', gasError);
          gasLimit = 200000n; // Conservative fallback
        }

        // Add referral tag if applicable
        const calldata = contract.interface.encodeFunctionData('addScore', [pushups, squats]);
        const taggedCalldata = addReferralTagToCalldata(actualAddress, calldata);

        // Prepare transaction object with value for payable functions
        const transactionParams: any = {
          to: contractAddress,
          data: taggedCalldata,
          gasLimit: gasLimit,
        };

        // Include value for Monad network submissions
        if (isMonadNetwork && submissionFee > 0n) {
          transactionParams.value = submissionFee;
        }

        // Submit transaction
        const tx = await signer.sendTransaction(transactionParams);

        toast.loading(`Submitting to ${networkName}...`, { id: 'submission' });

        // Wait for confirmation with timeout protection
        const timeout = new Promise(
          (_, reject) =>
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 120000) // 2 minutes
        );

        const receipt = (await Promise.race([
          tx.wait(),
          timeout,
        ])) as ethers.TransactionReceipt | null;

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
      } catch (complexError) {
        console.warn('Complex standard submission failed, trying direct submission:', complexError);

        // Fallback to simple direct submission
        const result = await submitScoreDirect(
          pushups,
          squats,
          contractAddress,
          networkConfig.chainId,
          false
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to submit via direct method');
        }

        toast.success(`Score submitted to ${networkName}!`, { id: 'submission' });

        // Register Divvi referral if applicable
        try {
          // Note: We don't have the transaction hash with direct submission
          // This is a limitation of the simple approach but acceptable for fallback
        } catch (referralError) {
          console.warn('Referral registration not available for direct submission:', referralError);
        }

        return {
          success: true,
          transactionHash: result.transactionHash,
          processingType: 'direct',
        };
      }
    }
  } catch (error) {
    console.error('unifiedSubmission: Score submission failed:', error);

    // CONSOLIDATED: Use common error handler for better UX
    try {
      await CommonErrorHandlers.handleContractInteraction(
        error,
        contractAddress,
        'submitScore',
        () => {
          // Users can manually retry by calling the function again
          console.log('User requested retry for submission');
        }
      );
    } catch (handlerError) {
      // Fallback to basic error handling if consolidated handler fails
      console.warn('Consolidated error handler failed:', handlerError);

      let errorMessage = 'Submission failed. Please try again.';

      // Use Farcaster-specific error handling if in Farcaster context
      if (isFarcasterMiniApp()) {
        errorMessage = handleFarcasterError(error);
      } else if (error instanceof Error) {
        if (error.message.includes('user rejected') || error.message.includes('User denied')) {
          errorMessage = 'Transaction was rejected. Please confirm the transaction in your wallet.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction. Please check your wallet balance.';
        } else if (error.message.includes('network') || error.message.includes('chain')) {
          errorMessage = 'Network error. Please check your wallet network settings.';
        } else if (
          error.message.includes('revert') ||
          error.message.includes('execution reverted')
        ) {
          if (networkName.toLowerCase().includes('monad')) {
            errorMessage =
              'Transaction was reverted. Please ensure you have at least 0.001 MON in your wallet for the submission fee and try again.';
          } else {
            errorMessage =
              'Transaction was reverted. This may be due to rate limiting or contract restrictions. Please wait a moment and try again.';
          }
        } else {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage, { id: 'submission' });
    }

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

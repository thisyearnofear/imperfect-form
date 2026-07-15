'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
// Removed: useAccount - using unified PlatformContext only
import { submitScoreDirect } from '@/utils/directSubmission';
import { getNetworkByChainId } from '@/config/networks';
// Removed: useEnhancedWalletConnection - using unified PlatformContext only
import toast from 'react-hot-toast';
import { isFarcasterMiniApp } from '@/utils/farcasterMiniApp';
import type { WalletState } from '@/contexts/PlatformContext';
import { CONTRACT_ADDRESSES } from '@/config/contract-addresses';
import { verifiedFitnessContractABI } from '@/constants/contracts';
import { ethers } from 'ethers';

/**
 * CONSOLIDATION: Unified Provider Selection
 * Single source of truth for provider selection logic
 */
function getValidatedProvider(
  platform: string,
  farcasterProvider: any,
  wallet: WalletState
): any | null {
  // Priority 1: Farcaster provider for Farcaster platform
  if (platform === 'farcaster' && farcasterProvider) {
    return farcasterProvider;
  }

  // Priority 2: Browser ethereum provider (for all platforms including Farcaster fallback)
  if (typeof window !== 'undefined' && window.ethereum) {
    // Validate that wallet is actually connected
    if (wallet.isConnected && wallet.address) {
      return window.ethereum;
    }
  }

  // Priority 3: No valid provider found
  return null;
}

/**
 * CONSOLIDATION: Unified Error Classification
 * Single source of truth for error handling and user messages
 */
function classifySubmissionError(error: unknown): string {
  if (!error) return 'Submission failed';

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // User rejection - most common and expected
  if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied')) {
    return 'Transaction rejected. Please approve the transaction to continue.';
  }

  // Network/connection issues
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('rpc')
  ) {
    return 'Network connection issue. Please check your internet and try again.';
  }

  // Wallet/provider issues
  if (
    lowerMessage.includes('provider') ||
    lowerMessage.includes('wallet') ||
    lowerMessage.includes('signer')
  ) {
    return 'Wallet connection issue. Please reconnect your wallet and try again.';
  }

  // Gas/fee issues
  if (lowerMessage.includes('insufficient funds') || lowerMessage.includes('gas')) {
    return 'Insufficient funds or gas. Please check your wallet balance.';
  }

  // Contract/blockchain issues
  if (lowerMessage.includes('revert') || lowerMessage.includes('execution')) {
    return 'Transaction failed. Please check your inputs and try again.';
  }

  // Network switching issues
  if (lowerMessage.includes('switch') || lowerMessage.includes('chain')) {
    return 'Network switching issue. Please switch to the correct network manually.';
  }

  // Default fallback with original message if it's user-friendly
  if (errorMessage.length < 100 && !lowerMessage.includes('0x')) {
    return errorMessage;
  }

  return 'Submission failed. Please try again or contact support if the issue persists.';
}

/**
 * CONSOLIDATION: Unified Submission Requirements Validation
 * Single source of truth for pre-submission checks
 */
function validateSubmissionRequirements(
  address: string | null,
  chainId: number | null,
  pushupsScore: number,
  squatsScore: number,
  wallet: WalletState
): string | null {
  // Check wallet connection
  if (!wallet.isConnected || !address) {
    return 'Wallet not connected. Please connect your wallet to continue.';
  }

  // Check network
  if (!chainId) {
    return 'Network not detected. Please check your wallet connection.';
  }

  // Check scores
  if (!pushupsScore && !squatsScore) {
    return 'No scores to submit. Complete some exercises first.';
  }

  if (pushupsScore < 0 || squatsScore < 0) {
    return 'Invalid scores detected. Scores must be positive numbers.';
  }

  // Check provider availability
  if (!wallet.provider) {
    return 'Wallet provider not available. Please reconnect your wallet.';
  }

  return null; // All validations passed
}

interface SubmitScoreProps {
  score?: number;
  exerciseType?: import('@/utils/biomechanics').ExerciseMode;
  // Enhanced: Support for batch submissions
  pushupsScore?: number;
  squatsScore?: number;
  forceDirectSubmission?: boolean;
  walletAddress?: string;
  submissionStatus: 'idle' | 'submitting' | 'success' | 'error';
  setSubmissionStatus: (status: 'idle' | 'submitting' | 'success' | 'error') => void;
  onSubmissionSuccess?: (transactionHash: string, chainId: number) => void;
}

// Unified score submission component using PlatformContext
export default function SubmitScore({
  score,
  exerciseType = 'pushups',
  pushupsScore,
  squatsScore,
  forceDirectSubmission = false,
  walletAddress,
  submissionStatus,
  setSubmissionStatus,
  onSubmissionSuccess,
}: SubmitScoreProps) {
  const [confirmStep, setConfirmStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { wallet, platform, farcasterProvider, actions } = usePlatform();
  const { chainId } = wallet;

  // Unified wallet connection via PlatformContext
  const address = wallet.address || walletAddress;

  // State for verification status
  const [isVerifiedUser, setIsVerifiedUser] = useState(false);

  // Check verification status on Celo
  React.useEffect(() => {
    let isMounted = true;

    async function checkVerification() {
      // Only check on Celo (42220) and if we have an address
      if (chainId !== 42220 || !address) {
        if (isMounted) setIsVerifiedUser(false);
        return;
      }

      try {
        // Simple read provider for Celo
        const provider = new ethers.JsonRpcProvider('https://forno.celo.org');
        const verifiedContractAddr = CONTRACT_ADDRESSES.celo.verified;

        const contract = new ethers.Contract(
          verifiedContractAddr,
          verifiedFitnessContractABI,
          provider
        );

        const isVerified = await contract.isVerifiedHuman(address);
        if (isMounted) {
          setIsVerifiedUser(isVerified);
          console.log('User verification status on Celo:', isVerified);
        }
      } catch (err) {
        console.error('Error checking verification status:', err);
        if (isMounted) setIsVerifiedUser(false);
      }
    }

    checkVerification();

    return () => {
      isMounted = false;
    };
  }, [chainId, address]);

  // Calculate effective scores (support legacy single score + new batch scores)
  const effectivePushupsScore = pushupsScore ?? (exerciseType === 'pushups' ? score : 0) ?? 0;
  const effectiveSquatsScore = squatsScore ?? (exerciseType === 'squats' ? score : 0) ?? 0;
  const hasMultipleScores = effectivePushupsScore > 0 && effectiveSquatsScore > 0;

  // Determine if batch transactions are supported (only in Farcaster)
  const supportsBatch = isFarcasterMiniApp() ? true : null;

  // ENHANCEMENT: Pre-submission validation
  const handleSubmit = async () => {
    console.log(
      'SubmitScoreWithWagmi: handleSubmit called with pushups:',
      effectivePushupsScore,
      'squats:',
      effectiveSquatsScore
    );

    // CONSOLIDATION: Unified pre-submission validation
    const validationError = validateSubmissionRequirements(
      address || null,
      chainId,
      effectivePushupsScore,
      effectiveSquatsScore,
      wallet
    );

    if (validationError) {
      console.log('SubmitScoreWithWagmi: Validation failed:', validationError);
      setSubmissionStatus('error');
      toast.error(validationError);
      return;
    }

    setIsLoading(true);
    setSubmissionStatus('submitting');

    try {
      // Unified approach: Use Wagmi connection directly
      console.log('Wallet connected via unified PlatformContext, proceeding with submission...');
      // Simple network configuration
      if (!chainId) {
        throw new Error('Network not detected. Please check your wallet connection.');
      }
      const networkConfig = getNetworkByChainId(chainId);
      if (!networkConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Intelligent Routing for Celo
      let targetContractAddress = networkConfig.contractAddress;
      let isVerifiedContract =
        targetContractAddress.toLowerCase() ===
        process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT?.toLowerCase();

      // If we are on Celo and the user is verified, force strict routing to the Verified Contract
      if (chainId === 42220 && isVerifiedUser) {
        console.log('🌟 Verified User detected on Celo! Routing to Verified Contract.');
        targetContractAddress = CONTRACT_ADDRESSES.celo.verified;
        isVerifiedContract = true;
      } else if (chainId === 42220) {
        // Ensure standard contract for non-verified
        targetContractAddress = CONTRACT_ADDRESSES.celo.standard;
        isVerifiedContract = false;
      }

      // Get fee amount for chains that require it
      const feeAmount: string | null = null;
      // Monad Mainnet (chainId 143) does not require a submission fee, only gas

      // ENHANCEMENT: Unified provider selection with validation
      const provider = getValidatedProvider(platform, farcasterProvider, wallet);

      if (!provider) {
        throw new Error('No wallet provider available. Please connect your wallet.');
      }

      // Direct submission using simplified system
      console.log('🚀 Submitting score with params:', {
        pushups: effectivePushupsScore,
        squats: effectiveSquatsScore,
        contractAddress: targetContractAddress,
        chainId,
        isVerified: isVerifiedContract,
        feeAmount,
        provider: !!provider,
      });

      const result = await submitScoreDirect(
        provider,
        effectivePushupsScore,
        effectiveSquatsScore,
        targetContractAddress,
        chainId,
        isVerifiedContract,
        feeAmount
      );

      if (result.success) {
        console.log('SubmitScoreWithWagmi: Submission successful');
        setSubmissionStatus('success');
        const sourceMessage = wallet.provider === 'wagmi' ? ' via Wagmi' : '';
        const leaderboardType = isVerifiedContract ? 'Verified' : networkConfig.name;
        toast.success(`Scores submitted to ${leaderboardType} Leaderboard${sourceMessage}!`);

        // OPTIMISTIC UPDATE: Update leaderboard cache immediately
        // This ensures stats (streak, sessions) update without waiting for a refetch
        try {
          // Dynamic import to avoid circular dependencies if any
          const { getCachedLeaderboardData, cacheLeaderboardData } =
            await import('@/utils/leaderboardCache');

          const currentCache = getCachedLeaderboardData();
          if (currentCache) {
            const now = Math.floor(Date.now() / 1000);
            const userAddress = address || '';
            const networkName = networkConfig.name.toLowerCase() as any; // Cast to NetworkType

            // Helper to add score to specific leaderboard array
            const addScoreToLeaderboard = (leaderboard: any[], scoreVal: number) => {
              const newScoreEntry = {
                user: userAddress,
                score: scoreVal,
                network: networkName,
                timestamp: now,
                displayName: userAddress, // Fallback
              };
              // Add to beginning or end? Typically leaderboard is sorted.
              // We just push it, the sorting happens on display, or we can sort here.
              // For user stats, order doesn't matter much, but for leaderboard display it does.
              // Simple push is safest for now.
              return [...leaderboard, newScoreEntry];
            };

            const updatedCache = { ...currentCache };

            if (effectivePushupsScore > 0) {
              updatedCache.pushups = addScoreToLeaderboard(
                updatedCache.pushups,
                effectivePushupsScore
              );
            }

            if (effectiveSquatsScore > 0) {
              updatedCache.squats = addScoreToLeaderboard(
                updatedCache.squats,
                effectiveSquatsScore
              );
            }

            // Save back to cache - this triggers 'leaderboardCacheUpdated' event
            // which useUserStats listens to
            cacheLeaderboardData(updatedCache);
            console.log('🚀 Optimistically updated leaderboard cache with new score');
          }
        } catch (err) {
          console.warn('Failed to optimistically update cache:', err);
        }

        // Notify parent component of successful submission
        if (result.transactionHash && result.chainId && onSubmissionSuccess) {
          onSubmissionSuccess(result.transactionHash, result.chainId);
        }
      } else {
        console.log('SubmitScoreWithWagmi: Submission failed with error:', result.error);
        setSubmissionStatus('error');

        // Simplified error handling
        const errorMessage = result.error || 'Submission failed';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('SubmitScoreWithWagmi: Submission error:', error);
      setSubmissionStatus('error');

      // ENHANCEMENT: Comprehensive error classification and user-friendly messages
      const userFriendlyError = classifySubmissionError(error);
      toast.error(userFriendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced: Don't render if no scores or address, but show connection button if wallet available
  if (!effectivePushupsScore && !effectiveSquatsScore) {
    return null;
  }

  // If no address, show connect button using unified PlatformContext
  if (!address) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={() => actions.connect()}
          className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-black font-bold rounded-lg hover:from-primary-dark hover:to-primary transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-primary"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '12px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {wallet.isConnecting ? (
            <div className="flex items-center space-x-2">
              <Spinner />
              <span>Connecting...</span>
            </div>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {!confirmStep ? (
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={() => setConfirmStep(true)}
            disabled={isLoading || submissionStatus === 'success'}
            className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-black font-bold rounded-lg hover:from-primary-dark hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-primary"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '12px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {submissionStatus === 'success'
              ? 'Scores Synced! 🎉'
              : hasMultipleScores
                ? `Sync to Leaderboard${supportsBatch && isFarcasterMiniApp() ? ' (Batch)' : ''}`
                : `Sync to Leaderboard`}
          </button>

          {/* Enhanced: Show batch transaction status for Farcaster */}
          {isFarcasterMiniApp() && supportsBatch !== null && hasMultipleScores && (
            <p className="text-xs text-primary opacity-70 text-center">
              {supportsBatch
                ? '✨ Batch transactions supported - submit both scores in one action!'
                : 'Will submit scores individually'}
            </p>
          )}

          {/* Enhanced: Show score breakdown and connection status */}
          {hasMultipleScores && (
            <div className="text-xs text-primary opacity-60 text-center">
              {effectivePushupsScore > 0 && `${effectivePushupsScore} pushups`}
              {effectivePushupsScore > 0 && effectiveSquatsScore > 0 && ' + '}
              {effectiveSquatsScore > 0 && `${effectiveSquatsScore} squats`}
            </div>
          )}

          {/* Show wallet connection info */}
          {wallet.provider && (
            <div className="text-xs text-primary opacity-50 text-center">
              Connected via {wallet.provider}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <p
              className="text-lg font-semibold text-primary mb-2"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Confirm Sync
            </p>
            <div className="text-primary opacity-80 space-y-1">
              {effectivePushupsScore > 0 && <p>Pushups: {effectivePushupsScore}</p>}
              {effectiveSquatsScore > 0 && <p>Squats: {effectiveSquatsScore}</p>}
              {isVerifiedUser && chainId === 42220 && (
                <p className="text-[#10b981] text-xs mt-2 border border-[#10b981] rounded px-2 py-1 bg-[#10b981]/10">
                  ✨ Submitting to Verified Leaderboard
                </p>
              )}
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg hover:from-green-700 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-green-500 flex items-center space-x-2"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '10px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {isLoading && <Spinner />}
              <span>{isLoading ? 'Submitting...' : 'Confirm'}</span>
            </button>

            <button
              onClick={() => {
                setConfirmStep(false);
                setIsLoading(false);
                setSubmissionStatus('idle');
              }}
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg hover:from-red-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-red-500"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '10px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

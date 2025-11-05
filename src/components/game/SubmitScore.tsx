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
  exerciseType?: 'pushups' | 'squats';
  // Enhanced: Support for batch submissions
  pushupsScore?: number;
  squatsScore?: number;
  forceDirectSubmission?: boolean;
  walletAddress?: string;
  submissionStatus: 'idle' | 'submitting' | 'success' | 'error';
  setSubmissionStatus: (status: 'idle' | 'submitting' | 'success' | 'error') => void;
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
}: SubmitScoreProps) {
  const [confirmStep, setConfirmStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { wallet, platform, farcasterProvider, actions } = usePlatform();
  const { chainId } = wallet;

  // Unified wallet connection via PlatformContext
  const address = wallet.address || walletAddress;

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
      address,
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
      const networkConfig = getNetworkByChainId(chainId);
      if (!networkConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      // Determine if this is a verified contract
      const isVerifiedContract =
        networkConfig.contractAddress.toLowerCase() ===
        process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT?.toLowerCase();

      // Get fee amount for chains that require it
      let feeAmount: string | null = null;
      if (chainId === 10143) {
        // Monad Testnet
        feeAmount = '0.001'; // 0.001 MON
      }

      // ENHANCEMENT: Unified provider selection with validation
      const provider = getValidatedProvider(platform, farcasterProvider, wallet);

      if (!provider) {
        throw new Error('No wallet provider available. Please connect your wallet.');
      }

      // Direct submission using simplified system
      console.log('🚀 Submitting score with params:', {
        pushups: effectivePushupsScore,
        squats: effectiveSquatsScore,
        contractAddress: networkConfig.contractAddress,
        chainId,
        isVerified: isVerifiedContract,
        feeAmount,
        provider: !!provider,
      });

      const result = await submitScoreDirect(
        provider,
        effectivePushupsScore,
        effectiveSquatsScore,
        networkConfig.contractAddress,
        chainId,
        isVerifiedContract,
        feeAmount
      );

      if (result.success) {
        console.log('SubmitScoreWithWagmi: Submission successful');
        setSubmissionStatus('success');
        const sourceMessage = wallet.provider === 'wagmi' ? ' via Wagmi' : '';
        toast.success(`Scores submitted to ${networkConfig.name}${sourceMessage}!`);
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
          className="px-6 py-3 bg-gradient-to-r from-[#fcb131] to-[#f39c12] text-black font-bold rounded-lg hover:from-[#f39c12] hover:to-[#fcb131] transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-[#fcb131]"
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
            className="px-6 py-3 bg-gradient-to-r from-[#fcb131] to-[#f39c12] text-black font-bold rounded-lg hover:from-[#f39c12] hover:to-[#fcb131] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-[#fcb131]"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '12px',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
          >
            {submissionStatus === 'success'
              ? 'Scores Submitted! 🎉'
              : hasMultipleScores
                ? `Submit Scores${supportsBatch && isFarcasterMiniApp() ? ' (Batch)' : ''}`
                : `Submit Score (${effectivePushupsScore || effectiveSquatsScore} ${exerciseType})`}
          </button>

          {/* Enhanced: Show batch transaction status for Farcaster */}
          {isFarcasterMiniApp() && supportsBatch !== null && hasMultipleScores && (
            <p className="text-xs text-[#fcb131] opacity-70 text-center">
              {supportsBatch
                ? '✨ Batch transactions supported - submit both scores in one action!'
                : 'Will submit scores individually'}
            </p>
          )}

          {/* Enhanced: Show score breakdown and connection status */}
          {hasMultipleScores && (
            <div className="text-xs text-[#fcb131] opacity-60 text-center">
              {effectivePushupsScore > 0 && `${effectivePushupsScore} pushups`}
              {effectivePushupsScore > 0 && effectiveSquatsScore > 0 && ' + '}
              {effectiveSquatsScore > 0 && `${effectiveSquatsScore} squats`}
            </div>
          )}

          {/* Show wallet connection info */}
          {wallet.provider && (
            <div className="text-xs text-[#fcb131] opacity-50 text-center">
              Connected via {wallet.provider}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <p
              className="text-lg font-semibold text-[#fcb131] mb-2"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Confirm Submission
            </p>
            <div className="text-[#fcb131] opacity-80 space-y-1">
              {effectivePushupsScore > 0 && <p>Pushups: {effectivePushupsScore}</p>}
              {effectiveSquatsScore > 0 && <p>Squats: {effectiveSquatsScore}</p>}
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

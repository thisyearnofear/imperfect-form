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

  // Enhanced submission handler with wallet fallbacks
  const handleSubmit = async () => {
    console.log(
      'SubmitScoreWithWagmi: handleSubmit called with pushups:',
      effectivePushupsScore,
      'squats:',
      effectiveSquatsScore
    );

    if (!address || !chainId || (!effectivePushupsScore && !effectiveSquatsScore)) {
      console.log('SubmitScoreWithWagmi: Missing required parameters');
      setSubmissionStatus('error');
      toast.error('Missing required parameters');
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

      // Get the appropriate provider
      const provider =
        platform === 'farcaster'
          ? farcasterProvider
          : typeof window !== 'undefined'
            ? window.ethereum
            : null;

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

      let errorMessage = 'Submission failed';
      if (error instanceof Error) {
        errorMessage = error.message;

        // Simplified error handling
        if (errorMessage.includes('user rejected')) {
          errorMessage = 'Transaction rejected. Please approve the transaction to continue.';
        }
      }

      toast.error(errorMessage);
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

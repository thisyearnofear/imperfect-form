'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { useAccount } from 'wagmi';
import { submitScoreDirect, detectEnvironment } from '@/utils/directSubmission';
import { getNetworkByChainId } from '@/config/networks';
import { useEnhancedWalletConnection } from '@/hooks/useEnhancedWalletConnection';
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

// Clean, unified score submission component
export default function SubmitScoreWithWagmi({
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
  const { wallet } = usePlatform();
  const { chainId } = wallet;

  // Enhanced wallet connection with fallbacks
  const [enhancedWallet, enhancedActions] = useEnhancedWalletConnection();

  // Get current user address - prefer enhanced wallet if available
  const address = enhancedWallet.address || wallet.address || walletAddress;

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
      // Ensure wallet is ready for transactions
      if (!enhancedWallet.isReady) {
        console.log('Enhanced wallet not ready, attempting to prepare...');
        const isReady = await enhancedActions.ensureReady();

        if (!isReady) {
          console.log('Failed to prepare wallet, trying WalletConnect fallback...');
          const connected = await enhancedActions.connect(true); // Force WalletConnect

          if (!connected) {
            throw new Error(
              'Unable to establish wallet connection. Please try connecting manually.'
            );
          }
        }
      }
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

      // Direct submission using simplified system
      const result = await submitScoreDirect(
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
        const sourceMessage = enhancedWallet.source
          ? ` via ${enhancedWallet.source === 'walletconnect' ? 'WalletConnect' : enhancedWallet.source}`
          : '';
        toast.success(`Scores submitted to ${networkConfig.name}${sourceMessage}!`);
      } else {
        console.log('SubmitScoreWithWagmi: Submission failed with error:', result.error);
        setSubmissionStatus('error');

        // Enhanced error handling with WalletConnect fallback suggestion
        let errorMessage = result.error || 'Submission failed';
        if (enhancedWallet.source !== 'walletconnect' && enhancedWallet.supportsWalletConnect) {
          errorMessage += ' Try using WalletConnect for better compatibility.';
        }

        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('SubmitScoreWithWagmi: Submission error:', error);
      setSubmissionStatus('error');

      let errorMessage = 'Submission failed';
      if (error instanceof Error) {
        errorMessage = error.message;

        // Enhanced error handling with fallback suggestions
        if (enhancedWallet.error && enhancedWallet.error.recoverable) {
          switch (enhancedWallet.error.code) {
            case 'PROVIDER_NOT_READY':
              if (enhancedWallet.supportsWalletConnect) {
                errorMessage += ' Try WalletConnect for better compatibility.';
              }
              break;
            case 'USER_REJECTED':
              errorMessage = 'Transaction rejected. Please approve the transaction to continue.';
              break;
            case 'SESSION_ERROR':
              errorMessage += ' Please disconnect and reconnect your wallet.';
              break;
          }
        } else {
          // Environment-specific error handling (legacy fallback)
          const env = detectEnvironment();
          if (
            typeof env !== 'string' &&
            env.isFarcaster &&
            errorMessage.includes('user rejected')
          ) {
            errorMessage = 'Transaction rejected in Farcaster wallet - please approve';
          } else if (typeof env !== 'string' && env.isBrave && errorMessage.includes('provider')) {
            errorMessage = 'Brave wallet connection issue - try refreshing or using WalletConnect';
          }
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

  // If no address, show connect button
  if (!address) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={() => enhancedActions.connect()}
          className="px-6 py-3 bg-gradient-to-r from-[#fcb131] to-[#f39c12] text-black font-bold rounded-lg hover:from-[#f39c12] hover:to-[#fcb131] transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-[#fcb131]"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '12px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {enhancedWallet.isConnecting ? (
            <div className="flex items-center space-x-2">
              <Spinner />
              <span>Connecting...</span>
            </div>
          ) : (
            'Connect Wallet'
          )}
        </button>
        {enhancedWallet.supportsWalletConnect && (
          <button
            onClick={() => enhancedActions.connect(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 text-xs"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '10px',
            }}
          >
            Try WalletConnect
          </button>
        )}
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
                ? `Submit Scores${supportsBatch && isFarcasterMiniApp() ? ' (Batch)' : ''}${enhancedWallet.source === 'walletconnect' ? ' via WC' : ''}`
                : `Submit Score (${effectivePushupsScore || effectiveSquatsScore} ${exerciseType})${enhancedWallet.source === 'walletconnect' ? ' via WC' : ''}`}
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
          {enhancedWallet.source && (
            <div className="text-xs text-[#fcb131] opacity-50 text-center">
              Connected via{' '}
              {enhancedWallet.source === 'walletconnect' ? 'WalletConnect' : enhancedWallet.source}
              {!enhancedWallet.isReady && ' (preparing...)'}
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

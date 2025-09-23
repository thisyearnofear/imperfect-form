'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { useAccount } from 'wagmi';
import { submitScore, showSubmissionResult, canUserSubmit } from '@/utils/unifiedSubmission';
import { getEthereumProvider } from '@/utils/farcasterMiniApp';
import { getNetworkByChainId } from '@/config/networks';

interface SubmitScoreProps {
  score?: number;
  exerciseType?: 'pushups' | 'squats';
  forceDirectSubmission?: boolean;
  walletAddress?: string;
  submissionStatus: 'idle' | 'submitting' | 'success' | 'error';
  setSubmissionStatus: (status: 'idle' | 'submitting' | 'success' | 'error') => void;
}

// Clean, unified score submission component
export default function SubmitScoreWithWagmi({
  score,
  exerciseType = 'pushups',
  forceDirectSubmission = false,
  walletAddress,
  submissionStatus,
  setSubmissionStatus,
}: SubmitScoreProps) {
  const [confirmStep, setConfirmStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { address: wagmiAddress } = useAccount();
  const { wallet } = usePlatform();
  const { chainId } = wallet;
  // Note: writeContract available for future Wagmi integration if needed
  // const { writeContract } = useWriteContract();

  // Get current user address - prioritize wallet state, then wagmi, then prop
  const address = wallet.address || wagmiAddress || walletAddress;

  // Unified submission handler
  const handleSubmit = async () => {
    console.log(
      'SubmitScoreWithWagmi: handleSubmit called with score:',
      score,
      'exerciseType:',
      exerciseType
    );
    if (!address || !chainId || !score) {
      console.log('SubmitScoreWithWagmi: Missing required parameters');
      setSubmissionStatus('error');
      showSubmissionResult({
        success: false,
        error: 'Missing required parameters',
        processingType: 'direct',
      });
      return;
    }

    setIsLoading(true);
    setSubmissionStatus('submitting');

    try {
      // ENHANCEMENT: Comprehensive wallet connection validation with recovery
      if (!wallet.isConnected) {
        const isFarcaster =
          typeof window !== 'undefined' &&
          (window.location.href.includes('farcaster') ||
            document.referrer.includes('warpcast') ||
            document.referrer.includes('farcaster'));
        const errorMsg = isFarcaster
          ? 'Wallet connection not detected in Farcaster app. Please connect your wallet and try again.'
          : 'Wallet is not connected. Please connect your wallet and try again.';
        throw new Error(errorMsg);
      }

      // Use centralized network configuration instead of hardcoded mappings
      const networkConfig = getNetworkByChainId(chainId);
      if (!networkConfig) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      const contractInfo = {
        address: networkConfig.contractAddress,
        network: networkConfig.name,
      };

      // Check if user can submit using unified wallet state
      const canSubmitResult = canUserSubmit(wallet, contractInfo.address);
      if (!canSubmitResult.canSubmit) {
        throw new Error(canSubmitResult.reason || 'Cannot submit');
      }

      // ENHANCEMENT: Robust provider access with automatic recovery
      const { ensureWalletConnection } = await import('@/utils/walletConnectionRecovery');
      const connectionCheck = await ensureWalletConnection({
        maxRetries: 2,
        enableFarcasterValidation: true,
        showToasts: false,
      });

      if (!connectionCheck.isConnected || !connectionCheck.provider) {
        const isFarcaster =
          typeof window !== 'undefined' &&
          (window.location.href.includes('farcaster') ||
            document.referrer.includes('warpcast') ||
            document.referrer.includes('farcaster'));

        const baseErrorMsg = connectionCheck.error || 'Wallet provider not available';
        const contextualMsg = isFarcaster
          ? 'Farcaster wallet provider not available. Make sure you have a wallet connected in the Farcaster app.'
          : 'No wallet provider found. Please connect your wallet and try again.';

        // Show suggestions to user
        if (connectionCheck.suggestions.length > 0) {
          console.warn('Wallet connection suggestions:', connectionCheck.suggestions);
        }

        throw new Error(
          `${contextualMsg}\n\nSuggestions:\n${connectionCheck.suggestions.map((s) => `• ${s}`).join('\n')}`
        );
      }

      const ethereumProvider = connectionCheck.provider;

      const pushups = exerciseType === 'pushups' ? score : 0;
      const squats = exerciseType === 'squats' ? score : 0;

      // Submit using unified logic
      const result = await submitScore(
        pushups,
        squats,
        contractInfo.address,
        contractInfo.network,
        address,
        {
          chainId,
          skipSubAccountCheck: forceDirectSubmission,
          providedEthereumProvider: ethereumProvider,
        }
      );

      if (result.success) {
        console.log('SubmitScoreWithWagmi: Submission successful');
        setSubmissionStatus('success');
      } else {
        console.log('SubmitScoreWithWagmi: Submission failed with error:', result.error);
        setSubmissionStatus('error');
      }

      showSubmissionResult(result);
    } catch (error) {
      console.error('SubmitScoreWithWagmi: Submission error:', error);
      setSubmissionStatus('error');

      // More user-friendly error messages
      let errorMessage = 'Unknown error';
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

      showSubmissionResult({
        success: false,
        error: errorMessage,
        processingType: 'direct',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if no score or address
  if (!score || !address) {
    return null;
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {!confirmStep ? (
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
            ? 'Score Submitted! 🎉'
            : `Submit Score (${score} ${exerciseType})`}
        </button>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <p
              className="text-lg font-semibold text-[#fcb131] mb-2"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Confirm Submission
            </p>
            <p className="text-[#fcb131] opacity-80">
              Submit {score} {exerciseType} to the leaderboard?
            </p>
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

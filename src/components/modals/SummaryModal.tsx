'use client';

import React, { useState } from 'react';
import { chainConfigs, SupportedChain } from '@/utils/chainSwitching';
import { Dialog } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { UniversalConnectButton } from '@/components/wallet';
import FarcasterShare from '@/components/social/FarcasterShare';
import { SubmitScore } from '@/components/game';
import { AddMiniAppButton } from '@/components/miniapp/AddMiniAppButton';
import { VerificationIntegration } from '@/components/verification';
import { getMemoryClient } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';
import { useFadeTransition } from '@/hooks';

// Initialize window properties if they don't exist (client-side only)
const initializeWindowProperties = () => {
  if (typeof window !== 'undefined') {
    if (window.transactionHash === undefined) {
      window.transactionHash = '';
    }
    if (window.selectedNetworkName === undefined) {
      window.selectedNetworkName = '';
    }
  }
};

// Call initialization
initializeWindowProperties();

export interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  repCount: number;
  timeLeft: number;
  mode?: 'pushups' | 'squats';
  address?: string; // Optional wallet address
}

const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  repCount,
  timeLeft,
  mode = 'pushups',
  address,
}) => {
  const logger = createRemoteLogger('SummaryModal');
  const { platform, wallet, user } = usePlatform();
  const { address: walletAddress, chainId } = wallet;
  const isInMiniApp = platform === 'farcaster';
  const { isVisible, className: transitionClass } = useFadeTransition(isOpen, 300);
  const [submissionStatus, setSubmissionStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [submittedChainId, setSubmittedChainId] = useState<number | null>(null);
  const [earnings, setEarnings] = useState<{
    totalEarned: number;
    weeklyEarnings: number;
    dataQueries: number;
  } | null>(null);

  // Debug logging for submission status changes
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('SummaryModal: submissionStatus changed to', submissionStatus);
    }
  }, [submissionStatus]);

  // Fetch earnings data when modal opens
  React.useEffect(() => {
    if (isOpen && walletAddress) {
      const fetchEarnings = async () => {
        try {
          const client = getMemoryClient();
          if (client) {
            const earningsData = await client.getEarnings(walletAddress);
            setEarnings({
              totalEarned: earningsData.totalEarned,
              weeklyEarnings: earningsData.weeklyEarnings,
              dataQueries: earningsData.dataQueries,
            });
            logger.info('Earnings data fetched for workout completion', {
              walletAddress,
              earningsData,
            });
          }
        } catch (error) {
          logger.warn('Failed to fetch earnings data', { error, walletAddress });
          // Don't show error to user, just silently fail
        }
      };
      fetchEarnings();
    }
  }, [isOpen, walletAddress, logger]);

  // Keep modal open for verification after successful submission
  // User can manually close or verify first

  // Map chainId to network name using centralized config
  const getNetworkFromChainId = (id: number | undefined) => {
    if (!id) return 'base'; // Default to base if unknown
    for (const [key, config] of Object.entries(chainConfigs)) {
      if (config.id === id) {
        return key;
      }
    }
    return 'base'; // Default to base if unknown
  };

  const network = getNetworkFromChainId(chainId || undefined);

  // Type assertion to help TypeScript understand the network type
  const networkType = network as 'polygon' | 'base' | 'monad' | 'celo';

  // Use the address from props if provided, otherwise fall back to wallet address from context
  const effectiveAddress = address || walletAddress;

  // Debug logging for mobile wallet issues
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('SummaryModal Debug Info:', {
        network: networkType,
        addressFromProps: address,
        walletAddress,
        effectiveAddress,
        isOpen,
        platform,
        walletProvider: wallet.provider,
        walletIsConnected: wallet.isConnected,
        walletChainId: wallet.chainId,
        isInMiniApp,
      });
    }
  }, [
    networkType,
    address,
    walletAddress,
    effectiveAddress,
    isOpen,
    platform,
    wallet.provider,
    wallet.isConnected,
    wallet.chainId,
    isInMiniApp,
  ]);

  // Removed handleThirdwebSubmission - now using unified Wagmi submission

  // Network switching is no longer supported in the summary modal
  // This prevents wallet compatibility issues

  if (!isVisible) return null;

  // Format exercise time to handle durations over 2 minutes correctly
  const formatExerciseTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds === 0) {
        return minutes === 1 ? `1 minute` : `${minutes} minutes`;
      } else {
        return `${minutes} min ${remainingSeconds} sec`;
      }
    }
  };

  // Determine the medal based on rep count
  const getMedalEmoji = () => {
    if (mode === 'pushups') {
      if (repCount >= 30) return '🥇';
      else if (repCount >= 20) return '🥈';
      else if (repCount >= 10) return '🥉';
    } else {
      if (repCount >= 40) return '🥇';
      else if (repCount >= 25) return '🥈';
      else if (repCount >= 15) return '🥉';
    }
    return '💪';
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={submissionStatus === 'success' ? '✅ Submitted' : '📊 Submit'}
      description={
        submissionStatus === 'success'
          ? `${getMedalEmoji()} Leaderboard updated`
          : `${getMedalEmoji()} ${repCount} ${mode} • ${120 - timeLeft}s`
      }
      preventClose={false}
    >
      <div className={`space-y-6 ${transitionClass}`}>
        {/* Network Info - Minimal badge */}
        <div className="text-center">
          <span
            className={`inline-block font-semibold px-2.5 py-1 rounded-full text-xs ${
              networkType === 'polygon'
                ? 'bg-purple-900/50 text-purple-300'
                : networkType === 'monad'
                  ? 'bg-yellow-900/50 text-yellow-300'
                  : networkType === 'celo'
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-blue-900/50 text-blue-300'
            }`}
          >
            {networkType === 'polygon'
              ? 'Polygon'
              : networkType === 'monad'
                ? 'Monad'
                : networkType === 'celo'
                  ? 'Celo'
                  : 'Base'}
          </span>
        </div>

        {/* Wallet Connection */}
        {!effectiveAddress ? (
          <UniversalConnectButton size="lg" />
        ) : (
          <div className="space-y-4">
            {/* Submit Score component - only show if not successfully submitted */}
            {submissionStatus !== 'success' && (
              <div className="rounded-md p-3 text-center">
                {/* Use unified Wagmi-based submission for all networks */}
                <SubmitScore
                  score={repCount}
                  exerciseType={mode}
                  forceDirectSubmission={true}
                  walletAddress={effectiveAddress}
                  submissionStatus={submissionStatus}
                  setSubmissionStatus={setSubmissionStatus}
                  onSubmissionSuccess={(txHash, chainId) => {
                    setTransactionHash(txHash);
                    setSubmittedChainId(chainId);
                  }}
                />
                {/* Dynamic feedback message */}
                {submissionStatus === 'submitting' && (
                  <p className="text-sm text-yellow-400 mt-3 animate-pulse">Confirming... 💫</p>
                )}
                {submissionStatus === 'error' && (
                  <p className="text-sm text-red-400 mt-3">Failed. Retry?</p>
                )}
              </div>
            )}

            {/* Success message - show when successfully submitted */}
            {submissionStatus === 'success' && (
              <div className="rounded-md p-2 text-center">
                <div className="text-green-400 text-base font-bold">✅ Submitted!</div>
              </div>
            )}

            {/* Earnings Preview - Show after successful submission */}
            {submissionStatus === 'success' && earnings && (
              <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-700/30 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-300">💰 +${earnings.totalEarned.toFixed(4)}</div>
              </div>
            )}
          </div>
        )}

        {/* Social sharing buttons - Enhanced for mini app context */}
        {typeof window !== 'undefined' && window.transactionHash && (
          <div className="border-t border-gray-700 pt-4">
            <div className="flex flex-col items-center space-y-4">
              {/* Enhanced Farcaster integration */}
              <FarcasterShare
                reps={repCount}
                exerciseMode={mode}
                timeSpent={formatExerciseTime(120 - timeLeft)} // Calculate elapsed time: 120 seconds (2 min) - timeLeft
                network={networkType} // Pass the direct network type (polygon, base, celo, monad)
                isInMiniApp={isInMiniApp}
                user={user}
                earnings={earnings}
              />

              {/* Twitter sharing - only show outside mini app context */}
              {!isInMiniApp && (
                <button
                  className="twitter-button transition-all transform hover:scale-105"
                  onClick={() => {
                    const text = `${repCount} ${mode} • Onchain Olympics 💪`;
                    const url = `https://imperfect-form.vercel.app`;
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                      '_blank'
                    );
                  }}
                >
                  𝕏
                </button>
              )}
            </div>
          </div>
        )}

        {/* Celo-specific verification prompt - show after successful submission on Celo only */}
        {submissionStatus === 'success' && submittedChainId === 42220 && (
          <div className="border-t border-gray-700 pt-4">
            <VerificationIntegration
              onVerificationComplete={() => {
                console.log('User verified!');
                // Handle success - refresh leaderboard, show badge, etc.
              }}
              onClose={onClose}
            />
          </div>
        )}

        {/* Non-Celo success summary - show transaction and summary on other chains */}
        {submissionStatus === 'success' && submittedChainId !== 42220 && transactionHash && (
          <div className="border-t border-gray-700 pt-3 space-y-2">
            <div className="bg-green-900/20 border border-green-700/30 rounded p-2 text-center text-xs text-green-300">
              ✅ On {networkType.charAt(0).toUpperCase() + networkType.slice(1)}
            </div>
            <a
              href={`${chainConfigs[networkType as 'polygon' | 'base' | 'monad' | 'celo'].blockExplorerUrls?.[0]}/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-center text-blue-400 hover:text-blue-300 truncate"
              title={transactionHash}
            >
              View Tx →
            </a>
            <button
              onClick={onClose}
              className="w-full px-3 py-1.5 bg-gradient-to-r from-[#fcb131] to-[#f39c12] text-black font-bold rounded text-xs hover:from-[#f39c12] hover:to-[#fcb131] transition-all"
            >
              Menu
            </button>
          </div>
        )}

        {/* Add Mini App prompt - show after successful workout in Farcaster only */}
        {isInMiniApp && repCount > 0 && (
          <div className="border-t border-gray-700 pt-4">
            <div className="text-center space-y-3">
              <p className="text-xs text-purple-300 font-medium">📌 Pin app</p>
              <AddMiniAppButton variant="secondary" showAfterWorkout={true} className="w-full" />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default SummaryModal;

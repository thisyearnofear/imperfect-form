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
  const [submissionStatus, setSubmissionStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
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

  if (!isOpen) return null;

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
      title={submissionStatus === 'success' ? 'Score Submitted!' : 'Record Your Score'}
      description={
        submissionStatus === 'success'
          ? `${getMedalEmoji()} Score successfully submitted to the leaderboard!`
          : `${getMedalEmoji()} You aced ${repCount} ${mode} in ${120 - timeLeft} secs!`
      }
      preventClose={false}
    >
      <div className="space-y-6">
        {/* Network Info - Simplified */}
        <div className="border-b border-gray-700 pb-2">
          <div className="text-center">
            <p className="text-sm text-gray-200">
              <span className="text-gray-100 font-semibold">Network:</span>{' '}
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-xs ${
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
                  ? chainConfigs[SupportedChain.POLYGON].name
                  : networkType === 'monad'
                    ? chainConfigs[SupportedChain.MONAD].name
                    : networkType === 'celo'
                      ? chainConfigs[SupportedChain.CELO].name
                      : chainConfigs[SupportedChain.BASE].name}
              </span>
            </p>
          </div>
        </div>

        {/* Wallet Connection */}
        {!effectiveAddress ? (
          <div className="text-center py-2">
            <p className="mb-2 text-sm">Connect your wallet to submit:</p>
            <UniversalConnectButton size="lg" />
          </div>
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
                />
                {/* Dynamic feedback message */}
                {submissionStatus === 'submitting' && (
                  <p className="text-sm text-yellow-400 mt-3 animate-pulse">
                    Confirming transaction... 💫
                  </p>
                )}
                {submissionStatus === 'error' && (
                  <p className="text-sm text-red-400 mt-3">Submission failed. Please try again.</p>
                )}
              </div>
            )}

            {/* Success message - show when successfully submitted */}
            {submissionStatus === 'success' && (
              <div className="rounded-md p-3 text-center">
                <div className="text-green-400 text-lg font-bold mb-2">✅ Score Submitted!</div>
                <p className="text-sm text-green-300">
                  Your {repCount} {mode} score has been recorded on the blockchain.
                </p>
              </div>
            )}

            {/* Earnings Preview - Show after successful submission */}
            {submissionStatus === 'success' && earnings && (
              <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-700/30 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-green-400 text-lg">💰</span>
                  <span className="text-sm font-semibold text-green-400">
                    Data Monetization Active
                  </span>
                </div>
                <p className="text-xs text-gray-300 text-center mb-2">
                  Your fitness data is earning $MEM tokens through Memory Protocol
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-center">
                  <div>
                    <div className="text-green-300 font-medium">
                      ${earnings.totalEarned.toFixed(4)}
                    </div>
                    <div className="text-gray-400">Total Earned</div>
                  </div>
                  <div>
                    <div className="text-blue-300 font-medium">{earnings.dataQueries}</div>
                    <div className="text-gray-400">Queries Served</div>
                  </div>
                </div>
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
                    const text = `I just completed ${repCount} ${mode} in the Onchain Olympics! 💪`;
                    const url = `https://imperfect-form.vercel.app?ref=twitter`;
                    const hashtags = ['OnchainOlympics', 'FitnessOnchain'];
                    window.open(
                      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        text
                      )}&url=${encodeURIComponent(url)}&hashtags=${hashtags.join(',')}`,
                      '_blank'
                    );
                  }}
                >
                  Twitter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Verification prompt - show after successful submission */}
        {submissionStatus === 'success' && (
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

        {/* Add Mini App prompt - show after successful workout in Farcaster only */}
        {isInMiniApp && repCount > 0 && (
          <div className="border-t border-gray-700 pt-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-purple-300 font-medium">
                🎯 Great workout! Save this app for quick access
              </p>
              <AddMiniAppButton variant="secondary" showAfterWorkout={true} className="w-full" />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default SummaryModal;

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
import SelfVerificationModal from '@/components/verification/SelfVerificationModal';
import { getMemoryClient } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';
import { useFadeTransition } from '@/hooks';
import { designTokens } from '@/lib/designTokens';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contract-addresses';
import { verifiedFitnessContractABI } from '@/constants/contracts';

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

// Network color tokens - mapped from design system
const NETWORK_STYLES = {
  polygon: {
    bg: 'bg-purple-900/50',
    text: 'text-purple-300',
    badge: { backgroundColor: 'rgba(147, 51, 234, 0.5)', color: 'rgb(216, 180, 254)' },
  },
  monad: {
    bg: 'bg-yellow-900/50',
    text: 'text-yellow-300',
    badge: { backgroundColor: 'rgba(180, 83, 9, 0.5)', color: 'rgb(253, 224, 71)' },
  },
  celo: {
    bg: 'bg-green-900/50',
    text: 'text-green-300',
    badge: { backgroundColor: 'rgba(20, 83, 45, 0.5)', color: 'rgb(134, 239, 172)' },
  },
  base: {
    bg: 'bg-blue-900/50',
    text: 'text-blue-300',
    badge: { backgroundColor: 'rgba(30, 58, 138, 0.5)', color: 'rgb(147, 197, 253)' },
  },
} as const;

// Status color tokens
const STATUS_STYLES = {
  submitting: { color: designTokens.colors.warning, className: 'text-yellow-400' },
  error: { color: designTokens.colors.error, className: 'text-red-400' },
  success: { color: designTokens.colors.success, className: 'text-green-400' },
} as const;

export interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewLeaderboard?: () => void;
  repCount: number;
  timeLeft: number;
  mode?: 'pushups' | 'squats';
  address?: string; // Optional wallet address
}

const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  onViewLeaderboard,
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

  // Auto-close on success with 2.5s delay (allows showing success message + earnings)
  const shouldAutoDismiss = submissionStatus === 'success';
  const { isVisible, className: transitionClass } = useFadeTransition(isOpen, 300);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [submittedChainId, setSubmittedChainId] = useState<number | null>(null);
  const [earnings, setEarnings] = useState<{
    totalEarned: number;
    weeklyEarnings: number;
    dataQueries: number;
  } | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [submissionType, setSubmissionType] = useState<'verified' | 'basic' | null>(null);

  // Debug logging for submission status changes
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('SummaryModal: submissionStatus changed to', submissionStatus);
    }
  }, [submissionStatus]);

  // Auto-close modal 2.5 seconds after successful submission
  React.useEffect(() => {
    if (shouldAutoDismiss && isOpen) {
      const autoDismissTimer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(autoDismissTimer);
    }
  }, [shouldAutoDismiss, isOpen, onClose]);

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

  // Check verification status on Celo
  React.useEffect(() => {
    let isMounted = true;

    async function checkVerification() {
      // Only check on Celo (42220) and if we have an address
      if (chainId !== 42220 || !walletAddress) {
        if (isMounted) setIsVerified(false);
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

        const verified = await contract.isVerifiedHuman(walletAddress);
        if (isMounted) {
          setIsVerified(verified);
          console.log('SummaryModal: User verification status on Celo:', verified);
        }
      } catch (err) {
        console.error('SummaryModal: Error checking verification status:', err);
        if (isMounted) setIsVerified(false);
      }
    }

    checkVerification();

    return () => {
      isMounted = false;
    };
  }, [chainId, walletAddress]);

  // Handle submission choice - directly set submission type and proceed
  const handleSubmitVerified = async () => {
    setSubmissionType('verified');
    // SubmitScore component will automatically execute with this type
  };

  const handleSubmitBasic = async () => {
    setSubmissionType('basic');
    // SubmitScore component will automatically execute with this type
  };

  const handleStartVerification = () => {
    setShowVerificationModal(true);
  };

  const handleVerificationSuccess = () => {
    setIsVerified(true);
    setShowVerificationModal(false);
    // After successful verification, auto-select verified submission
    setSubmissionType('verified');
  };

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

  // Calculate scores for Celo submission choice
  const baseScore = repCount;
  const bonusPoints = Math.floor(baseScore * 0.1);
  const verifiedScore = baseScore + bonusPoints;

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
            className={`inline-block font-semibold px-2.5 py-1 rounded-full text-xs ${NETWORK_STYLES[networkType].bg} ${NETWORK_STYLES[networkType].text}`}
          >
            {networkType.charAt(0).toUpperCase() + networkType.slice(1)}
          </span>
        </div>

        {/* Wallet Connection */}
        {!effectiveAddress ? (
          <UniversalConnectButton size="lg" />
        ) : (
          <div className="space-y-4">
            {/* Celo-specific: Show submission choice directly in main dialog */}
            {chainId === 42220 && submissionStatus === 'idle' && submissionType === null && (
              <div className="space-y-3 border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-400 text-center font-medium">
                  Choose your submission path:
                </p>

                {isVerified ? (
                  // VERIFIED USER: Two submission options
                  <>
                    {/* Verified Option - Primary */}
                    <button
                      onClick={handleSubmitVerified}
                      disabled={submissionStatus === 'submitting'}
                      className="w-full p-4 rounded-lg border-2 border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-green-400">
                          ✨ Verified Submission
                        </span>
                        <span className="text-2xl font-bold text-green-300">{verifiedScore}</span>
                      </div>
                      <div className="text-xs text-green-300 text-left">
                        Base {baseScore} + {bonusPoints} bonus (10%)
                      </div>
                      <div className="text-xs text-green-300/70 text-left mt-2">
                        📍 Verified Leaderboard
                      </div>
                    </button>

                    {/* Basic Option - Secondary */}
                    <button
                      onClick={handleSubmitBasic}
                      disabled={submissionStatus === 'submitting'}
                      className="w-full p-4 rounded-lg border-2 border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-bold text-slate-300">
                          📊 Standard Submission
                        </span>
                        <span className="text-2xl font-bold text-slate-300">{baseScore}</span>
                      </div>
                      <div className="text-xs text-slate-400 text-left">
                        Standard scoring, no bonus
                      </div>
                      <div className="text-xs text-slate-400/70 text-left mt-2">
                        📍 Standard Leaderboard
                      </div>
                    </button>
                  </>
                ) : (
                  // UNVERIFIED USER: Verification option + fallback
                  <>
                    {/* Verification Option - Primary CTA */}
                    <button
                      onClick={handleStartVerification}
                      disabled={submissionStatus === 'submitting'}
                      className="w-full p-4 rounded-lg border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 hover:from-yellow-500/20 hover:to-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-yellow-300">
                          🚀 Verify & Submit
                        </span>
                        <span className="text-2xl font-bold text-yellow-200">+{bonusPoints}</span>
                      </div>
                      <div className="text-xs text-yellow-300 text-left">
                        Would earn {verifiedScore} pts (10% bonus)
                      </div>
                      <div className="text-xs text-yellow-300/70 text-left mt-2">
                        ⏱️ One-time setup, ~60 seconds
                      </div>
                    </button>

                    {/* Fallback Option */}
                    <button
                      onClick={handleSubmitBasic}
                      disabled={submissionStatus === 'submitting'}
                      className="w-full p-4 rounded-lg border-2 border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-bold text-slate-300">
                          📊 Submit Without Verification
                        </span>
                        <span className="text-2xl font-bold text-slate-300">{baseScore}</span>
                      </div>
                      <div className="text-xs text-slate-400 text-left">
                        Standard scoring, no bonus
                      </div>
                      <div className="text-xs text-slate-400/70 text-left mt-2">
                        You can verify anytime to unlock bonus on future submissions
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Self Verification Modal */}
            <SelfVerificationModal
              isOpen={showVerificationModal}
              onClose={() => {
                setShowVerificationModal(false);
              }}
              onSuccess={handleVerificationSuccess}
              onError={(error) => {
                console.error('Verification failed:', error);
                setShowVerificationModal(false);
              }}
              userAddress={effectiveAddress || ''}
            />

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
                  <p className={`text-sm ${STATUS_STYLES.submitting.className} mt-3 animate-pulse`}>
                    Confirming... 💫
                  </p>
                )}
                {submissionStatus === 'error' && (
                  <p className={`text-sm ${STATUS_STYLES.error.className} mt-3`}>Failed. Retry?</p>
                )}
              </div>
            )}

            {/* Success message - show when successfully submitted */}
            {submissionStatus === 'success' && (
              <div className="rounded-md p-3 text-center space-y-2">
                <div className="text-green-400 text-base font-bold">✅ Submitted!</div>
                <div className="text-xs text-gray-400">Closing in 2 seconds...</div>
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
          <div className="border-t border-gray-700 pt-4 space-y-3">
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
              onClick={() => {
                if (onViewLeaderboard) {
                  onViewLeaderboard();
                } else {
                  onClose();
                }
              }}
              className="w-full px-3 py-2 bg-gradient-to-r from-[#fcb131] to-[#f39c12] text-black font-bold rounded text-xs hover:from-[#f39c12] hover:to-[#fcb131] transition-all"
            >
              {onViewLeaderboard ? '🏆 LEADERBOARD' : '← BACK TO MENU'}
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

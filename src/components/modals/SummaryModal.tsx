'use client';

import React, { useState } from 'react';
import { chainConfigs, SupportedChain } from '@/utils/chainSwitching';
import { AccessibleDialog } from '@/components/ui';
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
  onPlayAgain?: () => void;
  repCount: number;
  timeLeft: number;
  mode?: 'pushups' | 'squats';
  address?: string; // Optional wallet address
  sessionSummary?: import('@/services/sessionLogger').SessionSummary | null;
}

const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  onViewLeaderboard,
  onPlayAgain,
  repCount,
  timeLeft,
  mode = 'pushups',
  address,
  sessionSummary,
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
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [submissionType, setSubmissionType] = useState<'verified' | 'basic' | null>(null);
  const [report, setReport] = useState<{
    summary: string;
    strengths: string[];
    issues: string[];
    recommendations: string[];
    metrics: Record<string, number>;
  } | null>(null);
  const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

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

  // Post-session AI report (post mode)
  const handleGenerateReport = () => {
    const aiMode = process.env.NEXT_PUBLIC_AI_COACHING?.toLowerCase() || 'post';
    if (aiMode !== 'post') return;
    if (!sessionSummary) return;
    if (reportStatus === 'loading') return;

    setReportStatus('loading');
    fetch('/api/coach/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        sessionSummary,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.report) {
          setReport(data.report);
          setReportStatus('ready');
        } else {
          setReportStatus('error');
        }
      })
      .catch(() => setReportStatus('error'));
  };

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
  const isCelo = chainId === 42220;

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
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={submissionStatus === 'success' ? '✅ Submitted' : '📊 Submit'}
      description={
        submissionStatus === 'success'
          ? `${getMedalEmoji()} Leaderboard updated`
          : `${getMedalEmoji()} ${repCount} ${mode} • ${120 - timeLeft}s`
      }
      preventClose={false}
      maxWidth="520px"
    >
      <div className={`space-y-6 ${transitionClass}`}>
        {/* Network Info - Minimal badge */}
        <div className="text-center">
          <span
            className={`inline-block font-semibold px-2.5 py-1 rounded-full text-xs ${
              NETWORK_STYLES[networkType].bg
            } ${NETWORK_STYLES[networkType].text} ${isCelo ? 'text-green-100' : ''}`}
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
              <div className="space-y-3 border-t border-gray-700/50 pt-4 px-1">
                <p
                  className={`text-[10px] uppercase tracking-wider text-center font-bold mb-1 ${
                    isCelo ? 'text-green-200' : 'text-gray-500'
                  }`}
                >
                  Submission Path
                </p>

                {isVerified ? (
                  // VERIFIED USER: Two submission options
                  <div className="grid grid-cols-1 gap-3">
                    {/* Verified Option - Primary */}
                    <button
                      onClick={handleSubmitVerified}
                      disabled={submissionStatus !== 'idle'}
                      className="w-full p-4 rounded-xl border-2 border-green-500/50 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 disabled:opacity-50 transition-all shadow-lg shadow-green-900/20 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-base sm:text-lg font-bold group-active:scale-95 transition-transform ${
                            isCelo ? 'text-white' : 'text-green-300'
                          }`}
                        >
                          ✨ Verified Mode
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-white">
                          {verifiedScore}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] sm:text-xs font-medium text-left flex items-center gap-1 ${
                          isCelo ? 'text-green-100' : 'text-green-400'
                        }`}
                      >
                        <span>Base {baseScore}</span>
                        <span className="opacity-60">+</span>
                        <span className="bg-green-500 text-black px-1 rounded-sm text-[9px]">
                          {bonusPoints} Bonus
                        </span>
                      </div>
                    </button>

                    {/* Basic Option - Secondary */}
                    <button
                      onClick={handleSubmitBasic}
                      className="w-full p-3 rounded-xl border border-gray-700 bg-gray-800/40 hover:bg-gray-800/60 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-bold ${isCelo ? 'text-gray-200' : 'text-gray-400'}`}
                        >
                          Standard
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            isCelo ? 'text-gray-100' : 'text-gray-300'
                          }`}
                        >
                          {baseScore}
                        </span>
                      </div>
                    </button>
                  </div>
                ) : (
                  // UNVERIFIED USER: Verification option + fallback
                  <div className="grid grid-cols-1 gap-3">
                    {/* Verification Option - Primary CTA */}
                    <button
                      onClick={handleStartVerification}
                      className="w-full p-4 rounded-xl border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 transition-all shadow-lg shadow-yellow-900/20 group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base sm:text-lg font-bold text-yellow-300 group-active:scale-95 transition-transform">
                          🚀 Verify & Submit
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-white">
                          +{bonusPoints}
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-xs text-yellow-500 font-medium text-left">
                        Unlock {verifiedScore} total pts (10% boost)
                      </div>
                    </button>

                    {/* Fallback Option */}
                    <button
                      onClick={handleSubmitBasic}
                      className="w-full p-3 rounded-xl border border-gray-700 bg-gray-800/40 hover:bg-gray-800/60 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-400 text-left">
                          Standard (No Bonus)
                        </span>
                        <span className="text-lg font-bold text-gray-300 text-right">
                          {baseScore}
                        </span>
                      </div>
                    </button>
                  </div>
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
              <div className="rounded-xl bg-black/20 p-4 text-center border border-white/5">
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
                  <p
                    className={`text-xs ${STATUS_STYLES.submitting.className} mt-3 animate-pulse font-bold tracking-widest uppercase`}
                  >
                    Confirming Transaction...
                  </p>
                )}
                {submissionStatus === 'error' && (
                  <p className={`text-xs ${STATUS_STYLES.error.className} mt-3 font-bold`}>
                    Connection Failed. Tap to Retry.
                  </p>
                )}
              </div>
            )}

            {/* Post-session report */}
            {(sessionSummary || reportStatus !== 'idle') && (
              <div className="rounded-xl bg-black/30 p-4 text-left border border-white/10 space-y-3">
                <div className="text-xs uppercase tracking-widest text-gray-400 font-bold">
                  Session Analysis
                </div>
                {reportStatus === 'idle' && (
                  <button
                    onClick={handleGenerateReport}
                    className="w-full px-3 py-2 bg-gradient-to-r from-[#fcb131] to-[#f39c12] text-black font-bold rounded text-xs hover:from-[#f39c12] hover:to-[#fcb131] transition-all"
                  >
                    Generate Report
                  </button>
                )}
                {reportStatus === 'loading' && (
                  <div className="text-sm text-gray-300">Generating report...</div>
                )}
                {reportStatus === 'error' && (
                  <div className="text-sm text-red-400">Report failed to load.</div>
                )}
                {reportStatus === 'ready' && report && (
                  <div className="space-y-3">
                    <div className="text-sm text-white">{report.summary}</div>
                    <div>
                      <div className="text-[10px] uppercase text-green-300 font-bold mb-1">
                        Strengths
                      </div>
                      <ul className="text-xs text-gray-200 list-disc list-inside">
                        {report.strengths.map((s, i) => (
                          <li key={`s-${i}`}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-yellow-300 font-bold mb-1">
                        Issues
                      </div>
                      <ul className="text-xs text-gray-200 list-disc list-inside">
                        {report.issues.map((s, i) => (
                          <li key={`i-${i}`}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-blue-300 font-bold mb-1">
                        Recommendations
                      </div>
                      <ul className="text-xs text-gray-200 list-disc list-inside">
                        {report.recommendations.map((s, i) => (
                          <li key={`r-${i}`}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success message - show when successfully submitted */}
            {submissionStatus === 'success' && (
              <div className="rounded-xl bg-green-500/10 p-6 text-center space-y-4 border border-green-500/30 animate-in fade-in zoom-in duration-300">
                <div className="text-green-400 text-xl font-black tracking-tight">
                  MISSION SUCCESSFUL
                </div>
                <div className="text-[10px] text-green-400/60 uppercase font-black tracking-widest">
                  Onchain data stored
                </div>
                {/* Play Again Button */}
                {onPlayAgain && (
                  <button
                    onClick={() => {
                      onPlayAgain();
                      onClose();
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-blue-500 flex items-center justify-center gap-2"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '11px',
                    }}
                  >
                    <span>🎮</span>
                    <span>PLAY AGAIN</span>
                  </button>
                )}
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
    </AccessibleDialog>
  );
};

export default SummaryModal;

'use client';

import React, { useState } from 'react';
import { chainConfigs } from '@/utils/chainSwitching';
import { AccessibleDialog } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { UniversalConnectButton } from '@/components/wallet';
import FarcasterShare from '@/components/social/FarcasterShare';
import { SubmitScore } from '@/components/game';
import { ONCHAIN_MODES } from '@/components/game/ModeSwitch';
import { AddMiniAppButton } from '@/components/miniapp/AddMiniAppButton';
import { VerificationIntegration } from '@/components/verification';
import SelfVerificationModal from '@/components/verification/SelfVerificationModal';
import { useFadeTransition } from '@/hooks';
import { designTokens } from '@/lib/designTokens';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/config/contract-addresses';
import { verifiedFitnessContractABI } from '@/constants/contracts';
import { markWorkoutSynced, getLocalWorkouts } from '@/services/integrations/WorkoutDataAdapter';
import { useXpProgress } from '@/hooks/useXpProgress';
import { useCoachPersonality } from '@/hooks/useCoachPersonality';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import { useImmersive } from '@/hooks/useImmersive';
import LabAnalysisCard from '@/components/coach/LabAnalysisCard';
import RecoveryCard from '@/components/recovery/RecoveryCard';
import { useAchievements } from '@/hooks/useAchievements';
import { xpService, StreakInfo } from '@/services/XPService';
import { Achievement } from '@/services/AchievementService';
import { useScaleTransition } from '@/hooks';
import { ghostService } from '@/services/GhostService';
import { ProgressSpark } from '@/components/progress';
import { getRecentProgressSeries, type ProgressSeries } from '@/lib/progress/recentProgress';
import { playUiCue } from '@/lib/uiSound';
import { SessionRecap } from '@/components/game/SessionRecap';
import { sessionStory } from '@/lib/coachingStory';

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
  onPlayAgain?: (focus: string) => void;
  repCount: number;
  timeLeft: number;
  mode?: import('@/utils/biomechanics').ExerciseMode;
  address?: string; // Optional wallet address
  sessionSummary?: import('@/services/sessionLogger').SessionSummary | null;
  onStartSelfGhost?: (workoutId: string) => void;
  isRace?: boolean;
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
  onStartSelfGhost,
  isRace = false,
}) => {
  const { platform, wallet, user } = usePlatform();
  const { progress, pbs } = useXpProgress();
  const { immersive } = useImmersive();
  const { checkNewAchievements } = useAchievements();
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [progressSeries, setProgressSeries] = useState<ProgressSeries | null>(null);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
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
  const [personality] = useCoachPersonality();
  const { intent: sessionIntent, register: sessionRegister } = useSessionIntent();

  // Staged post-workout flow: analyze -> recover -> celebrate.
  // Entry stage is coaching-first (analyze). Earned celebration is the final stage.
  const [stage, setStage] = useState<'celebrate' | 'recover' | 'analyze'>('analyze');
  React.useEffect(() => {
    if (!isOpen) return;
    if (sessionIntent === 'understand') setStage('analyze');
    else if (sessionIntent === 'recover') setStage('recover');
    else setStage('celebrate');
  }, [isOpen, sessionIntent]);
  const summaryRegister =
    stage === 'analyze' ? 'lab' : stage === 'recover' ? 'calm' : sessionRegister;
  const retryFocus = sessionStory(sessionSummary ?? null, mode, repCount).focus;

  // Auto-close modal 2.5 seconds after successful submission
  React.useEffect(() => {
    if (shouldAutoDismiss && isOpen) {
      const autoDismissTimer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(autoDismissTimer);
    }
  }, [shouldAutoDismiss, isOpen, onClose]);

  // Calculate streak, achievements, and progress spark when modal opens
  React.useEffect(() => {
    if (isOpen) {
      getLocalWorkouts().then(async (workouts) => {
        const info = xpService.getStreakInfo(workouts);
        setStreakInfo(info);

        const newlyUnlocked = await checkNewAchievements(workouts);
        if (newlyUnlocked.length > 0) {
          setNewAchievements(newlyUnlocked);
          // Auto-clear achievements after 5 seconds
          setTimeout(() => {
            setNewAchievements([]);
          }, 5000);
        }
      });
      getRecentProgressSeries().then(setProgressSeries);
      if (sessionRegister === 'arcade') {
        playUiCue('success', { register: sessionRegister });
      }
    } else {
      setNewAchievements([]);
      setProgressSeries(null);
    }
  }, [isOpen, checkNewAchievements, sessionRegister]);

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
        personality,
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

  // Handle sharing a ghost challenge trace
  const handleChallengeShare = (platform: 'warpcast' | 'twitter') => {
    if (!sessionSummary?.trace || sessionSummary.trace.length === 0) {
      console.warn('No trace available for sharing');
      return;
    }

    try {
      const shareUrl = ghostService.generateShareUrl(sessionSummary.trace, mode);
      const text = `🏃 I just did ${repCount} ${mode}! Can you beat my ghost? 👻 #OnchainOlympics #ImperfectForm`;

      if (platform === 'warpcast') {
        // Warpcast share URL
        const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(shareUrl)}`;
        window.open(warpcastUrl, '_blank');
      } else {
        // Twitter/X share URL
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to share challenge:', error);
    }
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
  const networkType = network as 'polygon' | 'base' | 'monad' | 'celo' | 'avalanche';

  // Use the address from props if provided, otherwise fall back to wallet address from context
  const effectiveAddress = address || walletAddress;

  // Debug logging for mobile wallet issues
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('SummaryModal Debug Info:', {
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

  const { isVisible: showAchievement, className: achievementClass } = useScaleTransition(
    newAchievements.length > 0,
    500
  );

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

  const isPB = repCount > 0 && repCount === pbs[mode];

  // Generate Highlight Card URL
  const highlightCardUrl = React.useMemo(() => {
    if (!sessionSummary?.bestPose) return null;

    const reps = repCount;
    const baseWorkoutXp = reps * 10 + 50;
    const multiplier = streakInfo?.multiplier || 1;
    const xpEarned = Math.floor(baseWorkoutXp * multiplier) + (isPB ? 100 : 0);
    const level = progress.currentLevel;

    const kps = sessionSummary.bestPose.keypoints;
    const indices = [5, 6, 11, 12, 7, 8, 9, 10, 13, 14, 15, 16];

    // Map MoveNet indices
    const moveNetIdxMap: Record<string, number> = {
      left_shoulder: 5,
      right_shoulder: 6,
      left_hip: 11,
      right_hip: 12,
      left_elbow: 7,
      right_elbow: 8,
      left_wrist: 9,
      right_wrist: 10,
      left_knee: 13,
      right_knee: 14,
      left_ankle: 15,
      right_ankle: 16,
    };

    const kpMap = kps.reduce(
      (map, kp) => {
        const moveNetIdx = moveNetIdxMap[kp.name];
        if (moveNetIdx !== undefined) map[moveNetIdx] = kp;
        return map;
      },
      {} as Record<number, (typeof kps)[0]>
    );

    // Filter to only included indices for normalization
    const relevantKps = Object.values(kpMap);
    if (relevantKps.length === 0) return null;

    const minX = Math.min(...relevantKps.map((p) => p.x));
    const maxX = Math.max(...relevantKps.map((p) => p.x));
    const minY = Math.min(...relevantKps.map((p) => p.y));
    const maxY = Math.max(...relevantKps.map((p) => p.y));

    const pWidth = maxX - minX;
    const pHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const scale = 700 / Math.max(pWidth, pHeight || 1);

    const kpString = indices
      .map((idx) => {
        const p = kpMap[idx];
        if (!p) return '500,500';
        const nx = Math.round(500 + (p.x - centerX) * scale);
        const ny = Math.round(500 + (p.y - centerY) * scale);
        return `${nx},${ny}`;
      })
      .join(',');

    const params = new URLSearchParams({
      type: 'highlight-card',
      mode,
      reps: reps.toString(),
      level: level.toString(),
      xp: xpEarned.toString(),
      kp: kpString,
    });

    return `/api/screenshots?${params.toString()}`;
  }, [sessionSummary, repCount, isPB, progress.currentLevel, mode, streakInfo?.multiplier]);

  if (!isVisible) return null;

  // Calculate scores for Celo submission choice
  const baseScore = repCount;
  const bonusPoints = Math.floor(baseScore * 0.1);
  const verifiedScore = baseScore + bonusPoints;

  return (
    <>
      <AccessibleDialog
        isOpen={isOpen}
        onClose={onClose}
        title={
          submissionStatus === 'success'
            ? 'Synced to leaderboard'
            : immersive
              ? 'Graded'
              : 'Your coaching recap'
        }
        description={
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              {immersive ? (
                <span className="sandow-grade">{getMedalEmoji()}</span>
              ) : (
                <span>{getMedalEmoji()}</span>
              )}
              <span>
                {submissionStatus === 'success'
                  ? 'Rank updated on-chain'
                  : `${repCount} ${mode} • ${120 - timeLeft}s`}
              </span>
            </div>
            {isRace && (
              <div className="mt-2">
                <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)] uppercase tracking-tighter">
                  👻 Ghost Challenge Completed
                </span>
              </div>
            )}
            {isPB && submissionStatus !== 'success' && (
              <div className="mt-2 summary-pb-badge">
                {immersive ? (
                  <span className="sandow-warrant">Royal Warrant · New Personal Best</span>
                ) : (
                  <span className="bg-primary text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(252,177,49,0.5)]">
                    🔥 NEW PERSONAL BEST!
                  </span>
                )}
              </div>
            )}
            {/* Value-moment wallet ask: only at a PB, only when no wallet -
                on-chain is an earned upgrade, never a prerequisite */}
            {isPB && !effectiveAddress && ONCHAIN_MODES.includes(mode) && (
              <div className="mt-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-3 text-center space-y-2">
                <p className="text-xs text-yellow-200/90 font-sans">
                  Make this record permanent — etch it on-chain and join the global leaderboard.
                </p>
                <UniversalConnectButton />
              </div>
            )}
            {streakInfo && streakInfo.currentStreak > 1 && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-orange-500 font-bold">
                  🔥 {streakInfo.currentStreak} DAY STREAK
                </span>
                {streakInfo.multiplier > 1 && (
                  <span className="bg-orange-500/20 text-orange-400 text-[10px] px-1.5 py-0.5 rounded border border-orange-500/30">
                    {streakInfo.multiplier}x XP
                  </span>
                )}
              </div>
            )}
          </div>
        }
        preventClose={false}
        maxWidth="520px"
      >
        <div
          className={`space-y-5 ${transitionClass}`}
          data-register={summaryRegister}
          data-summary-intent={sessionIntent}
        >
          {/* Stage stepper: recap -> recover -> score */}
          {submissionStatus !== 'success' && (
            <div
              className="flex justify-center gap-1.5 summary-stage-tabs"
              role="tablist"
              aria-label="Summary stages"
            >
              {(
                [
                  { key: 'analyze', label: 'Recap', emoji: '📝' },
                  { key: 'recover', label: 'Recover', emoji: '🌬️' },
                  { key: 'celebrate', label: 'Score', emoji: '🏆' },
                ] as const
              ).map((s) => (
                <button
                  key={s.key}
                  role="tab"
                  aria-selected={stage === s.key}
                  onClick={() => setStage(s.key)}
                  className={`summary-stage-tab px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    stage === s.key ? 'is-active' : ''
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          )}

          {/* ===== CELEBRATE: the trophy moment =====
             Relevance-gated so a guest never sees a wall of wallet/verify/share
             CTAs. Hero = the result; one primary CTA; earned depth below. */}
          {stage === 'celebrate' && submissionStatus !== 'success' && (
            <>
              {/* Progress spark — earned depth, not a gate */}
              {repCount > 0 && progressSeries && (
                <ProgressSpark
                  points={progressSeries.points}
                  register={
                    sessionRegister === 'studio'
                      ? 'studio'
                      : sessionRegister === 'calm'
                        ? 'calm'
                        : 'arcade'
                  }
                  title={sessionRegister === 'studio' ? 'Form signal' : 'Recent progress'}
                  animate={!isPB}
                  className="summary-progress-spark"
                />
              )}

              {/* Single primary CTA — no duplicates */}
              {onPlayAgain && (
                <button
                  onClick={() => {
                    onPlayAgain(retryFocus);
                    onClose();
                  }}
                  className="w-full px-4 py-3 bg-teal-600/80 hover:bg-teal-500/80 text-white font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] border border-teal-400/30 flex items-center justify-center gap-2"
                >
                  <span>↺</span>
                  <span>Try another set</span>
                </button>
              )}

              {/* On-chain: only when relevant (has wallet + on-chain mode + not yet submitted) */}
              {effectiveAddress && ONCHAIN_MODES.includes(mode) && (
                <div className="space-y-4">
                  {/* Celo-specific: Show submission choice directly in main dialog */}
                  {chainId === 42220 && submissionStatus === 'idle' && submissionType === null && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          Select Submission Type
                        </span>
                        {isCelo && (
                          <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-bold border border-green-500/20">
                            Celo Bonus Active
                          </span>
                        )}
                      </div>

                      {isVerified ? (
                        // VERIFIED USER: Primary Verified Button + Subtle Basic Link
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={handleSubmitVerified}
                            className="relative w-full p-4 rounded-xl bg-gradient-to-br from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 text-white shadow-lg shadow-green-900/30 border border-green-500/30 transition-all active:scale-[0.98] group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <div className="font-black text-lg sm:text-xl flex items-center gap-2">
                                  <span>Verified Score</span>
                                  <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                                    +10%
                                  </span>
                                </div>
                                <div className="text-xs sm:text-sm text-green-100 font-medium opacity-90 mt-0.5">
                                  Submit with verified human badge
                                </div>
                              </div>
                              <div className="text-3xl sm:text-4xl font-black tracking-tighter drop-shadow-md">
                                {verifiedScore}
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={handleSubmitBasic}
                            className="w-full py-2 text-xs sm:text-sm text-gray-500 hover:text-gray-300 font-medium transition-colors"
                          >
                            or submit as{' '}
                            <span className="underline decoration-gray-700 underline-offset-2">
                              Standard Score ({baseScore})
                            </span>
                          </button>
                        </div>
                      ) : (
                        // UNVERIFIED USER: Prominent Verify CTA + Secondary Basic Button
                        <div className="flex flex-col gap-2.5">
                          <button
                            onClick={handleStartVerification}
                            className="relative w-full p-4 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white shadow-lg shadow-orange-900/30 border border-yellow-500/30 transition-all active:scale-[0.98] group overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between relative z-10">
                              <div className="text-left">
                                <div className="font-black text-lg sm:text-xl text-white flex items-center gap-2">
                                  <span>Verify & Submit</span>
                                  <span className="bg-black/20 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                                    BONUS
                                  </span>
                                </div>
                                <div className="text-xs sm:text-sm text-yellow-50 font-medium opacity-90 mt-0.5">
                                  Get +{bonusPoints} points boost
                                </div>
                              </div>
                              <div className="text-3xl sm:text-4xl font-black tracking-tighter drop-shadow-md">
                                {verifiedScore}
                              </div>
                            </div>
                          </button>

                          <button
                            onClick={handleSubmitBasic}
                            className="w-full p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 active:bg-white/5 transition-all flex items-center justify-between group"
                          >
                            <span className="text-sm font-semibold text-gray-400 group-hover:text-gray-300 transition-colors">
                              Submit Standard Score
                            </span>
                            <span className="text-base font-bold text-gray-500 group-hover:text-gray-400 transition-colors">
                              {baseScore}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submit Score component - only show if level is 5+ (outer block already gates on not-success) */}
                  {ONCHAIN_MODES.includes(mode) && (
                    <div className="studio-card studio-card__body text-center">
                      {progress.currentLevel >= 5 ? (
                        <>
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
                              // Update local workout as synced for freemium model
                              if (sessionSummary) {
                                const networkName = getNetworkFromChainId(chainId);
                                getLocalWorkouts().then((workouts) => {
                                  // Match by timestamp (startTime)
                                  const workout = workouts.find(
                                    (w) => w.timestamp === sessionSummary.startTime
                                  );
                                  if (workout) {
                                    markWorkoutSynced(workout.id, txHash, networkName as any);
                                    if (process.env.NODE_ENV !== 'production') {
                                      console.log('✅ Local workout marked as synced:', workout.id);
                                    }
                                  }
                                });
                              }
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
                        </>
                      ) : (
                        <div>
                          <div className="flex items-center justify-center gap-2 text-gray-500 mb-2">
                            <span className="text-lg">🔒</span>
                            <span className="text-sm font-bold uppercase tracking-widest">
                              On-chain Sync Locked
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            Reach <span className="text-primary font-bold">Level 5</span> to sync
                            your workouts to the blockchain.
                          </p>
                          <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-600"
                              style={{ width: `${(progress.currentLevel / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Non-on-chain mode: quiet local-saved note (no wallet wall) */}
              {stage === 'celebrate' && !ONCHAIN_MODES.includes(mode) && (
                <div className="studio-card studio-card__body text-center">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                    💾 Saved locally — on-chain leaderboards coming for this exercise
                  </span>
                </div>
              )}

              {/* Highlight Card — only when a best pose exists */}
              {highlightCardUrl && (
                <div className="space-y-3">
                  <p className="studio-card__section-title text-center">✨ AI Highlight Card</p>
                  <div className="studio-card overflow-hidden aspect-[9/16] max-h-[400px] mx-auto relative group">
                    <img
                      src={highlightCardUrl}
                      alt="Workout Highlight"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                      <button
                        onClick={() => {
                          const text = `Check out my ${repCount} ${mode} on Imperfect Form! 💪 #OnchainOlympics`;
                          if (isInMiniApp) {
                            window.open(
                              `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(window.location.origin + highlightCardUrl)}`,
                              '_blank'
                            );
                          } else {
                            window.open(
                              `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin + highlightCardUrl)}`,
                              '_blank'
                            );
                          }
                        }}
                        className="bg-white text-black font-bold px-4 py-2 rounded-full text-xs shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
                      >
                        Share Highlight
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Share row — Farcaster + Twitter, guests too */}
              {repCount > 0 && (
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex flex-col items-center space-y-4">
                    <FarcasterShare
                      reps={repCount}
                      exerciseMode={mode}
                      timeSpent={formatExerciseTime(120 - timeLeft)}
                      network={networkType}
                      isInMiniApp={isInMiniApp}
                      user={user}
                    />
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

              {/* Ghost challenge — only when a trace exists */}
              {repCount > 0 && sessionSummary?.trace && sessionSummary.trace.length > 0 && (
                <div className="studio-card studio-card__body items-center text-center">
                  <p className="studio-card__section-title">👻 Challenge Friends</p>
                  <p className="text-[10px] text-gray-500 text-center px-2">
                    Share your workout as a ghost trace for friends to race against
                  </p>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleChallengeShare('warpcast')}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <span>🟣</span>
                      <span>Warpcast</span>
                    </button>
                    <button
                      onClick={() => handleChallengeShare('twitter')}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <span>𝕏</span>
                      <span>Twitter</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pin app — Farcaster only */}
              {isInMiniApp && repCount > 0 && (
                <div className="studio-card studio-card__body text-center">
                  <p className="text-xs text-purple-300 font-medium">📌 Pin app</p>
                  <AddMiniAppButton
                    variant="secondary"
                    showAfterWorkout={true}
                    className="w-full"
                  />
                </div>
              )}

              {/* Forward nav to recover */}
              <button
                onClick={() => setStage('recover')}
                className="w-full px-4 py-3 bg-gradient-to-r from-teal-600/60 to-teal-700/60 hover:from-teal-500/60 hover:to-teal-600/60 text-teal-50 font-bold rounded-xl text-xs uppercase tracking-widest transition-[transform,background-color,border-color] duration-200 border border-teal-400/20 active:scale-[0.96]"
              >
                🌬️ Cool Down →
              </button>
            </>
          )}

          {/* Success state — replaces the celebrate flow after on-chain submit */}
          {stage === 'celebrate' && submissionStatus === 'success' && (
            <div className="studio-card studio-card__body text-center animate-in fade-in zoom-in duration-300">
              <div className="text-teal-300 text-xl font-semibold tracking-tight">
                Synced to leaderboard
              </div>
              <div className="text-[10px] text-teal-300/60 uppercase font-semibold tracking-widest">
                On-chain record stored
              </div>
              {onPlayAgain && (
                <button
                  onClick={() => {
                    onPlayAgain(retryFocus);
                    onClose();
                  }}
                  className="w-full px-4 py-3 bg-teal-600/80 hover:bg-teal-500/80 text-white font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] border border-teal-400/30 flex items-center justify-center gap-2"
                >
                  <span>↺</span>
                  <span>Try another set</span>
                </button>
              )}
            </div>
          )}

          {/* ===== RECOVER: the night studio ===== */}
          {stage === 'recover' && (
            <>
              {repCount > 0 && <RecoveryCard mode={mode} />}
              <button
                onClick={() => setStage('celebrate')}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600/60 to-violet-700/60 hover:from-purple-500/60 hover:to-violet-600/60 text-purple-50 font-bold rounded-xl text-xs uppercase tracking-widest transition-all border border-purple-400/20 active:scale-[0.96]"
              >
                🏆 Save score →
              </button>
              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 font-semibold rounded-xl text-xs uppercase tracking-widest transition-all border border-white/10 active:scale-[0.96]"
              >
                Done
              </button>
            </>
          )}

          {/* ===== ANALYZE: the lab (works for guests too) ===== */}
          {stage === 'analyze' && (
            <SessionRecap
              mode={mode}
              reps={repCount}
              summary={sessionSummary ?? null}
              userAddress={effectiveAddress ?? undefined}
              onStartSelfGhost={onStartSelfGhost}
              onTryAgain={
                onPlayAgain
                  ? (focus) => {
                      onPlayAgain(focus);
                      onClose();
                    }
                  : undefined
              }
            />
          )}
          {stage === 'analyze' && (sessionSummary || reportStatus !== 'idle') && (
            <LabAnalysisCard
              report={report}
              status={reportStatus}
              personality={personality}
              onGenerate={handleGenerateReport}
            />
          )}

          {stage === 'analyze' && (
            <button
              onClick={() => setStage('celebrate')}
              className="w-full px-4 py-3 bg-gradient-to-r from-teal-600/60 to-teal-700/60 hover:from-teal-500/60 hover:to-teal-600/60 text-teal-50 font-bold rounded-xl text-xs uppercase tracking-widest transition-[transform,background-color,border-color] duration-200 border border-teal-400/20 active:scale-[0.96]"
            >
              🏆 Save score →
            </button>
          )}

          {/* Celo-specific verification prompt - show after successful submission on Celo only */}
          {submissionStatus === 'success' && submittedChainId === 42220 && (
            <VerificationIntegration
              onVerificationComplete={() => {
                // Handle success - refresh leaderboard, show badge, etc.
              }}
              onClose={onClose}
            />
          )}

          {/* Non-Celo success summary - show transaction and summary on other chains */}
          {submissionStatus === 'success' && submittedChainId !== 42220 && transactionHash && (
            <div className="studio-card studio-card__body text-center">
              <div className="bg-green-900/20 border border-green-700/30 rounded p-2 text-center text-xs text-green-300">
                ✅ On {networkType.charAt(0).toUpperCase() + networkType.slice(1)}
              </div>
              <a
                href={`${chainConfigs[networkType as 'polygon' | 'base' | 'monad' | 'celo' | 'avalanche'].blockExplorerUrls?.[0]}/tx/${transactionHash}`}
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
                className="w-full px-3 py-2 bg-gradient-to-r from-primary to-primary-dark text-black font-bold rounded text-xs hover:from-primary-dark hover:to-primary transition-all"
              >
                {onViewLeaderboard ? '🏆 LEADERBOARD' : '← BACK TO MENU'}
              </button>
            </div>
          )}

          {/* Self Verification Modal - mounted regardless of stage/wallet branch */}
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
        </div>
      </AccessibleDialog>

      {/* Achievement Unlocked Overlay */}
      {showAchievement && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4 ${achievementClass}`}
        >
          <div className="flex flex-col gap-4 items-center">
            {newAchievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className="bg-black/80 backdrop-blur-md border-2 border-primary rounded-2xl p-6 flex flex-col items-center gap-2 shadow-[0_0_30px_rgba(252,177,49,0.4)] max-w-sm animate-fade-in animate-slide-up"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <span className="text-5xl">{achievement.icon}</span>
                <div className="text-center">
                  <div className="text-primary font-black text-xl uppercase tracking-tighter">
                    Achievement Unlocked!
                  </div>
                  <div className="text-white font-bold text-lg">{achievement.name}</div>
                  <div className="text-gray-400 text-sm">{achievement.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default SummaryModal;

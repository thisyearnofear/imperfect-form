'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Dumbbell,
  Flame,
  Ghost,
  Lock,
  Medal,
  Pin,
  RotateCcw,
  Save,
  Sparkles,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { chainConfigs } from '@/utils/chainSwitching';
import { AccessibleDialog } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { UniversalConnectButton } from '@/components/wallet';
import FarcasterShare from '@/components/social/FarcasterShare';
import { SubmitScore } from '@/components/game';
import { ONCHAIN_MODES, ONCHAIN_UNLOCK_LEVEL } from '@/constants/onchainModes';
import { AddMiniAppButton } from '@/components/miniapp/AddMiniAppButton';
import { VerificationIntegration } from '@/components/verification';
import SelfVerificationModal from '@/components/verification/SelfVerificationModal';
import { useFadeTransition } from '@/hooks';
import { designTokens } from '@/lib/designTokens';
import { zIndexClasses } from '@/lib/zTokens';
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
import { AchievementIcon } from '@/components/ui/AchievementIcon';
import { useScaleTransition } from '@/hooks';
import { ProgressSpark } from '@/components/progress';
import { getRecentProgressSeries, type ProgressSeries } from '@/lib/progress/recentProgress';
import { playUiCue } from '@/lib/uiSound';
import { SessionRecap } from '@/components/game/SessionRecap';
import { sessionStory } from '@/lib/coachingStory';
import { BRAND } from '@/lib/brandPositioning';
import { getFormGrade } from '@/lib/formGrade';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { MovementChallengePayload } from '@/types/movementChallenge';
import type { LocalWorkout } from '@/types/workout';

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
  movementAssessment?: MovementAssessment | null;
  movementChallenge?: MovementChallengePayload | null;
  formScores?: number[];
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
  movementAssessment,
  movementChallenge,
  formScores = [],
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
  // An explicit empty snapshot prevents recap children from issuing their own
  // full storage read while this modal-owned snapshot is loading.
  const [localWorkouts, setLocalWorkouts] = useState<LocalWorkout[]>([]);
  const { address: walletAddress, chainId } = wallet;
  const isInMiniApp = platform === 'farcaster';

  const [submissionStatus, setSubmissionStatus] = useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');

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
  const arcade = sessionRegister === 'arcade';

  // Single-page recap: every section renders inline in one scroll — no stage
  // stepper. The on-chain submission is the first content block (primary
  // conversion); the coaching recap and recovery flow beneath it. There is no
  // auto-close: a submitted workout stays visible until the user chooses
  // "Play Again" or "Done" (the confirmation is no longer cut short).
  const retryFocus = sessionStory(sessionSummary ?? null, mode, repCount).focus;
  const showArcadeResults = arcade && submissionStatus !== 'success';

  // Calculate streak, achievements, and progress spark when modal opens
  React.useEffect(() => {
    let active = true;
    let achievementTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      setLocalWorkouts([]);
      getLocalWorkouts()
        .then(async (workouts) => {
          if (!active) return;
          setLocalWorkouts(workouts);
          const info = xpService.getStreakInfo(workouts);
          setStreakInfo(info);

          const newlyUnlocked = await checkNewAchievements(workouts);
          if (!active || newlyUnlocked.length === 0) return;

          setNewAchievements(newlyUnlocked);
          // Auto-clear achievements after 5 seconds
          achievementTimer = setTimeout(() => {
            if (active) setNewAchievements([]);
          }, 5000);
        })
        .catch(() => {
          if (active) setLocalWorkouts([]);
        });
      getRecentProgressSeries().then((series) => {
        if (active) setProgressSeries(series);
      });
      // Celebrate is arcade punctuation even on a studio session — brief cue, then chassis.
      playUiCue('success', { register: 'arcade' });
    } else {
      setNewAchievements([]);
      setProgressSeries(null);
    }

    return () => {
      active = false;
      if (achievementTimer) clearTimeout(achievementTimer);
    };
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

  // Medal tier by rep count — rendered as a brass lucide mark, not emoji.
  const getMedalTier = (): 'gold' | 'silver' | 'bronze' | 'none' => {
    if (mode === 'pushups') {
      if (repCount >= 30) return 'gold';
      else if (repCount >= 20) return 'silver';
      else if (repCount >= 10) return 'bronze';
    } else {
      if (repCount >= 40) return 'gold';
      else if (repCount >= 25) return 'silver';
      else if (repCount >= 15) return 'bronze';
    }
    return 'none';
  };

  const medalTier = getMedalTier();
  const MedalGlyph: LucideIcon = medalTier === 'none' ? Dumbbell : Medal;

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

  // Compact form-score hero (curls only) — grade + average under the headline.
  const avgFormScore =
    mode === 'curls' && formScores.length > 0
      ? Math.round(formScores.reduce((a, b) => a + b, 0) / formScores.length)
      : null;
  const formGrade = avgFormScore !== null ? getFormGrade(avgFormScore) : null;

  return (
    <>
      <AccessibleDialog
        isOpen={isOpen}
        onClose={onClose}
        title={
          submissionStatus === 'success'
            ? 'Synced to leaderboard'
            : showArcadeResults
              ? 'ARCADE SCORE'
              : immersive
                ? 'Graded'
                : 'Your coaching recap'
        }
        description={
          <div
            className={`flex flex-col items-center${showArcadeResults ? ' summary-arcade-description' : ''}`}
          >
            {showArcadeResults ? (
              <div
                className="summary-arcade-score-plate"
                aria-label={`Score ${repCount}, ${mode}, ${120 - timeLeft} seconds`}
              >
                <span className="summary-arcade-score-label">SCORE</span>
                <strong className="summary-arcade-score-value tabular-nums">{repCount}</strong>
                <span className="summary-arcade-score-meta">
                  {mode} · {120 - timeLeft}s
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {immersive ? (
                  <span className="sandow-grade">
                    <MedalGlyph size={12} aria-hidden="true" /> {repCount} reps
                  </span>
                ) : (
                  <MedalGlyph
                    size={18}
                    aria-hidden="true"
                    style={{
                      color:
                        medalTier === 'gold'
                          ? 'var(--sandow-brass)'
                          : medalTier === 'silver'
                            ? '#c8d6d3'
                            : medalTier === 'bronze'
                              ? '#cd7f32'
                              : 'var(--studio-muted-dim)',
                    }}
                  />
                )}
                <span>
                  {submissionStatus === 'success'
                    ? 'Rank updated on-chain'
                    : `${repCount} ${mode} • ${120 - timeLeft}s`}
                </span>
              </div>
            )}
            {isRace && (
              <div className="mt-2">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-tight"
                  style={{
                    background: 'rgba(252, 177, 49, 0.14)',
                    color: 'var(--sandow-brass-soft)',
                    border: '1px solid var(--sandow-rule-quiet)',
                  }}
                >
                  <Ghost size={12} aria-hidden="true" /> Ghost challenge completed
                </span>
              </div>
            )}
            {isPB && submissionStatus !== 'success' && (
              <div className={`mt-2 summary-pb-badge${arcade ? ' summary-arcade-high-score' : ''}`}>
                {arcade ? (
                  <span aria-label="New personal best">HIGH SCORE</span>
                ) : immersive ? (
                  <span className="sandow-warrant">Royal Warrant · New Personal Best</span>
                ) : (
                  <span className="sandow-grade">New personal best</span>
                )}
              </div>
            )}
            {/* Value-moment wallet ask: only at a PB, only when no wallet -
                on-chain is an earned upgrade, never a prerequisite */}
            {isPB && !effectiveAddress && ONCHAIN_MODES.includes(mode) && (
              <div
                className="mt-3 rounded-lg p-3 text-center space-y-2"
                style={{
                  background: 'rgba(252, 177, 49, 0.08)',
                  border: '1px solid var(--sandow-rule-quiet)',
                }}
              >
                <p className="text-xs font-sans" style={{ color: 'var(--sandow-brass-soft)' }}>
                  Make this record permanent — etch it on-chain and join the global leaderboard.
                </p>
                <UniversalConnectButton size="sm" />
              </div>
            )}
            {streakInfo && streakInfo.currentStreak > 1 && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="earned-streak text-sm font-bold">
                  <Flame size={14} aria-hidden="true" /> {streakInfo.currentStreak} day streak
                </span>
                {streakInfo.multiplier > 1 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded font-bold"
                    style={{
                      background: 'rgba(252, 177, 49, 0.16)',
                      color: 'var(--sandow-brass)',
                      border: '1px solid var(--sandow-rule-quiet)',
                    }}
                  >
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
          data-register={sessionRegister}
          data-summary-intent={sessionIntent}
        >
          {/* ===== SUBMIT SCORE: the primary conversion, first =====
             The block only renders for a connected wallet on an on-chain mode,
             so a guest never sees a wall of wallet/verify/share CTAs. */}
          {submissionStatus !== 'success' && (
            <>
              {/* Compact form-score hero (curls only) — grade + average right
                 under the headline, mirroring the single-card mock. */}
              {mode === 'curls' && avgFormScore !== null && formGrade && (
                <div className="studio-card studio-card__body text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="sandow-grade" style={{ color: formGrade.color }}>
                      Grade {formGrade.grade}
                    </span>
                    <span className="text-sm font-semibold text-teal-100 tabular-nums">
                      {avgFormScore}/100
                    </span>
                  </div>
                  <p className="sandow-lineage" style={{ margin: 0 }}>
                    {BRAND.sandowGrade}
                  </p>
                </div>
              )}

              {/* ===== COACHING RECAP: the one fix owns this screen =====
                  Everything else — on-chain, sharing, recovery — is quiet,
                  collapsed, or below the primary actions. */}
              <SessionRecap
                mode={mode}
                reps={repCount}
                summary={sessionSummary ?? null}
                movementAssessment={movementAssessment}
                movementChallenge={movementChallenge}
                workouts={localWorkouts}
                userAddress={effectiveAddress ?? undefined}
                formScores={formScores}
                isRace={isRace}
                onStartSelfGhost={onStartSelfGhost}
              />
              {(sessionSummary || reportStatus !== 'idle') && (
                <LabAnalysisCard
                  report={report}
                  status={reportStatus}
                  personality={personality}
                  onGenerate={handleGenerateReport}
                />
              )}

              {/* ===== PERSISTENT ACTIONS: repeat or finish — before the
                  secondary chrome, so the next step never scrolls away ===== */}
              {onPlayAgain && (
                <button
                  onClick={() => {
                    onPlayAgain(retryFocus);
                    onClose();
                  }}
                  className="earned-cta-studio w-full px-4 py-3 text-base flex items-center justify-center gap-2 active:scale-[0.96] transition-transform"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  <span>{arcade ? 'PLAY AGAIN' : 'Try another set'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-teal-100 font-bold rounded-xl text-xs uppercase tracking-widest transition-all border border-white/10 active:scale-[0.96]"
              >
                Done
              </button>

              {/* On-chain: an earned upgrade behind a quiet disclosure — never
                  the recap's opening act (has wallet + on-chain mode + not yet
                  submitted). */}
              {effectiveAddress && ONCHAIN_MODES.includes(mode) && (
                <details className="rounded-xl border border-white/10 bg-white/[0.02]">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-200 transition-colors [&::-webkit-details-marker]:hidden">
                    <span>Make it permanent — sync to the leaderboard</span>
                    <span aria-hidden="true" className="transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <div className="px-4 pb-4 space-y-4">
                    {/* Celo-specific: Show submission choice directly in main dialog */}
                    {chainId === 42220 &&
                      submissionStatus === 'idle' &&
                      submissionType === null && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between px-1 mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                              Select Submission Type
                            </span>
                            {isCelo && (
                              <span className="text-xs bg-teal-500/10 text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-500/25">
                                Celo bonus active
                              </span>
                            )}
                          </div>

                          {isVerified ? (
                            // VERIFIED USER: Primary Verified Button + Subtle Basic Link
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={handleSubmitVerified}
                                className="relative w-full p-4 rounded-xl text-white shadow-lg transition-all active:scale-[0.98] group"
                                style={{
                                  background:
                                    'linear-gradient(115deg, #7aebd8 0%, #56d9c3 55%, #4cc9b0 100%)',
                                  color: 'var(--studio-ink)',
                                  border: '1px solid #9af3e2',
                                  boxShadow: '0 10px 28px rgba(86, 217, 195, 0.2)',
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-left">
                                    <div
                                      className="font-black text-lg sm:text-xl flex items-center gap-2"
                                      style={{ color: 'var(--studio-ink)' }}
                                    >
                                      <span>Verified Score</span>
                                      <span
                                        className="text-xs px-1.5 py-0.5 rounded"
                                        style={{ background: 'rgba(6, 16, 19, 0.14)' }}
                                      >
                                        +10%
                                      </span>
                                    </div>
                                    <div
                                      className="text-xs sm:text-sm font-medium opacity-80 mt-0.5"
                                      style={{ color: 'var(--studio-ink)' }}
                                    >
                                      Submit with verified human badge
                                    </div>
                                  </div>
                                  <div
                                    className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums"
                                    style={{ color: 'var(--studio-ink)' }}
                                  >
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
                                className="earned-cta-brass relative w-full p-4 transition-transform active:scale-[0.98] group overflow-hidden"
                              >
                                <div className="flex items-center justify-between relative z-10">
                                  <div className="text-left">
                                    <div className="font-bold text-lg sm:text-xl flex items-center gap-2">
                                      <span>Verify & Submit</span>
                                      <span
                                        className="text-xs px-2 py-0.5 rounded"
                                        style={{
                                          background: 'rgba(6, 16, 19, 0.2)',
                                          color: 'var(--studio-ink)',
                                        }}
                                      >
                                        Bonus
                                      </span>
                                    </div>
                                    <div className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">
                                      Get +{bonusPoints} points boost
                                    </div>
                                  </div>
                                  <div className="text-3xl sm:text-4xl font-black tracking-tighter tabular-nums">
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
                        {progress.currentLevel >= ONCHAIN_UNLOCK_LEVEL ? (
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
                                        console.log(
                                          '✅ Local workout marked as synced:',
                                          workout.id
                                        );
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
                              <Lock size={16} className="text-gray-500" aria-hidden="true" />
                              <span className="text-sm font-bold uppercase tracking-widest">
                                On-chain Sync Locked
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              Reach{' '}
                              <span className="text-primary font-bold">
                                Level {ONCHAIN_UNLOCK_LEVEL}
                              </span>{' '}
                              to sync your workouts to the blockchain.
                            </p>
                            <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gray-600"
                                style={{
                                  width: `${(progress.currentLevel / ONCHAIN_UNLOCK_LEVEL) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Guest in an on-chain mode: passive "saved locally · connect to
                 sync" indicator — no wallet wall, just a quiet upgrade path. */}
              {!effectiveAddress && ONCHAIN_MODES.includes(mode) && (
                <div className="studio-card studio-card__body text-center space-y-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-gray-500 font-bold">
                    <Save size={12} aria-hidden="true" /> Saved locally
                  </span>
                  {!isPB && (
                    <>
                      <p className="text-xs text-gray-400">
                        Connect a wallet to sync to the on-chain leaderboard
                        {progress.currentLevel < ONCHAIN_UNLOCK_LEVEL
                          ? ` (on-chain unlocks at Level ${ONCHAIN_UNLOCK_LEVEL})`
                          : ''}
                        .
                      </p>
                      <UniversalConnectButton size="sm" />
                    </>
                  )}
                </div>
              )}

              {/* Non-on-chain mode: quiet local-saved note (no wallet wall) */}
              {!ONCHAIN_MODES.includes(mode) && (
                <div className="studio-card studio-card__body text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-gray-500 font-bold">
                    <Save size={12} aria-hidden="true" /> Saved locally — on-chain leaderboards
                    coming for this exercise
                  </span>
                </div>
              )}

              {/* ===== RECOVER ===== */}
              {repCount > 0 && <RecoveryCard mode={mode} />}

              {/* Progress spark — earned depth, not a gate */}
              {repCount > 0 && progressSeries && (
                <ProgressSpark
                  points={progressSeries.points}
                  register="arcade"
                  title={
                    arcade
                      ? 'Score history'
                      : sessionRegister === 'studio'
                        ? 'Form signal'
                        : 'Recent progress'
                  }
                  animate={!isPB}
                  className="summary-progress-spark"
                />
              )}

              {/* ===== SHARE: one quiet disclosure, not six competing CTAs =====
                  Farcaster/X/highlight all live behind a single collapsed
                  entry; the recap's job is the one fix, not the bazaar. */}
              {repCount > 0 && (
                <details className="rounded-xl border border-white/10 bg-white/[0.02]">
                  <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-200 transition-colors [&::-webkit-details-marker]:hidden">
                    <span>Share this session</span>
                    <span aria-hidden="true" className="transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <div className="px-4 pb-4 space-y-3">
                    {highlightCardUrl && (
                      <div className="space-y-2">
                        <p className="studio-card__section-title text-center inline-flex items-center gap-1.5">
                          <Sparkles size={13} aria-hidden="true" /> AI Highlight Card
                        </p>
                        <div className="studio-card overflow-hidden aspect-[9/16] max-h-[400px] mx-auto relative">
                          <img
                            src={highlightCardUrl}
                            alt="Workout Highlight"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const text = `Check out my ${repCount} ${mode} on Imperfect Form!`;
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
                          className="w-full py-2 rounded-full bg-white text-black font-bold text-xs shadow-lg transition-transform active:scale-[0.98]"
                        >
                          Share Highlight
                        </button>
                      </div>
                    )}
                    {/* Farcaster is a quiet compose link, not a sign-in wall. */}
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
                        className="w-full text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200/55 hover:text-teal-100/90 transition-colors"
                        aria-label="Share on X (Twitter)"
                        onClick={() => {
                          const text = `${repCount} ${mode} on Imperfect Form`;
                          const url = `https://imperfectform.fun`;
                          window.open(
                            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                            '_blank'
                          );
                        }}
                      >
                        Share on X
                      </button>
                    )}
                  </div>
                </details>
              )}

              {/* Pin app — Farcaster only */}
              {isInMiniApp && repCount > 0 && (
                <div className="studio-card studio-card__body text-center">
                  <p
                    className="text-xs font-medium inline-flex items-center gap-1.5"
                    style={{ color: 'var(--studio-teal-bright)' }}
                  >
                    <Pin size={12} aria-hidden="true" /> Pin app
                  </p>
                  <AddMiniAppButton
                    variant="secondary"
                    showAfterWorkout={true}
                    className="w-full"
                  />
                </div>
              )}
            </>
          )}

          {/* Success state — replaces the flow after on-chain submit */}
          {submissionStatus === 'success' && (
            <div className="studio-card studio-card__body text-center animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-center gap-2 text-teal-300 text-xl font-semibold tracking-tight">
                <CheckCircle2 size={18} aria-hidden="true" /> Synced to leaderboard
              </div>
              <div className="text-xs text-teal-300/60 uppercase font-semibold tracking-widest">
                On-chain record stored
              </div>
            </div>
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
              <div className="bg-green-900/20 border border-green-700/30 rounded p-2 text-center text-xs text-green-300 inline-flex items-center justify-center gap-1.5">
                <CheckCircle2 size={12} aria-hidden="true" /> On{' '}
                {networkType.charAt(0).toUpperCase() + networkType.slice(1)}
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
              {onViewLeaderboard && (
                <button
                  onClick={onViewLeaderboard}
                  className="earned-cta-studio w-full px-3 py-2 text-sm flex items-center justify-center gap-2 active:scale-[0.96] transition-transform"
                >
                  <Trophy size={13} aria-hidden="true" /> Leaderboard
                </button>
              )}
            </div>
          )}

          {/* Self Verification Modal - mounted regardless of wallet/verify branch */}
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

      {/* Achievement Unlocked Overlay — sits ABOVE the modal content so the
          unlock is visible while the recap is open (zIndexClasses.overlayAchievement;
          previously z-[100] hid it behind the modal backdrop). */}
      {showAchievement && (
        <div
          className={`fixed inset-0 ${zIndexClasses.overlayAchievement} flex items-center justify-center pointer-events-none px-4 ${achievementClass}`}
        >
          <div className="flex flex-col gap-4 items-center">
            {newAchievements.map((achievement, index) => (
              <div
                key={achievement.id}
                className="bg-black/80 backdrop-blur-md border-2 border-primary rounded-2xl p-6 flex flex-col items-center gap-2 shadow-[0_0_30px_rgba(252,177,49,0.4)] max-w-sm animate-fade-in animate-slide-up"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <span className="text-5xl" style={{ color: 'var(--sandow-brass)' }}>
                  <AchievementIcon icon={achievement.icon} size={48} />
                </span>
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

'use client';

import React, { useState, useEffect } from 'react';
import {
  CameraIcon,
  SpinnerIcon,
  CrosshairIcon,
  CheckmarkIcon,
  ProgressRing,
} from './LoadingIcons';

// Skeleton Loader Components for data loading states
export function SkeletonLoader({
  type = 'text',
  count = 1,
  className = '',
}: {
  type?: 'text' | 'card' | 'table' | 'profile';
  count?: number;
  className?: string;
}) {
  const skeletonClasses = 'animate-pulse bg-gray-800 rounded';

  switch (type) {
    case 'card':
      return (
        <div className={`space-y-4 ${className}`}>
          {Array(count)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className={`h-4 ${skeletonClasses} mb-2 w-3/4`} />
                <div className={`h-3 ${skeletonClasses} mb-1 w-full`} />
                <div className={`h-3 ${skeletonClasses} w-2/3`} />
              </div>
            ))}
        </div>
      );

    case 'table':
      return (
        <div className={`space-y-2 ${className}`}>
          {Array(count)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-gray-700"
              >
                <div className={`h-4 ${skeletonClasses} w-1/4`} />
                <div className={`h-4 ${skeletonClasses} w-1/3`} />
                <div className={`h-4 ${skeletonClasses} w-1/4`} />
              </div>
            ))}
        </div>
      );

    case 'profile':
      return (
        <div className={`flex items-center space-x-3 ${className}`}>
          <div className={`w-12 h-12 rounded-full ${skeletonClasses}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 ${skeletonClasses} w-3/4`} />
            <div className={`h-3 ${skeletonClasses} w-1/2`} />
          </div>
        </div>
      );

    case 'text':
    default:
      return (
        <div className={`space-y-2 ${className}`}>
          {Array(count)
            .fill(0)
            .map((_, i) => (
              <div key={i} className={`h-4 ${skeletonClasses}`} />
            ))}
        </div>
      );
  }
}

export type LoadingPhase = 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';

interface UnifiedLoaderProps {
  phase: LoadingPhase;
  progress?: number; // 0-100 for AI loading phase
  isVisible: boolean;
  isOverlay?: boolean; // true = overlay on camera feed, false = full screen
  onComplete?: () => void;
  className?: string;
  title?: string;
  subtitle?: string;
}

// Enhanced UnifiedLoader with skeleton loading support
export function DataLoader({
  isLoading,
  type = 'leaderboard',
  count = 5,
  className = '',
}: {
  isLoading: boolean;
  type?: 'leaderboard' | 'profile' | 'table';
  count?: number;
  className?: string;
}) {
  if (!isLoading) return null;

  return (
    <div className={`space-y-4 ${className}`}>
      {type === 'leaderboard' && (
        <div className="space-y-3">
          {Array(count)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-900 border border-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-800 rounded animate-pulse w-24" />
                    <div className="h-2 bg-gray-800 rounded animate-pulse w-16" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-3 bg-gray-800 rounded animate-pulse w-12" />
                  <div className="h-2 bg-gray-800 rounded animate-pulse w-8" />
                </div>
              </div>
            ))}
        </div>
      )}

      {type === 'profile' && (
        <div className="space-y-4">
          {Array(count)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gray-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-800 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-800 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
        </div>
      )}

      {type === 'table' && (
        <div className="space-y-2">
          {Array(count)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-gray-700"
              >
                <div className="h-4 bg-gray-800 rounded animate-pulse w-1/4" />
                <div className="h-4 bg-gray-800 rounded animate-pulse w-1/3" />
                <div className="h-4 bg-gray-800 rounded animate-pulse w-1/4" />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * CONSOLIDATION: Single unified loading component replacing LoadingScreen + PoseLoadingOverlay + PoseDetectionGuidance
 * ENHANCEMENT FIRST: Premium design with glassmorphism, sophisticated motion, and user guidance
 * DRY: Single source of truth for all loading states
 * MODULAR: Independent, composable, testable
 */

const PHASE_CONFIG: Record<
  LoadingPhase,
  {
    title: string;
    subtitle: string;
    guidance: string;
    color: string;
    bgGradient: string;
    borderColor: string;
    icon: React.ReactNode;
    estimatedTime?: string;
  }
> = {
  initial: {
    title: 'Opening the coaching bay…',
    subtitle: 'Video is processed on this device · not uploaded',
    guidance: 'Allow camera access when prompted, then show us one rep.',
    color: 'studio-loader__phase-color studio-loader__phase-color--initial',
    bgGradient: 'studio-loader__surface--initial',
    borderColor: 'studio-loader__border--initial',
    icon: <CameraIcon className="w-14 h-14 sm:w-16 sm:h-16" />,
    estimatedTime: '< 5 seconds',
  },
  camera: {
    title: 'Finding your frame…',
    subtitle: 'Video is processed on this device · waking up the camera coach',
    guidance: 'Step back — head to toes visible.',
    color: 'studio-loader__phase-color studio-loader__phase-color--camera',
    bgGradient: 'studio-loader__surface--camera',
    borderColor: 'studio-loader__border--camera',
    icon: <SpinnerIcon className="studio-loader__spinner w-14 h-14 sm:w-16 sm:h-16" />,
    estimatedTime: '2-3 seconds',
  },
  ai: {
    title: 'Reading your movement…',
    subtitle: 'Motion is processed on this device · coaching your form',
    guidance: 'This first read can take a little longer.',
    color: 'studio-loader__phase-color studio-loader__phase-color--ai',
    bgGradient: 'studio-loader__surface--ai',
    borderColor: 'studio-loader__border--ai',
    icon: <SpinnerIcon className="studio-loader__spinner w-14 h-14 sm:w-16 sm:h-16" />,
    estimatedTime: '10-30 seconds',
  },
  positioning: {
    title: 'Looking for one useful signal…',
    subtitle: 'Finding your joints and movement line',
    guidance: 'Hold still for a moment, then show us one rep.',
    color: 'studio-loader__phase-color studio-loader__phase-color--positioning',
    bgGradient: 'studio-loader__surface--positioning',
    borderColor: 'studio-loader__border--positioning',
    icon: <CrosshairIcon className="w-14 h-14 sm:w-16 sm:h-16" />,
    estimatedTime: '2-5 seconds',
  },
  ready: {
    title: 'I see your movement.',
    subtitle: 'Coach is watching',
    guidance: 'Show me one rep.',
    color: 'studio-loader__phase-color studio-loader__phase-color--ready',
    bgGradient: 'studio-loader__surface--ready',
    borderColor: 'studio-loader__border--ready',
    icon: <CheckmarkIcon className="w-14 h-14 sm:w-16 sm:h-16" />,
    estimatedTime: '',
  },
};

// Session-boot step rail: one continuous sequence with three honest
// milestones, so the post-START wait reads as progress — not N random dialogs.
// The labels echo the loop vocabulary (Camera → Coach → your line) so the
// boot reads as the machine preparing for ONE REP / ONE FIX.
const BOOT_STEPS = ['Camera', 'Coach', 'Your line'] as const;
const ACTIVE_STEP: Record<LoadingPhase, number> = {
  initial: 0,
  camera: 0,
  ai: 1,
  positioning: 2,
  ready: 3,
};

// Placement education lives where the user can actually act on it: while the
// model warms up, not on a pre-screen they dismiss unread.
const BOOT_TIPS = [
  'Your video never leaves this device.',
  'Prop your phone / laptop so your whole body fits the frame.',
  'Good lighting helps the coach read your form.',
  'Stand back — head to toes visible — until the coach finds you.',
];
const TIP_ROTATE_MS = 4200;

export default function UnifiedLoader({
  phase,
  progress = 0,
  isVisible,
  isOverlay = false,
  onComplete,
  className = '',
  title,
  subtitle,
}: UnifiedLoaderProps) {
  const [shouldShow, setShouldShow] = useState(isVisible);
  const [_hasCompleted, setHasCompleted] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const config = PHASE_CONFIG[phase];

  // Rotate placement tips while the AI model warms (the one real wait).
  useEffect(() => {
    if (!isOverlay || !isVisible || phase !== 'ai') return;
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % BOOT_TIPS.length);
    }, TIP_ROTATE_MS);
    return () => clearInterval(timer);
  }, [isOverlay, isVisible, phase]);

  const displayTitle = title || config.title;
  const displaySubtitle = subtitle || config.subtitle;

  // Auto-complete when ready OR when initial phase (to trigger camera request)
  useEffect(() => {
    if (onComplete) {
      // Initial phase: brief display then proceed to trigger actual camera request
      if (phase === 'initial') {
        const timer = setTimeout(() => {
          setHasCompleted(true);
          onComplete();
        }, 800); // Brief delay to show the message
        return () => clearTimeout(timer);
      }
      // Ready phase: celebrate briefly then complete
      if (phase === 'ready') {
        const timer = setTimeout(() => {
          setHasCompleted(true);
          onComplete();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, onComplete]);

  // Handle visibility transitions
  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      setHasCompleted(false);
    } else {
      const timer = setTimeout(() => setShouldShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldShow) return null;

  // Overlay version (on top of camera feed)
  if (isOverlay) {
    return (
      <div
        className={`studio-loader studio-loader--overlay
          absolute inset-0 z-20 flex flex-col items-center justify-center
          transition-all duration-500 pointer-events-none
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          ${className}
        `}
        data-phase={phase}
      >
        {/* Animated Background Ring for 'Ready' state */}
        {phase === 'ready' && (
          <div className="studio-loader__ready-ring absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="studio-loader__ready-ring-outer" />
            <div className="studio-loader__ready-ring-inner absolute" />
          </div>
        )}

        {/* Icon with scaling/pulse animation */}
        <div
          className={`studio-loader__icon mb-6 p-4 rounded-full transition-all duration-700 ${
            phase === 'ready' ? 'studio-loader__icon--ready' : ''
          }`}
        >
          {config.icon}
        </div>

        {/* Status text - responsive and properly constrained */}
        <div
          className={`
            text-center space-y-3 px-6 max-w-[280px] sm:max-w-sm
            drop-shadow-lg transition-transform duration-500
            ${phase === 'ready' ? 'scale-110' : 'scale-100'}
          `}
        >
          <h3
            className={`
            font-bold leading-tight tracking-tight
            ${phase === 'ready' ? 'studio-loader__ready-title text-2xl' : config.color + ' text-lg'}
          `}
          >
            {phase === 'ready' ? 'I see your movement.' : config.title}
          </h3>
          <p
            className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed"
            aria-hidden="true"
          >
            {phase === 'ready' ? 'Show me one rep.' : config.subtitle || config.guidance}
          </p>
        </div>

        <span className="sr-only" role="status" aria-live="polite">
          {config.title}. {config.subtitle}.{' '}
          {phase === 'ai' && progress > 0 ? `${progress}% complete.` : ''}
        </span>

        {/* Step rail — one boot sequence, three milestones */}
        <div className="studio-loader__step-rail mt-6 flex items-center gap-3" aria-hidden="true">
          {BOOT_STEPS.map((step, i) => {
            const activeStep = ACTIVE_STEP[phase];
            const done = phase === 'ready' || i < activeStep;
            const active = !done && i === activeStep;
            return (
              <div key={step} className="flex items-center gap-1.5">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-black transition-colors duration-300 ${
                    done
                      ? 'studio-loader__step studio-loader__step--done'
                      : active
                        ? 'studio-loader__step studio-loader__step--active animate-pulse'
                        : 'studio-loader__step studio-loader__step--upcoming'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                    done
                      ? 'studio-loader__step-label--done'
                      : active
                        ? 'studio-loader__step-label--active'
                        : 'studio-loader__step-label--upcoming'
                  }`}
                >
                  {step}
                </span>
                {i < BOOT_STEPS.length - 1 && <span className="h-px w-4 bg-white/15" />}
              </div>
            );
          })}
        </div>

        {/* Progress indicators */}
        {phase === 'ai' && progress > 0 && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="studio-loader__progress-ring">
              <ProgressRing progress={progress} size={64} strokeWidth={3} />
            </div>
            <div className="text-center">
              <p className="studio-loader__progress-label text-xs font-bold uppercase tracking-widest opacity-60">
                Reading your movement
              </p>
              <p className="studio-loader__progress-value text-sm font-black mt-1">{progress}%</p>
              <p
                key={tipIndex}
                className="studio-loader__tip mt-2 max-w-[260px] text-xs leading-snug"
              >
                {BOOT_TIPS[tipIndex]}
              </p>
            </div>
          </div>
        )}

        {/* Loading dots for other non-ready phases */}
        {phase !== 'ai' && phase !== 'ready' && (
          <div className="studio-loader__dots mt-8 flex items-center gap-2">
            <div className="flex gap-1.5 p-2 rounded-full">
              <div
                className="studio-loader__dot w-2 h-2 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="studio-loader__dot w-2 h-2 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="studio-loader__dot w-2 h-2 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full-screen version (initialization screen)
  return (
    <div
      className={`studio-loader studio-loader--fullscreen
        fixed inset-0 z-50 flex flex-col items-center justify-center
        transition-all duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${className}
      `}
      data-phase={phase}
    >
      {/* Quiet calibration field — the stylesheet owns the atmosphere so the
          boot frame stays deterministic during capture and render. */}
      <div className="studio-loader__field absolute inset-0" aria-hidden="true" />

      <span className="sr-only" role="status" aria-live="polite">
        {config.title}. {phase === 'ai' && progress > 0 ? `${progress}% complete.` : ''}
      </span>

      {/* Premium calibration card */}
      <div
        className={`studio-loader__card relative z-10 text-center space-y-8 max-w-md w-full mx-auto px-6 sm:px-8 ${config.bgGradient} ${config.borderColor}`}
      >
        {/* Icon with entrance animation */}
        <div className="studio-loader__icon studio-loader__icon--enter flex justify-center transition-all duration-700 ease-out">
          <div className={config.color}>{config.icon}</div>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h2 className={`${config.color} text-2xl sm:text-3xl font-bold leading-tight`}>
            {displayTitle}
          </h2>
          <p className="studio-loader__subtitle text-sm sm:text-base leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        {/* Guidance text */}
        <p className="studio-loader__guidance text-xs sm:text-sm leading-relaxed px-2">
          {config.guidance}
        </p>

        {/* Progress indicators */}
        <div className="space-y-4">
          {phase === 'ai' && progress > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <div className="studio-loader__progress-ring">
                <ProgressRing progress={progress} size={72} strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-1">
                <p className="studio-loader__progress-label text-sm font-medium">
                  Reading your movement…
                </p>
                <p className="studio-loader__progress-value text-lg font-semibold">{progress}%</p>
              </div>
            </div>
          ) : phase !== 'ready' ? (
            <div className="studio-loader__dots flex justify-center">
              <div className="flex gap-1.5">
                <div
                  className="studio-loader__dot w-2 h-2 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="studio-loader__dot w-2 h-2 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="studio-loader__dot w-2 h-2 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          ) : (
            <div className="studio-loader__ready-copy text-lg font-semibold">Show me one rep.</div>
          )}
        </div>

        {/* Estimated time hint */}
        {config.estimatedTime && phase !== 'ready' && (
          <p className="studio-loader__estimate text-xs italic pt-2">{config.estimatedTime}</p>
        )}
      </div>
    </div>
  );
}

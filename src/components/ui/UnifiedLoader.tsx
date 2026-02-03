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
    title: 'Loading...',
    subtitle: 'Getting things ready',
    guidance: 'Please wait',
    color: 'text-blue-300',
    bgGradient: 'from-blue-950/40 via-blue-900/20 to-blue-950/40',
    borderColor: 'border-blue-400/30',
    icon: <CameraIcon className="w-14 h-14 sm:w-16 sm:h-16" />,
  },
  camera: {
    title: 'Loading AI Model',
    subtitle: 'Initializing pose detection',
    guidance: 'Position yourself in the frame, showing your full body',
    color: 'text-purple-300',
    bgGradient: 'from-purple-950/40 via-purple-900/20 to-purple-950/40',
    borderColor: 'border-purple-400/30',
    icon: <SpinnerIcon className="w-14 h-14 sm:w-16 sm:h-16 text-purple-400" />,
    estimatedTime: 'Usually 15-30 seconds on 4G',
  },
  ai: {
    title: 'Warming Up AI Engine',
    subtitle: 'Optimizing detection for your device',
    guidance: 'Preparing neural network for real-time biomechanics',
    color: 'text-purple-400',
    bgGradient: 'from-purple-950/60 via-indigo-950/40 to-purple-950/60',
    borderColor: 'border-purple-500/40',
    icon: (
      <SpinnerIcon className="w-14 h-14 sm:w-16 sm:h-16 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
    ),
    estimatedTime: 'Usually 15-30 seconds after first run',
  },
  positioning: {
    title: 'Detecting Your Position',
    subtitle: 'Full body visibility needed',
    guidance: 'Stand clear with your entire body visible from head to feet',
    color: 'text-yellow-300',
    bgGradient: 'from-yellow-950/40 via-yellow-900/20 to-yellow-950/40',
    borderColor: 'border-yellow-400/30',
    icon: <CrosshairIcon className="w-14 h-14 sm:w-16 sm:h-16" />,
  },
  ready: {
    title: "You're Ready!",
    subtitle: 'Pose detected',
    guidance: "Start your exercise whenever you're ready",
    color: 'text-green-300',
    bgGradient: 'from-green-950/40 via-green-900/20 to-green-950/40',
    borderColor: 'border-green-400/30',
    icon: <CheckmarkIcon className="w-14 h-14 sm:w-16 sm:h-16" />,
  },
};

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
  const [hasCompleted, setHasCompleted] = useState(false);
  const config = PHASE_CONFIG[phase];

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
        className={`
          absolute inset-0 z-20 flex flex-col items-center justify-center
          transition-all duration-500 pointer-events-none
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
          backdrop-blur-md
          ${className}
        `}
        style={{
          background:
            phase === 'ready'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))'
              : 'linear-gradient(135deg, rgba(88, 28, 135, 0.4), rgba(30, 27, 75, 0.4))',
        }}
      >
        {/* Animated Background Ring for 'Ready' state */}
        {phase === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div className="w-64 h-64 border-4 border-green-500/20 rounded-full animate-ping opacity-20" />
            <div className="absolute w-48 h-48 border-2 border-green-400/30 rounded-full animate-pulse opacity-30" />
          </div>
        )}

        {/* Icon with scaling/pulse animation */}
        <div
          className={`
            mb-6 p-4 rounded-full transition-all duration-700
            ${phase === 'ready' ? 'bg-green-500/20 shadow-lg shadow-green-500/30' : 'bg-white/5'}
          `}
          style={{
            animation: phase === 'ready' ? 'victory-bounce 1.5s infinite ease-in-out' : 'none',
          }}
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
            ${phase === 'ready' ? 'text-green-300 text-2xl' : config.color + ' text-lg'}
          `}
          >
            {phase === 'ready' ? 'READY!' : config.title}
          </h3>
          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            {phase === 'ready' ? config.guidance : config.subtitle || config.guidance}
          </p>
        </div>

        {/* Progress indicators */}
        {phase === 'ai' && progress > 0 && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
              <ProgressRing progress={progress} size={64} strokeWidth={3} />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-white uppercase tracking-widest opacity-60">
                Initializing
              </p>
              <p className="text-sm font-black text-purple-300 mt-1">{progress}%</p>
            </div>
          </div>
        )}

        {/* Loading dots for other non-ready phases */}
        {phase !== 'ai' && phase !== 'ready' && (
          <div className="mt-8 flex items-center gap-2">
            <div className="flex gap-1.5 p-2 bg-black/20 rounded-full backdrop-blur-sm">
              <div
                className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-2 h-2 rounded-full bg-pink-400 animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes victory-bounce {
            0%,
            100% {
              transform: translateY(0) scale(1.1);
            }
            50% {
              transform: translateY(-10px) scale(1.15);
            }
          }
        `}</style>
      </div>
    );
  }

  // Full-screen version (initialization screen)
  return (
    <div
      className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center
        transition-all duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${className}
      `}
      style={{
        background:
          'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 27, 75) 50%, rgb(15, 23, 42) 100%)',
      }}
    >
      {/* Animated background gradient */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at ${50 + 20 * Math.sin(Date.now() / 3000)}% ${50 + 20 * Math.cos(Date.now() / 4000)}%, rgba(139, 92, 246, 0.1), transparent)`,
        }}
      />

      {/* Premium glassmorphism card */}
      <div
        className={`
          relative z-10 text-center space-y-8 max-w-md w-full mx-auto px-6 sm:px-8
          backdrop-blur-xl rounded-2xl border
          ${config.bgGradient} ${config.borderColor}
          bg-gradient-to-br shadow-2xl
          py-10 sm:py-12
        `}
      >
        {/* Icon with entrance animation */}
        <div
          className="flex justify-center transition-all duration-700 ease-out"
          style={{
            animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div className={config.color}>{config.icon}</div>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h2 className={`${config.color} text-2xl sm:text-3xl font-bold leading-tight`}>
            {displayTitle}
          </h2>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">{displaySubtitle}</p>
        </div>

        {/* Guidance text */}
        <p className="text-gray-400 text-xs sm:text-sm leading-relaxed px-2">{config.guidance}</p>

        {/* Progress indicators */}
        <div className="space-y-4">
          {phase === 'ai' && progress > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <div className={config.color}>
                <ProgressRing progress={progress} size={72} strokeWidth={2.5} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-gray-300 text-sm font-medium">Loading...</p>
                <p className={`${config.color} text-lg font-semibold`}>{progress}%</p>
              </div>
            </div>
          ) : phase !== 'ready' ? (
            <div className="flex justify-center">
              <div className="flex gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${config.color} animate-bounce`}
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className={`w-2 h-2 rounded-full ${config.color} animate-bounce`}
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className={`w-2 h-2 rounded-full ${config.color} animate-bounce`}
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          ) : (
            <div className={`${config.color} text-lg font-semibold animate-pulse`}>
              Ready to start!
            </div>
          )}
        </div>

        {/* Estimated time hint */}
        {config.estimatedTime && phase !== 'ready' && (
          <p className="text-gray-500 text-xs italic pt-2">{config.estimatedTime}</p>
        )}
      </div>

      {/* CSS for entrance animation */}
      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

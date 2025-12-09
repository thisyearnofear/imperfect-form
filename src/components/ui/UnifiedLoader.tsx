'use client';

import React, { useState, useEffect } from 'react';

/**
 * CONSOLIDATION: Single unified loading component for all states
 * Replaces: LoadingScreen, PoseLoadingOverlay, MobileFastLoader
 * CLEAN: Clear separation - container vs overlay rendering
 * MODULAR: Reusable across web, mobile, Farcaster
 */

export type LoadingPhase = 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';

interface UnifiedLoaderProps {
  phase: LoadingPhase;
  progress?: number; // 0-100 for AI loading phase
  isVisible: boolean;
  isOverlay?: boolean; // true = overlay on camera feed, false = full screen
  onComplete?: () => void;
  className?: string;
}

const PHASE_CONFIG: Record<
  LoadingPhase,
  { icon: string; title: string; color: string; bgColor: string }
> = {
  initial: {
    icon: '📹',
    title: 'Starting Camera',
    color: 'text-gray-300',
    bgColor: 'bg-gray-900/90',
  },
  camera: {
    icon: '📹',
    title: 'Camera Ready',
    color: 'text-blue-300',
    bgColor: 'bg-blue-900/90',
  },
  ai: {
    icon: '🤖',
    title: 'Loading Pose Detection',
    color: 'text-purple-300',
    bgColor: 'bg-purple-900/90',
  },
  positioning: {
    icon: '🎯',
    title: 'Position in Frame',
    color: 'text-green-300',
    bgColor: 'bg-green-900/90',
  },
  ready: {
    icon: '✅',
    title: 'Ready to Start',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-900/90',
  },
};

// DRY: Single source of truth for status messages
const STATUS_MESSAGES: Record<LoadingPhase, string> = {
  initial: 'Initializing...',
  camera: 'Camera access granted',
  ai: 'Downloading model...',
  positioning: 'Detecting pose...',
  ready: 'All systems ready!',
};

const MOBILE_STATUS_MESSAGES: Record<LoadingPhase, string> = {
  initial: 'Starting...',
  camera: 'Camera OK',
  ai: 'Downloading...',
  positioning: 'Detecting...',
  ready: 'Ready!',
};

export default function UnifiedLoader({
  phase,
  progress = 0,
  isVisible,
  isOverlay = false,
  onComplete,
  className = '',
}: UnifiedLoaderProps) {
  const [shouldShow, setShouldShow] = useState(isVisible);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const config = PHASE_CONFIG[phase];
  const message = isMobile ? MOBILE_STATUS_MESSAGES[phase] : STATUS_MESSAGES[phase];

  // Auto-complete when ready
  useEffect(() => {
    if (phase === 'ready' && onComplete) {
      const timer = setTimeout(onComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  // Handle visibility transitions
  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
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
          absolute inset-0 z-10 flex flex-col items-center justify-center
          transition-all duration-300 pointer-events-none
          ${isVisible ? 'opacity-100' : 'opacity-0'}
          ${config.bgColor} ${className}
        `}
      >
        {/* Phase icon */}
        <div className="mb-4 text-4xl sm:text-5xl animate-pulse">{config.icon}</div>

        {/* Status text - single line, minimal */}
        <div className={`${config.color} text-sm sm:text-base font-semibold text-center px-2`}>
          {message}
        </div>

        {/* Progress bar for AI phase only */}
        {phase === 'ai' && progress > 0 && (
          <div className="mt-3 w-32 sm:w-48 bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${config.color.replace('text', 'bg')}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        {/* Progress percentage for AI phase */}
        {phase === 'ai' && progress > 0 && (
          <div className="mt-2 text-xs sm:text-sm text-gray-300">{progress}%</div>
        )}
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
        bg-gradient-to-br from-black via-gray-900 to-black
        ${className}
      `}
    >
      {/* Main content */}
      <div className="text-center space-y-6">
        {/* Icon with animation */}
        <div className="text-6xl sm:text-7xl animate-bounce">{config.icon}</div>

        {/* Title */}
        <h2 className={`text-xl sm:text-2xl font-bold ${config.color}`}>{config.title}</h2>

        {/* Status message */}
        <p className="text-sm sm:text-base text-gray-300">{message}</p>

        {/* Progress bar */}
        <div className="w-48 sm:w-64 bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all ease-out
              ${
                phase === 'ready'
                  ? 'duration-300 w-full bg-green-400'
                  : phase === 'ai'
                    ? `duration-500 ${config.color.replace('text', 'bg')}`
                    : 'duration-300 bg-gray-600'
              }
            `}
            style={{
              width:
                phase === 'ai' ? `${Math.min(progress, 100)}%` : phase === 'ready' ? '100%' : '50%',
            }}
          />
        </div>

        {/* Hint text for positioning phase */}
        {phase === 'positioning' && (
          <p className="text-xs text-gray-400 max-w-sm px-4">
            Position your full body in frame for best detection
          </p>
        )}
      </div>
    </div>
  );
}

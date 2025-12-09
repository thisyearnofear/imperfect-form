'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ProgressIndicator from './ProgressIndicator';
import MotivationalMessages from './MotivationalMessages';

export interface DetectionProgress {
  phase: 'initial' | 'tensorflow-init' | 'model-download' | 'warmup' | 'ready';
  message: string;
  percentage: number;
}

interface PoseLoadingOverlayProps {
  poseState: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  };
  isVisible: boolean;
  className?: string;
  detectionProgress?: DetectionProgress;
}

/**
 * Overlay component that shows loading messages on top of the video feed
 * while pose detection is initializing
 */
export default function PoseLoadingOverlay({
  poseState,
  isVisible,
  className = '',
  detectionProgress,
}: PoseLoadingOverlayProps) {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [instructionOpacity, setInstructionOpacity] = useState(1);
  const [currentPhase, setCurrentPhase] = useState<
    'initial' | 'camera' | 'ai' | 'positioning' | 'ready'
  >('initial');
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Enhanced loading instructions organized by phase
  const loadingInstructions = useMemo(
    () => ({
      initial: [
        '📹 Starting camera...',
        '💡 Position camera to show your full body',
        '☀️ Ensure good lighting - very important!',
      ],
      camera: [
        '📹 Camera ready! Setting up AI...',
        '🎯 Make sure your full body is visible',
        '💡 Good lighting makes a huge difference',
      ],
      ai: [
        '🤖 Loading AI pose detection...',
        '🧠 Initializing... May take 10-30 seconds',
        '👤 Stand with full body in frame',
        '💡 Ensure good lighting',
      ],
      positioning: [
        '🎯 Position yourself in frame',
        '👤 Stand where full body is visible',
        "💡 Adjust lighting if skeleton doesn't appear",
        '🔄 Try moving closer or further from camera',
      ],
      ready: ['✅ All systems ready!', '🏆 Time to get those reps in!', "🔥 Let's make it count!"],
    }),
    []
  );

  // Update phase based on pose detection state and progress
  useEffect(() => {
    if (!isVisible) return;

    if (detectionProgress) {
      // Use real progress from detection service
      setProgressPercentage(detectionProgress.percentage);

      if (detectionProgress.phase === 'tensorflow-init') {
        setCurrentPhase('ai');
      } else if (detectionProgress.phase === 'model-download') {
        setCurrentPhase('ai');
      } else if (detectionProgress.phase === 'warmup') {
        setCurrentPhase('ai');
      } else if (detectionProgress.phase === 'ready') {
        setCurrentPhase('ready');
      }
    } else {
      // Fallback to state-based phase detection
      if (!poseState.hasCamera) {
        setCurrentPhase('initial');
      } else if (poseState.hasCamera && !poseState.hasPoseDetection) {
        setCurrentPhase('camera');
        setTimeout(() => setCurrentPhase('ai'), 1000);
      } else if (poseState.hasPoseDetection && !poseState.poseDetected) {
        setCurrentPhase('positioning');
      } else if (poseState.poseDetected) {
        setCurrentPhase('ready');
      }
    }
  }, [poseState, isVisible, detectionProgress]);

  useEffect(() => {
    if (!isVisible) return;

    const currentInstructions = loadingInstructions[currentPhase] || loadingInstructions.initial;

    // Cycle through instructions for current phase
    const cycleInterval = setInterval(() => {
      setInstructionOpacity(0);

      setTimeout(() => {
        setCurrentInstructionIndex((prev) => (prev + 1) % currentInstructions.length);
        setInstructionOpacity(1);
      }, 500);
    }, 3000);

    // Reset instruction index when phase changes
    setCurrentInstructionIndex(0);

    return () => {
      clearInterval(cycleInterval);
    };
  }, [currentPhase, isVisible, loadingInstructions]);

  // Don't show if pose detection is ready
  if (!isVisible || poseState.poseDetected) {
    return null;
  }

  // Get phase-specific styling and content
  const getPhaseInfo = () => {
    switch (currentPhase) {
      case 'camera':
        return {
          color: 'text-blue-300',
          bgColor: 'bg-blue-900/90',
          icon: '📹',
        };
      case 'ai':
        return {
          color: 'text-purple-300',
          bgColor: 'bg-purple-900/90',
          icon: '🤖',
        };
      case 'positioning':
        return {
          color: 'text-green-300',
          bgColor: 'bg-green-900/90',
          icon: '🎯',
        };
      case 'ready':
        return {
          color: 'text-yellow-300',
          bgColor: 'bg-yellow-900/90',
          icon: '✅',
        };
      default:
        return {
          color: 'text-gray-300',
          bgColor: 'bg-gray-900/90',
          icon: '⚡',
        };
    }
  };

  const phaseInfo = getPhaseInfo();
  const currentInstructions = loadingInstructions[currentPhase] || loadingInstructions.initial;

  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center z-10 ${phaseInfo.bgColor} ${className} p-2 sm:p-4`}
    >
      {/* Progress indicator */}
      <ProgressIndicator phase={currentPhase} className="mb-4" />

      {/* Phase indicator - Mobile optimized */}
      <div className="mb-4 p-2 sm:p-3 rounded-lg bg-black/50 border border-opacity-30">
        <div className={`text-2xl sm:text-3xl ${phaseInfo.color} text-center`}>
          {phaseInfo.icon}
        </div>
      </div>

      {/* Phase title - Mobile optimized */}
      <div className="mb-4 px-2">
        <h2 className={`text-lg sm:text-xl font-bold ${phaseInfo.color} text-center`}>
          {currentPhase === 'initial' && 'Starting Camera...'}
          {currentPhase === 'camera' && 'Camera Ready!'}
          {currentPhase === 'ai' && 'Loading Pose Detection...'}
          {currentPhase === 'positioning' && 'Position in Frame...'}
          {currentPhase === 'ready' && 'Ready to Start!'}
        </h2>
      </div>

      {/* Progress bar for AI loading phase - Mobile optimized */}
      {currentPhase === 'ai' && (
        <div className="w-48 sm:w-64 bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className="bg-purple-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      )}

      {/* Real progress percentage - Mobile optimized */}
      {currentPhase === 'ai' && progressPercentage > 0 && (
        <div className="text-center text-sm sm:text-base text-gray-300 mb-2">
          {progressPercentage}%
        </div>
      )}

      {/* Current instruction - Mobile optimized */}
      <div
        className={`text-center max-w-xs transition-opacity duration-500 text-lg sm:text-xl font-semibold ${phaseInfo.color} mb-4 px-2`}
        style={{ opacity: instructionOpacity }}
      >
        {currentInstructions[currentInstructionIndex]}
      </div>

      {/* Motivational messages - Mobile optimized */}
      <MotivationalMessages phase={currentPhase} className="text-yellow-200 text-sm sm:text-base" />

      {/* Phase-specific additional info - Mobile optimized */}
      {currentPhase === 'positioning' && (
        <div className="mt-4 text-sm sm:text-base text-gray-300 text-center max-w-xs px-2">
          <p>💡 If skeleton doesn&apos;t appear, adjust lighting or distance from camera</p>
        </div>
      )}
    </div>
  );
}

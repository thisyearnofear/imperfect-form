"use client";

import React, { useState, useEffect, useMemo } from "react";
import ProgressIndicator from "./ProgressIndicator";
import MotivationalMessages from "./MotivationalMessages";

interface PoseLoadingOverlayProps {
  poseState: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  };
  isVisible: boolean;
  className?: string;
}

/**
 * Overlay component that shows loading messages on top of the video feed
 * while pose detection is initializing
 */
export default function PoseLoadingOverlay({ 
  poseState, 
  isVisible,
  className = ""
}: PoseLoadingOverlayProps) {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [instructionOpacity, setInstructionOpacity] = useState(1);
  const [currentPhase, setCurrentPhase] = useState<'initial' | 'camera' | 'ai' | 'positioning' | 'ready'>('initial');

  // Enhanced loading instructions organized by phase
  const loadingInstructions = useMemo(() => ({
    initial: [
      "📹 Starting camera...",
      "💡 Position camera to show your full body",
      "☀️ Ensure good lighting - very important!",
    ],
    camera: [
      "📹 Camera ready! Setting up AI...",
      "🎯 Make sure your full body is visible",
      "💡 Good lighting makes a huge difference",
    ],
    ai: [
      "🤖 Loading AI pose detection...",
      "🧠 Initializing neural networks...",
      "⚡ This may take 10-30 seconds...",
      "🏋️ PUSHUPS: Hands shoulder-width apart, back straight",
      "⬇️ PUSHUPS: Lower body to inch from ground, extend arms fully",
      "🦵 SQUATS: Stand with feet shoulder-width apart",
      "🧘 Perfect time to stretch while you wait!",
    ],
    positioning: [
      "🎯 AI loaded! Position yourself in frame",
      "👤 Stand where your full body is visible",
      "💡 Adjust lighting if skeleton isn't appearing",
      "🔄 Try moving closer or further from camera",
    ],
    ready: [
      "✅ All systems ready!",
      "🏆 Time to get those reps in!",
      "🔥 Let's make it count!",
    ],
  }), []);

  // Update phase based on pose detection state
  useEffect(() => {
    if (!isVisible) return;

    if (!poseState.hasCamera) {
      setCurrentPhase('initial');
    } else if (poseState.hasCamera && !poseState.hasPoseDetection) {
      setCurrentPhase('camera');
      // After camera is ready, move to AI loading phase
      setTimeout(() => setCurrentPhase('ai'), 1000);
    } else if (poseState.hasPoseDetection && !poseState.poseDetected) {
      setCurrentPhase('positioning');
    } else if (poseState.poseDetected) {
      setCurrentPhase('ready');
    }
  }, [poseState, isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const currentInstructions = loadingInstructions[currentPhase] || loadingInstructions.initial;
    
    // Cycle through instructions for current phase
    const cycleInterval = setInterval(() => {
      setInstructionOpacity(0);

      setTimeout(() => {
        setCurrentInstructionIndex(
          (prev) => (prev + 1) % currentInstructions.length
        );
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
        return { color: 'text-blue-400', bgColor: 'bg-blue-900/80', icon: '📹' };
      case 'ai':
        return { color: 'text-purple-400', bgColor: 'bg-purple-900/80', icon: '🤖' };
      case 'positioning':
        return { color: 'text-green-400', bgColor: 'bg-green-900/80', icon: '🎯' };
      case 'ready':
        return { color: 'text-yellow-400', bgColor: 'bg-yellow-900/80', icon: '✅' };
      default:
        return { color: 'text-gray-400', bgColor: 'bg-gray-900/80', icon: '⚡' };
    }
  };

  const phaseInfo = getPhaseInfo();
  const currentInstructions = loadingInstructions[currentPhase] || loadingInstructions.initial;

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center z-10 ${phaseInfo.bgColor} ${className}`}>
      {/* Progress indicator */}
      <ProgressIndicator phase={currentPhase} className="mb-4" />

      {/* Phase indicator */}
      <div className="mb-4 p-3 rounded-lg bg-black/50 border border-opacity-30">
        <div className={`text-3xl ${phaseInfo.color} text-center`}>
          {phaseInfo.icon}
        </div>
      </div>

      {/* Phase title */}
      <div className="mb-4">
        <h2 className={`text-xl font-bold ${phaseInfo.color} text-center`}>
          {currentPhase === 'initial' && 'Starting Camera...'}
          {currentPhase === 'camera' && 'Camera Ready!'}
          {currentPhase === 'ai' && 'Loading AI Pose Detection...'}
          {currentPhase === 'positioning' && 'Position Yourself in Frame...'}
          {currentPhase === 'ready' && 'Ready to Start!'}
        </h2>
      </div>

      {/* Progress bar for AI loading phase */}
      {currentPhase === 'ai' && (
        <div className="w-64 bg-gray-700 rounded-full h-2 mb-4">
          <div className="bg-purple-400 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
        </div>
      )}

      {/* Current instruction */}
      <div
        className={`text-center max-w-md transition-opacity duration-500 text-lg ${phaseInfo.color} mb-4`}
        style={{ opacity: instructionOpacity }}
      >
        {currentInstructions[currentInstructionIndex]}
      </div>

      {/* Motivational messages */}
      <MotivationalMessages phase={currentPhase} className="text-yellow-200" />

      {/* Phase-specific additional info */}
      {currentPhase === "ai" && (
        <div className="mt-4 text-sm text-gray-400 text-center max-w-sm">
          <p>⏱️ This usually takes 10-30 seconds depending on your device</p>
          <p className="mt-1">🎯 Faster on newer devices with good internet</p>
        </div>
      )}
      
      {currentPhase === "positioning" && (
        <div className="mt-4 text-sm text-gray-400 text-center max-w-sm">
          <p>
            💡 If skeleton doesn&apos;t appear, try adjusting lighting or moving
            closer/further
          </p>
          <p className="mt-1">🔄 Sometimes a small step back helps</p>
        </div>
      )}
    </div>
  );
}

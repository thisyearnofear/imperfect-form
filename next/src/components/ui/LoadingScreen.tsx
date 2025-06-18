"use client";

import React, { useState, useEffect, useMemo } from "react";
import ProgressIndicator from "./ProgressIndicator";
import MotivationalMessages from "./MotivationalMessages";

interface LoadingScreenProps {
  onComplete?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
  poseState?: {
    hasCamera: boolean;
    hasPoseDetection: boolean;
    poseDetected: boolean;
    isLoading: boolean;
  };
  isActive?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  autoHide = true,
  hideDelay = 3000,
  poseState,
  isActive = true,
}) => {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [instructionOpacity, setInstructionOpacity] = useState(1);
  const [currentPhase, setCurrentPhase] = useState<
    "initial" | "camera" | "ai" | "positioning" | "ready"
  >("initial");

  // Enhanced loading instructions organized by phase
  const loadingInstructions = useMemo(
    () => ({
      initial: [
        "📹 Setting up your camera...",
        "💡 Position camera to show your full body",
        "☀️ Ensure good lighting - very important!",
        "🌐 Works best on browsers with hardware acceleration",
        "📱 Mobile: use wallet browser for best experience",
      ],
      camera: [
        "📹 Camera access granted! Setting up...",
        "🎯 Make sure your full body is visible",
        "💡 Good lighting makes a huge difference",
        "📐 Stand about 6 feet from camera",
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
        "⚡ Maintain a steady pace throughout",
      ],
      ready: [
        "✅ All systems ready!",
        "🏆 Time to get those reps in!",
        "🔥 Let's make it count!",
      ],
    }),
    []
  );

  // Update phase based on pose detection state
  useEffect(() => {
    if (!isActive) return;

    // If no pose state provided, use timer-based progression
    if (!poseState) {
      const timer = setTimeout(() => {
        setCurrentPhase("ai");
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (!poseState.hasCamera) {
      setCurrentPhase("initial");
    } else if (poseState.hasCamera && !poseState.hasPoseDetection) {
      setCurrentPhase("camera");
      // After camera is ready, move to AI loading phase
      setTimeout(() => setCurrentPhase("ai"), 1000);
    } else if (poseState.hasPoseDetection && !poseState.poseDetected) {
      setCurrentPhase("positioning");
    } else if (poseState.poseDetected) {
      setCurrentPhase("ready");
      // Auto-complete when pose is detected
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1500);
    }
  }, [poseState, isActive, onComplete]);

  useEffect(() => {
    // Get current instructions based on phase
    const getCurrentInstructions = () => {
      return loadingInstructions[currentPhase] || loadingInstructions.initial;
    };

    const currentInstructions = getCurrentInstructions();

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

    // Auto-hide the loading screen after a delay if autoHide is true and no pose state tracking
    let hideTimeout: NodeJS.Timeout | null = null;
    if (autoHide && onComplete && !poseState) {
      hideTimeout = setTimeout(() => {
        onComplete();
      }, hideDelay);
    }

    return () => {
      clearInterval(cycleInterval);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [
    currentPhase,
    autoHide,
    hideDelay,
    onComplete,
    poseState,
    loadingInstructions,
  ]);

  // Get phase-specific styling and content
  const getPhaseInfo = () => {
    switch (currentPhase) {
      case "camera":
        return {
          color: "text-blue-400",
          bgColor: "bg-blue-900/20",
          icon: "📹",
        };
      case "ai":
        return {
          color: "text-purple-400",
          bgColor: "bg-purple-900/20",
          icon: "🤖",
        };
      case "positioning":
        return {
          color: "text-green-400",
          bgColor: "bg-green-900/20",
          icon: "🎯",
        };
      case "ready":
        return {
          color: "text-yellow-400",
          bgColor: "bg-yellow-900/20",
          icon: "✅",
        };
      default:
        return {
          color: "text-gray-400",
          bgColor: "bg-gray-900/20",
          icon: "⚡",
        };
    }
  };

  const phaseInfo = getPhaseInfo();
  const currentInstructions =
    loadingInstructions[currentPhase] || loadingInstructions.initial;

  return (
    <div className="loading-container flex flex-col items-center justify-center h-full">
      <div className="loading-text text-3xl font-bold mb-6 text-fcb131">
        Imperfect Form
      </div>

      {/* Progress indicator */}
      <ProgressIndicator phase={currentPhase} className="mb-6" />

      {/* Phase indicator */}
      <div
        className={`mb-4 p-3 rounded-lg ${phaseInfo.bgColor} border border-opacity-30`}
      >
        <div className={`text-2xl ${phaseInfo.color} text-center`}>
          {phaseInfo.icon}
        </div>
      </div>

      <div className="olympic-rings mb-8" aria-label="Olympic Rings">
        <div className="ring blue" />
        <div className="ring black" />
        <div className="ring red" />
        <div className="ring yellow" />
        <div className="ring green" />
      </div>

      <div className="typewriter-container mb-8">
        <div className="typewriter">
          <h2 className={phaseInfo.color}>
            {currentPhase === "initial" && "Loading..."}
            {currentPhase === "camera" && "Setting up camera..."}
            {currentPhase === "ai" && "Loading AI pose detection..."}
            {currentPhase === "positioning" && "Position yourself in frame..."}
            {currentPhase === "ready" && "Ready to start!"}
          </h2>
        </div>
      </div>

      {/* Progress bar for AI loading phase */}
      {currentPhase === "ai" && (
        <div className="w-64 bg-gray-700 rounded-full h-2 mb-4">
          <div
            className="bg-purple-400 h-2 rounded-full animate-pulse"
            style={{ width: "70%" }}
          ></div>
        </div>
      )}

      <div
        className={`loading-instruction text-center max-w-md transition-opacity duration-500 text-lg ${phaseInfo.color}`}
        style={{ opacity: instructionOpacity }}
      >
        {currentInstructions[currentInstructionIndex]}
      </div>

      {/* Motivational messages */}
      <MotivationalMessages
        phase={currentPhase}
        className="mt-6 text-yellow-200"
      />

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
};

export default LoadingScreen;

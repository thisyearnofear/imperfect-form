"use client";

import React, { useState, useEffect } from "react";

interface LoadingScreenProps {
  onComplete?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  autoHide = true,
  hideDelay = 3000,
}) => {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [instructionOpacity, setInstructionOpacity] = useState(1);

  const loadingInstructions = [
    "📹 Setting up your camera...",
    "🤖 Loading AI pose detection...",
    "💡 Position camera to show your full body",
    "☀️ Ensure good lighting - very important!",
    "🏋️ PUSHUPS: Hands shoulder-width apart, back straight",
    "⬇️ PUSHUPS: Lower body to inch from ground, extend arms fully",
    "🦵 SQUATS: Stand with feet shoulder-width apart",
    "⚡ Maintain a steady pace throughout",
    "🧘 Stretch while you wait?",
    "🔄 Any issues: RESET & START again",
    "🌐 Works best on Chrome with hardware acceleration",
    "📱 Mobile: use wallet browser for best experience",
  ];

  useEffect(() => {
    // Cycle through instructions
    const cycleInterval = setInterval(() => {
      setInstructionOpacity(0);

      setTimeout(() => {
        setCurrentInstructionIndex(
          (prev) => (prev + 1) % loadingInstructions.length
        );
        setInstructionOpacity(1);
      }, 500);
    }, 3000);

    // Auto-hide the loading screen after a delay if autoHide is true
    let hideTimeout: NodeJS.Timeout | null = null;
    if (autoHide && onComplete) {
      hideTimeout = setTimeout(() => {
        onComplete();
      }, hideDelay);
    }

    return () => {
      clearInterval(cycleInterval);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [autoHide, hideDelay, loadingInstructions.length, onComplete]);

  return (
    <div className="loading-container flex flex-col items-center justify-center h-full">
      <div className="loading-text text-3xl font-bold mb-6 text-fcb131">
        Imperfect Form
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
          <h2>Loading your workout experience...</h2>
        </div>
      </div>

      <div
        className="loading-instruction text-center max-w-md transition-opacity duration-500 text-lg"
        style={{ opacity: instructionOpacity }}
      >
        {loadingInstructions[currentInstructionIndex]}
      </div>
    </div>
  );
};

export default LoadingScreen;

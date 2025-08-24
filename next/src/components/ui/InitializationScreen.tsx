"use client";

import React, { useState, useEffect } from "react";

interface InitializationScreenProps {
  onComplete: () => void;
  platform?: string;
}

export default function InitializationScreen({
  onComplete,
}: Omit<InitializationScreenProps, "platform">) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [beautyText, setBeautyText] = useState("");

  const fullBeautyText = "Beauty is imperfection.";
  const typingSpeed = 80;

  // Use default theme colors during initialization (before theme context is available)
  const defaultAccentColor = "#fcb131"; // Default gold/yellow accent

  useEffect(() => {
    // Mark onboarding as seen and intro dialog as skipped during initialization
    // This prevents any tour or intro dialogs from showing after initialization
    if (typeof window !== "undefined") {
      localStorage.setItem("imf_seenOnboarding_v1", "1");
      localStorage.setItem("imf_skipWalletIntro", "1");
    }

    // Start showing welcome after brief initial delay
    const welcomeTimer = setTimeout(() => {
      setShowWelcome(true);
    }, 100);

    // Simulate background loading progress
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // Complete initialization after progress reaches 100%
          setTimeout(onComplete, 800);
          return 100;
        }
        return prev + Math.random() * 12; // Variable progress increments
      });
    }, 250);

    return () => {
      clearTimeout(welcomeTimer);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  // Beauty is imperfection typewriter effect
  useEffect(() => {
    if (!showWelcome) return;

    let currentIndex = 0;
    const typeText = () => {
      if (currentIndex < fullBeautyText.length) {
        setBeautyText(fullBeautyText.substring(0, currentIndex + 1));
        currentIndex++;
        setTimeout(typeText, typingSpeed);
      }
      // Removed feature display trigger - keeping it simple
    };

    const startTyping = setTimeout(typeText, 1200);

    return () => clearTimeout(startTyping);
  }, [showWelcome, fullBeautyText, typingSpeed]);

  if (!showWelcome) {
    // Brief initial loading state
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-yellow-400 font-bold animate-pulse">
            Initializing...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="imperfect-welcome-overlay">
      <div className="imperfect-welcome-content">
        <div className="welcome-animation">
          <h1 className="welcome-title">
            <span className="welcome-icon">📐</span>
            Welcome to
          </h1>
          <h2 className="app-title">Imperfect Form</h2>

          {/* Beauty is imperfection typewriter */}
          <div className="beauty-typewriter">
            <p className="beauty-text">
              {beautyText}
              <span className="cursor">|</span>
            </p>
          </div>

          {/* Loading progress bar */}
          <div className="loading-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(loadingProgress, 100)}%` }}
              />
            </div>
            <div className="progress-text">
              {loadingProgress < 100 ? "Loading..." : "Ready!"}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .imperfect-welcome-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(
            135deg,
            #0a0a0a 0%,
            #1a1a2e 50%,
            #16213e 100%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.5s ease-out;
        }

        .imperfect-welcome-content {
          text-align: center;
          color: #fff;
          max-width: 600px;
          padding: 2rem;
        }

        .welcome-animation {
          animation: slideUp 1s ease-out;
        }

        .welcome-title {
          font-family: "PressStart2P", monospace;
          font-size: clamp(1.2rem, 4vw, 2rem);
          margin-bottom: 1rem;
          color: ${defaultAccentColor};
          text-shadow: 0 0 20px ${defaultAccentColor}80;
          animation: glow 2s ease-in-out infinite alternate;
        }

        .welcome-icon {
          display: block;
          font-size: 3rem;
          margin-bottom: 1rem;
          animation: pulse 2s ease-in-out infinite;
        }

        .app-title {
          font-family: "PressStart2P", monospace;
          font-size: clamp(1rem, 3vw, 1.5rem);
          margin-bottom: 1rem;
          background: linear-gradient(45deg, #ffd700, #ffed4e, #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s ease-in-out infinite;
        }

        .beauty-typewriter {
          margin: 2rem 0;
          min-height: 3rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .beauty-text {
          font-family: "PressStart2P", monospace;
          font-size: clamp(0.9rem, 2.5vw, 1.2rem);
          color: #fff;
          text-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
          letter-spacing: 1px;
        }

        .cursor {
          animation: blink 1s infinite;
          color: ${defaultAccentColor};
        }

        .loading-progress {
          margin-top: 2rem;
          animation: fadeInUp 2.5s ease-out;
        }

        .progress-bar {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          margin: 0 auto 1rem;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${defaultAccentColor}, #ffed4e);
          border-radius: 2px;
          transition: width 0.3s ease;
          animation: shimmer 2s ease-in-out infinite;
        }

        .progress-text {
          font-size: 0.8rem;
          color: ${defaultAccentColor};
          opacity: 0.8;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes glow {
          from {
            text-shadow: 0 0 10px ${defaultAccentColor}60;
          }
          to {
            text-shadow: 0 0 30px ${defaultAccentColor}80,
              0 0 40px ${defaultAccentColor}40;
          }
        }

        @keyframes pulse {
          from {
            transform: scale(1);
          }
          to {
            transform: scale(1.1);
          }
        }

        @keyframes shimmer {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }

        @keyframes fadeInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .imperfect-welcome-content {
            padding: 1rem;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .welcome-animation,
          .welcome-icon,
          .progress-fill,
          .cursor {
            animation: none;
          }

          .welcome-title {
            animation: none;
            text-shadow: 0 0 10px ${defaultAccentColor}60;
          }
        }
      `}</style>
    </div>
  );
}

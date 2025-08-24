"use client";

import React, { useState, useEffect, useMemo } from "react";
import "@/styles/split-flap.css";

interface SplitFlapTextProps {
  text: string;
  isAnimating?: boolean;
  onAnimationComplete?: () => void;
  className?: string;
  delay?: number;
}

const SplitFlapText: React.FC<SplitFlapTextProps> = ({
  text,
  isAnimating = false,
  onAnimationComplete,
  className = "",
  delay = 0,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (text === displayText) {
      // No change needed
      return;
    }

    if (isAnimating) {
      setIsFlipping(true);

      const timer = setTimeout(() => {
        setDisplayText(text);
        setIsFlipping(false);
        onAnimationComplete?.();
      }, 300 + delay);

      return () => clearTimeout(timer);
    } else {
      setDisplayText(text);
      setIsFlipping(false);
      // No timer to clean up
    }
  }, [text, isAnimating, displayText, onAnimationComplete, delay]);

  return (
    <span
      className={`split-flap-text ${isFlipping ? "flipping" : ""} ${className}`}
    >
      {displayText}
    </span>
  );
};

type InstructionMode = "instructions" | "settings" | "profile";

interface InstructionItem {
  key: string;
  text: string;
  desc: string;
  hideKey?: boolean;
}

interface SplitFlapInstructionsProps {
  mode: InstructionMode;
  onModeChange: (mode: InstructionMode) => void;
  autoFs: boolean;
  setAutoFs: (value: boolean) => void;
  isFullscreenAvailable?: boolean;
  formattedStats?: {
    workouts: string;
    bestScore: string;
    streak: string;
    summary: string;
  } | null;
  isLoadingStats?: boolean;
}

export const SplitFlapInstructions: React.FC<SplitFlapInstructionsProps> = ({
  mode,
  onModeChange,
  autoFs,
  setAutoFs,
  isFullscreenAvailable = true,
  formattedStats,
  isLoadingStats,
}) => {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Configuration-driven instruction sets with optimized memoization
  const currentInstructions = useMemo(() => {
    const instructionConfigs: Record<InstructionMode, InstructionItem[]> = {
      instructions: [
        {
          key: "🏋️",
          text: "Real-time pose detection",
          desc: "AI-powered form analysis",
          hideKey: true,
        },
        {
          key: "🏆",
          text: "Onchain leaderboards",
          desc: "Transparent competition",
          hideKey: true,
        },
        {
          key: "🎯",
          text: "Pushups & Squats",
          desc: "Tracked challenges",
          hideKey: true,
        },
        {
          key: "⚡",
          text: "HAVE FUN!",
          desc: "Stay hard & build",
          hideKey: true,
        },
      ],
      settings: [
        {
          key: "a",
          text: "FULLSCREEN",
          desc: !isFullscreenAvailable
            ? "unavailable"
            : autoFs
            ? "enabled"
            : "disabled",
        },
        { key: "b", text: "ORIENTATION", desc: "auto-lock" },
        { key: "c", text: "THEME", desc: "retro" },
        { key: "d", text: "Back to profile!", desc: "" },
      ],
      profile: [
        {
          key: "a",
          text: "WORKOUTS",
          desc: isLoadingStats
            ? "Loading..."
            : formattedStats?.workouts || "No data yet",
          hideKey: true,
        },
        {
          key: "b",
          text: "BEST SCORE",
          desc: isLoadingStats
            ? "Loading..."
            : formattedStats?.bestScore || "No workouts",
          hideKey: true,
        },
        {
          key: "c",
          text: "STREAK",
          desc: isLoadingStats
            ? "Loading..."
            : formattedStats?.streak || "Start today!",
          hideKey: true,
        },
        {
          key: "d",
          text: isLoadingStats
            ? "Fetching stats..."
            : formattedStats?.summary || "Ready to start?",
          desc: "",
          hideKey: true,
        },
      ],
    };

    return instructionConfigs[mode];
  }, [mode, formattedStats, isLoadingStats, autoFs, isFullscreenAvailable]);

  useEffect(() => {
    // Trigger animation when mode changes
    setIsAnimating(true);
    setAnimationStep(0);

    // Stagger the animations
    const timers = currentInstructions.map((_, index) =>
      setTimeout(() => {
        setAnimationStep((prev) => prev + 1);
        if (index === currentInstructions.length - 1) {
          setTimeout(() => setIsAnimating(false), 100);
        }
      }, index * 150)
    );

    return () => timers.forEach(clearTimeout);
  }, [currentInstructions]);

  const handleItemClick = (key: string) => {
    switch (mode) {
      case "settings":
        if (key === "a" && isFullscreenAvailable) {
          // Only allow toggling if fullscreen is available
          setAutoFs(!autoFs);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "prefAutoFullscreen",
              (!autoFs).toString()
            );
          }
        } else if (key === "d") {
          onModeChange("profile"); // Back to profile (new default)
        }
        break;

      case "profile":
        if (key === "d") {
          // Refresh stats when clicking the summary line
          if (typeof window !== "undefined") {
            localStorage.removeItem("leaderboardCache");
            localStorage.removeItem("leaderboardCacheTimestamp");
            window.location.reload(); // Force refresh to reload data
          }
        }
        break;

      case "instructions":
        // Instructions are read-only, no click actions
        break;
    }
  };

  return (
    <div id="instructions" style={{ display: "flex" }}>
      {currentInstructions.map((instruction, index) => (
        <p
          key={instruction.key}
          className={`feature-instruction ${
            mode === "profile"
              ? "profile-instruction clickable"
              : mode === "settings"
              ? "settings-instruction clickable"
              : ""
          }`}
          onClick={() => handleItemClick(instruction.key)}
          style={{
            cursor:
              mode === "settings" &&
              (instruction.key === "a" || instruction.key === "d")
                ? "pointer"
                : "default",
            transition: "all 0.3s ease",
            animation:
              mode === "instructions"
                ? `slideInFeature 0.6s ease-out ${index * 0.2}s forwards`
                : "none",
            opacity: mode === "instructions" ? 0 : 1,
          }}
        >
          {!instruction.hideKey && `${instruction.key}) `}
          {instruction.hideKey && mode === "instructions" && (
            <span className="feature-emoji">{instruction.key}</span>
          )}
          <span
            className={`button-text ${
              instruction.key === "a"
                ? "start"
                : instruction.key === "b"
                ? "stop"
                : instruction.key === "c"
                ? "reset"
                : instruction.key === "⚡"
                ? "fun-highlight"
                : ""
            }`}
          >
            <SplitFlapText
              text={instruction.text}
              isAnimating={isAnimating && animationStep > index}
              delay={index * 50}
            />
          </span>
          {instruction.desc && (
            <>
              {" = "}
              <span
                className={`feature-desc ${
                  instruction.key === "🏋️"
                    ? "ai-highlight"
                    : instruction.key === "🏆"
                    ? "blockchain-highlight"
                    : instruction.key === "🎯"
                    ? "challenge-highlight"
                    : ""
                }`}
              >
                <SplitFlapText
                  text={instruction.desc}
                  isAnimating={isAnimating && animationStep > index}
                  delay={index * 50 + 100}
                />
              </span>
            </>
          )}
        </p>
      ))}

      {mode === "instructions" && (
        <p
          className="built-by feature-instruction"
          style={{
            animation: "slideInFeature 0.6s ease-out 1s forwards",
            opacity: 0,
          }}
        >
          Built by{" "}
          <a
            href="https://warpcast.com/papa"
            target="_blank"
            className="highlight"
          >
            <SplitFlapText
              text="PAPA"
              isAnimating={isAnimating && animationStep > 3}
              delay={400}
            />
          </a>
        </p>
      )}
    </div>
  );
};

export default SplitFlapText;

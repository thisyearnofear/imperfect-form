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
    if (isAnimating && text !== displayText) {
      setIsFlipping(true);

      const timer = setTimeout(() => {
        setDisplayText(text);
        setIsFlipping(false);
        onAnimationComplete?.();
      }, 300 + delay);

      return () => clearTimeout(timer);
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
  userStats?: {
    totalSessions: number;
    bestPushups: number;
    bestSquats: number;
    currentStreak: number;
    activeChains: string[];
  };
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
  userStats,
  formattedStats,
  isLoadingStats,
}) => {
  const [animationStep, setAnimationStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Configuration-driven instruction sets
  const instructionConfigs: Record<InstructionMode, InstructionItem[]> = {
    instructions: [
      { key: "a", text: "START", desc: "begin" },
      { key: "b", text: "STOP", desc: "end" },
      { key: "c", text: "RESET", desc: "restart" },
      { key: "d", text: "Have fun!", desc: "" },
    ],
    settings: [
      { key: "a", text: "FULLSCREEN", desc: autoFs ? "enabled" : "disabled" },
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

  const currentInstructions = useMemo(
    () => instructionConfigs[mode],
    [mode, autoFs, userStats, formattedStats, isLoadingStats]
  );

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
  }, [mode, currentInstructions.length]);

  const handleItemClick = (key: string) => {
    switch (mode) {
      case "settings":
        if (key === "a") {
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
          className={
            mode === "profile"
              ? "profile-instruction clickable"
              : mode === "settings"
              ? "settings-instruction clickable"
              : ""
          }
          onClick={() => handleItemClick(instruction.key)}
          style={{
            cursor:
              mode === "settings" &&
              (instruction.key === "a" || instruction.key === "d")
                ? "pointer"
                : "default",
            transition: "all 0.3s ease",
          }}
        >
          {!instruction.hideKey && `${instruction.key}) `}
          <span
            className={`button-text ${
              instruction.key === "a"
                ? "start"
                : instruction.key === "b"
                ? "stop"
                : instruction.key === "c"
                ? "reset"
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
              <SplitFlapText
                text={instruction.desc}
                isAnimating={isAnimating && animationStep > index}
                delay={index * 50 + 100}
              />
            </>
          )}
        </p>
      ))}

      {mode === "instructions" && (
        <p className="built-by">
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

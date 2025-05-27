"use client";

import React, { useState } from "react";
import { useMiniApp } from "@/contexts/MiniAppContext";
import { createRemoteLogger } from "@/utils/remoteLogger";

const logger = createRemoteLogger("AddMiniAppButton");

interface AddMiniAppButtonProps {
  className?: string;
  variant?: "primary" | "secondary" | "compact";
  showAfterWorkout?: boolean;
}

export function AddMiniAppButton({
  className = "",
  variant = "primary",
  showAfterWorkout = false,
}: AddMiniAppButtonProps) {
  const { isInMiniApp, addMiniApp, user } = useMiniApp();
  const [isAdding, setIsAdding] = useState(false);
  const [showPrompt, setShowPrompt] = useState(showAfterWorkout);

  const handleAddMiniApp = async () => {
    setIsAdding(true);

    try {
      const success = await addMiniApp();

      if (success) {
        logger.info("🎯 Add Mini App prompt shown successfully");
        // Hide the button after successful prompt
        setShowPrompt(false);
      } else {
        logger.warn("Failed to show Add Mini App prompt");
      }
    } catch (error) {
      logger.error("Error showing Add Mini App prompt", error);
    } finally {
      setIsAdding(false);
    }
  };

  // Don't show if not in Mini App or if prompt is hidden
  if (!isInMiniApp || !showPrompt) {
    return null;
  }

  const getButtonStyles = () => {
    const baseStyles =
      "flex items-center space-x-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    switch (variant) {
      case "primary":
        return `${baseStyles} bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg text-lg`;
      case "secondary":
        return `${baseStyles} bg-purple-900/30 border border-purple-500/50 hover:bg-purple-800/40 text-purple-200 px-4 py-2 rounded-lg`;
      case "compact":
        return `${baseStyles} bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm`;
      default:
        return baseStyles;
    }
  };

  const getContent = () => {
    if (isAdding) {
      return (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Adding...</span>
        </>
      );
    }

    switch (variant) {
      case "compact":
        return (
          <>
            <span>⭐</span>
            <span>Add</span>
          </>
        );
      default:
        return (
          <>
            <span className="text-xl">⭐</span>
            <span>Add to Farcaster</span>
          </>
        );
    }
  };

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* User context */}
      {user && variant === "primary" && (
        <div className="text-center text-sm text-purple-300">
          <span>GM @{user.username}</span>
        </div>
      )}

      {/* Add button */}
      <button
        onClick={handleAddMiniApp}
        disabled={isAdding}
        className={getButtonStyles()}
      >
        {getContent()}
      </button>

      {/* Description */}
      {variant === "primary" && (
        <div className="text-center text-xs text-gray-400 max-w-xs">
          Quick access + notifications
        </div>
      )}

      {/* Dismiss option */}
      {variant !== "compact" && (
        <button
          onClick={() => setShowPrompt(false)}
          className="text-xs text-gray-500 hover:text-gray-400 underline"
        >
          Maybe later
        </button>
      )}
    </div>
  );
}

// Hook to show add prompt after workout completion
export function useAddMiniAppPrompt() {
  const { isInMiniApp } = useMiniApp();
  const [shouldShow, setShouldShow] = useState(false);

  const showAfterWorkout = () => {
    if (isInMiniApp) {
      setShouldShow(true);
      logger.info("🎯 Triggering Add Mini App prompt after workout");
    }
  };

  const hidePrompt = () => {
    setShouldShow(false);
  };

  return {
    shouldShow,
    showAfterWorkout,
    hidePrompt,
  };
}

// Floating Add Mini App prompt for strategic placement
export function FloatingAddMiniAppPrompt({
  show,
  onDismiss,
}: {
  show: boolean;
  onDismiss: () => void;
}) {
  const { isInMiniApp } = useMiniApp();

  if (!isInMiniApp || !show) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-500/50 rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⭐</span>
            <span className="font-bold text-white">Love the workout?</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="text-sm text-purple-200 mb-3">
          Quick access + notifications
        </div>

        <AddMiniAppButton
          variant="secondary"
          showAfterWorkout={true}
          className="w-full"
        />
      </div>
    </div>
  );
}

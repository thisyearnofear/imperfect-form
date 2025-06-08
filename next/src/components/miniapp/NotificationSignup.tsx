"use client";

import React, { useState, useEffect } from "react";
import { usePlatform } from "@/contexts/PlatformContext";
import { AddMiniAppButton } from "./AddMiniAppButton";
import { createRemoteLogger } from "@/utils/remoteLogger";

const logger = createRemoteLogger("NotificationSignup");

interface NotificationSignupProps {
  className?: string;
  variant?: "card" | "inline" | "floating";
  trigger?: "workout_complete" | "manual" | "first_visit";
  onSignupComplete?: () => void;
}

export function NotificationSignup({
  className = "",
  variant = "card",
  trigger = "manual",
  onSignupComplete,
}: NotificationSignupProps) {
  const { platform, user } = usePlatform();
  const isInMiniApp = platform === "farcaster";
  const [showSignup, setShowSignup] = useState(false);

  // Check if we should show the signup based on trigger
  useEffect(() => {
    if (!isInMiniApp) return;

    const storageKey = `notification-signup-shown-${trigger}`;
    const hasShown = localStorage.getItem(storageKey) === "true";

    switch (trigger) {
      case "first_visit":
        if (!hasShown) {
          setTimeout(() => setShowSignup(true), 2000); // Show after 2 seconds
        }
        break;
      case "workout_complete":
        // This will be triggered externally
        break;
      case "manual":
        setShowSignup(true);
        break;
    }
  }, [isInMiniApp, trigger]);

  const handleSignupShown = () => {
    const storageKey = `notification-signup-shown-${trigger}`;
    localStorage.setItem(storageKey, "true");
    logger.info("🔔 Notification signup shown", {
      trigger,
      user: user?.username,
    });
  };

  const handleDismiss = () => {
    setShowSignup(false);
    handleSignupShown();
    onSignupComplete?.();
    logger.info("🔔 Notification signup dismissed", {
      trigger,
      user: user?.username,
    });
  };

  // Don't show if not in mini app or if already shown for this trigger
  if (!isInMiniApp || !showSignup) {
    return null;
  }

  const getContent = () => {
    switch (trigger) {
      case "workout_complete":
        return {
          title: "🎉 Great workout!",
          subtitle: "Stay motivated with workout reminders",
          description:
            "Get notified about new challenges, achievements, and daily motivation",
          buttonText: "Enable Notifications",
        };
      case "first_visit":
        return {
          title: "👋 Welcome to Imperfect Form!",
          subtitle: "Never miss a workout",
          description: "Get daily motivation and achievement notifications",
          buttonText: "Add to Farcaster",
        };
      default:
        return {
          title: "🔔 Stay Connected",
          subtitle: "Get workout notifications",
          description: "Receive daily motivation and achievement updates",
          buttonText: "Enable Notifications",
        };
    }
  };

  const content = getContent();

  if (variant === "floating") {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
        <div className="bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-500/50 rounded-lg p-4 shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="font-bold text-white text-sm mb-1">
                {content.title}
              </div>
              <div className="text-xs text-purple-200">
                {content.description}
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-white ml-2"
            >
              ✕
            </button>
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

  if (variant === "inline") {
    return (
      <div
        className={`flex items-center space-x-3 p-3 bg-purple-900/30 border border-purple-500/50 rounded-lg ${className}`}
      >
        <div className="flex-1">
          <div className="text-sm font-medium text-white">
            {content.subtitle}
          </div>
          <div className="text-xs text-purple-200">{content.description}</div>
        </div>
        <AddMiniAppButton variant="compact" showAfterWorkout={true} />
      </div>
    );
  }

  // Default card variant
  return (
    <div
      className={`bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-lg p-6 text-center ${className}`}
    >
      <div className="mb-4">
        <div className="text-xl font-bold text-white mb-2">{content.title}</div>
        <div className="text-lg text-purple-200 mb-3">{content.subtitle}</div>
        <div className="text-sm text-gray-300">{content.description}</div>
      </div>

      <div className="space-y-3">
        <AddMiniAppButton
          variant="primary"
          showAfterWorkout={true}
          className="w-full"
        />

        <button
          onClick={handleDismiss}
          className="text-xs text-gray-400 hover:text-gray-300 underline"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

// Hook to trigger notification signup after workout
export function useNotificationSignup() {
  const { platform } = usePlatform();
  const isInMiniApp = platform === "farcaster";
  const [shouldShowWorkoutSignup, setShouldShowWorkoutSignup] = useState(false);

  const triggerWorkoutSignup = () => {
    if (isInMiniApp) {
      setShouldShowWorkoutSignup(true);
      logger.info("🔔 Triggering workout completion notification signup");
    }
  };

  const hideWorkoutSignup = () => {
    setShouldShowWorkoutSignup(false);
  };

  return {
    shouldShowWorkoutSignup,
    triggerWorkoutSignup,
    hideWorkoutSignup,
  };
}

// Notification signup specifically for post-workout
export function PostWorkoutNotificationSignup({
  show,
  onComplete,
  onDismiss,
}: {
  show: boolean;
  onComplete?: () => void;
  onDismiss?: () => void;
}) {
  if (!show) return null;

  return (
    <NotificationSignup
      variant="floating"
      trigger="workout_complete"
      onSignupComplete={() => {
        onComplete?.();
        onDismiss?.();
      }}
      className="animate-slide-up"
    />
  );
}

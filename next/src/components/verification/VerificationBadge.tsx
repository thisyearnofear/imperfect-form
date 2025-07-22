"use client";

import React from "react";
// import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext'; // Unused import

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

/**
 * Badge component to show verification status
 * Used in leaderboards, user profiles, etc.
 */
const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  isVerified,
  size = "md",
  showText = false,
  className = "",
}) => {
  // const { currentTheme } = useEnhancedChainTheme(); // Removed unused

  if (!isVerified) {
    return null;
  }

  const sizeClasses = {
    sm: "w-4 h-4 text-xs",
    md: "w-5 h-5 text-sm",
    lg: "w-6 h-6 text-base",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={`verification-badge inline-flex items-center space-x-1 ${className}`}
    >
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center text-white font-bold shadow-lg`}
        title="Verified Human - Authenticated with Self Protocol"
      >
        ✓
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-medium text-green-400`}>
          Verified
        </span>
      )}
    </div>
  );
};

export default VerificationBadge;

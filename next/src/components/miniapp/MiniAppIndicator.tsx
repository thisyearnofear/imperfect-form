"use client";

import React from "react";
import Image from "next/image";
import { useMiniApp } from "@/contexts/MiniAppContext";

// Keeping interface for backward compatibility but not using it
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MiniAppIndicatorProps {
  className?: string;
  showFullFeatures?: boolean;
}

export function MiniAppIndicator() {
  // Always return null - users don't need to see "Farcaster Mini App" header
  // This component is kept for backward compatibility but hidden from users
  return null;
}

// Compact version for header/nav use
export function CompactMiniAppIndicator({
  className = "",
}: {
  className?: string;
}) {
  const { isInMiniApp, user } = useMiniApp();

  if (!isInMiniApp) {
    return null;
  }

  return (
    <div
      className={`flex items-center space-x-2 bg-purple-900/30 border border-purple-500/30 rounded-full px-3 py-1 ${className}`}
    >
      <span className="text-sm">🎭</span>
      {user && (
        <Image
          src={user.pfpUrl}
          alt={user.displayName}
          width={16}
          height={16}
          className="rounded-full"
        />
      )}
      <span className="text-xs text-purple-300 font-medium">Mini App</span>
    </div>
  );
}

// Banner version for subtle display - hidden as users don't need to see this
export function MiniAppBanner() {
  // Always return null - users don't need to see "Farcaster Mini App" banner
  return null;
}

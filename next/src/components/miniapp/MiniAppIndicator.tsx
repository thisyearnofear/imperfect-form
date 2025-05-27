"use client";

import React from "react";
import Image from "next/image";
import { useMiniApp } from "@/contexts/MiniAppContext";

interface MiniAppIndicatorProps {
  className?: string;
  showFullFeatures?: boolean;
}

export function MiniAppIndicator({
  className = "",
  showFullFeatures = false,
}: MiniAppIndicatorProps) {
  const {
    isInMiniApp,
    user,
    canSendNotifications,
    canAccessWallet,
    canShareContent,
    openInBrowser,
  } = useMiniApp();

  if (!isInMiniApp) {
    return null;
  }

  return (
    <div
      className={`bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-lg p-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🎭</span>
          <span className="text-sm font-bold text-purple-200">
            Farcaster Mini App
          </span>
        </div>

        {/* Open in browser button */}
        <button
          onClick={openInBrowser}
          className="text-xs bg-purple-700 hover:bg-purple-600 text-white px-2 py-1 rounded transition-colors"
        >
          Open Full App
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="flex items-center space-x-2 mb-2">
          <Image
            src={user.pfpUrl}
            alt={user.displayName}
            width={20}
            height={20}
            className="rounded-full"
          />
          <span className="text-xs text-purple-300">
            Welcome, @{user.username}!
          </span>
        </div>
      )}

      {/* Features indicator */}
      {showFullFeatures && (
        <div className="flex flex-wrap gap-1 text-xs">
          {canAccessWallet && (
            <span className="bg-green-800/50 text-green-300 px-2 py-1 rounded">
              🔗 Wallet Connected
            </span>
          )}
          {canShareContent && (
            <span className="bg-blue-800/50 text-blue-300 px-2 py-1 rounded">
              📤 Can Share
            </span>
          )}
          {canSendNotifications && (
            <span className="bg-yellow-800/50 text-yellow-300 px-2 py-1 rounded">
              🔔 Notifications
            </span>
          )}
        </div>
      )}

      {/* Mini description */}
      <div className="text-xs text-gray-400 mt-2">
        Enhanced experience in Farcaster
      </div>
    </div>
  );
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

// Banner version for prominent display
export function MiniAppBanner({ className = "" }: { className?: string }) {
  const { isInMiniApp, user, openInBrowser } = useMiniApp();

  if (!isInMiniApp) {
    return null;
  }

  return (
    <div
      className={`bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🎭</span>
          <div>
            <div className="font-bold text-lg">Running in Farcaster</div>
            {user && (
              <div className="text-sm opacity-90">
                Welcome, {user.displayName}!
              </div>
            )}
          </div>
        </div>

        <button
          onClick={openInBrowser}
          className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Open Full App
        </button>
      </div>

      <div className="mt-2 text-sm opacity-90">
        Enjoy enhanced features like seamless wallet connection and easy
        sharing!
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useUniversalWallet } from "@/components/providers";
import UniversalConnectButton from "@/components/wallet/UniversalConnectButton";
import { Game } from "@/components/game";
import { Spinner } from "@/components/ui";

/**
 * Simplified GameWrapper - No more complex network/wallet selection
 * Just connect and play! Works everywhere: desktop, mobile, Farcaster
 */
export default function GameWrapper() {
  const { isConnected, address, isReady, isInFarcaster, farcasterUser } =
    useUniversalWallet();

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner />
          <p className="text-yellow-400 font-bold animate-pulse">
            INITIALIZING IMPERFECT FORM...
          </p>
        </div>
      </div>
    );
  }

  // Connection required state
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-md mx-auto">
          {/* App Title */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 title-animation">
              IMPERFECT FORM
            </h1>
            <h2 className="text-lg md:text-xl text-yellow-200 subtitle-animation">
              ONCHAIN OLYMPIANS (in training)
            </h2>
          </div>

          {/* Context-aware welcome message */}
          <div className="space-y-4">
            {isInFarcaster && farcasterUser ? (
              <div className="p-4 bg-purple-900/50 border border-purple-500 rounded-lg">
                <p className="text-purple-200 text-sm">
                  GM {farcasterUser.displayName || farcasterUser.username}!
                  Ready to get your reps in onchain?
                </p>
              </div>
            ) : (
              <p className="text-gray-300 text-lg">Ready to rock ?</p>
            )}

            <div className="space-y-2 text-gray-400 text-sm">
              <p>🏋️ Real-time pose detection</p>
              <p>🏆 Onchain leaderboards</p>
              <p>🎯 Pushups & Squats challenges</p>
            </div>
          </div>

          {/* Universal Connect Button */}
          <div className="animate-fade-in">
            <UniversalConnectButton
              size="lg"
              className="w-full"
              showProfileWhenConnected={false}
              onConnected={(address) => {
                console.log(
                  "GameWrapper: User connected with address:",
                  address
                );
              }}
            />
          </div>

          {/* Footer */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Base • Polygon • Celo • Monad</p>
            <p>
              Built by{" "}
              <a
                href="https://warpcast.com/papa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                PAPA
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Connected state - render the game
  return (
    <div className="min-h-screen bg-black">
      {/* Farcaster Mini App indicator - moved from header */}
      {isInFarcaster && (
        <div className="p-2 text-center">
          <span className="text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded border border-purple-500">
            Farcaster Mini App
          </span>
        </div>
      )}

      {/* Game Component - pass address for scoring */}
      <main>
        <Game thirdwebAddress={address} />
      </main>
    </div>
  );
}

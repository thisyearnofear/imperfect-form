"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";
import MobileFastLoader from "@/components/ui/MobileFastLoader";

// Ultra-lazy loading for mobile - only load when absolutely needed
const GameWrapper = dynamic(() => import("@/components/game/GameWrapper"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Spinner />
      <span className="ml-2 text-yellow-400">Loading game...</span>
    </div>
  ),
});

// Don't load leaderboard immediately on mobile
const Leaderboard = dynamic(() => import("@/components/game/Leaderboard"), {
  ssr: false,
  loading: () => (
    <div className="text-center text-gray-400">Loading leaderboard...</div>
  ),
});

const ExpandedLeaderboardModal = dynamic(
  () => import("@/components/modals/ExpandedLeaderboardModal"),
  {
    ssr: false,
    loading: () => <Spinner />,
  }
);

import { Score } from "@/types";

export default function MobilePage() {
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameLoaded, setGameLoaded] = useState(false);

  const [leaderboardData, setLeaderboardData] = useState<{
    pushups: Score[];
    squats: Score[];
    displayNames: Record<string, string>;
  }>({
    pushups: [],
    squats: [],
    displayNames: {},
  });

  const handleViewMore = (
    pushups: Score[],
    squats: Score[],
    displayNames: Record<string, string>
  ) => {
    setLeaderboardData({ pushups, squats, displayNames });
    setShowExpandedLeaderboard(true);
  };

  // Progressive loading for mobile
  useEffect(() => {
    // Load game first
    const gameTimer = setTimeout(() => {
      setGameLoaded(true);
    }, 100);

    // Load leaderboard after game is ready
    const leaderboardTimer = setTimeout(() => {
      setShowLeaderboard(true);
    }, 2000);

    return () => {
      clearTimeout(gameTimer);
      clearTimeout(leaderboardTimer);
    };
  }, []);

  return (
    <MobileFastLoader>
      <div className="flex flex-col min-h-screen bg-black">
        {/* Game area - prioritized loading */}
        <div className="relative z-10 flex-grow px-2 pb-4">
          {gameLoaded ? (
            <GameWrapper />
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-yellow-400 text-sm">
                  Preparing your workout...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard - delayed loading to not block initial render */}
        {showLeaderboard && (
          <div className="px-4 pb-6">
            <div className="bg-black/80 p-3 rounded-lg border border-gray-800">
              <h3 className="text-center text-yellow-400 text-sm mb-2 font-bold">
                LEADERBOARD
              </h3>
              <div className="leaderboard-container">
                <Leaderboard limit={2} onViewMore={handleViewMore} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Leaderboard Modal */}
      <ExpandedLeaderboardModal
        pushupLeaderboard={leaderboardData.pushups}
        squatLeaderboard={leaderboardData.squats}
        displayNames={leaderboardData.displayNames}
        isOpen={showExpandedLeaderboard}
        onClose={() => setShowExpandedLeaderboard(false)}
      />
    </MobileFastLoader>
  );
}

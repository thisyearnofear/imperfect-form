"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";
const GameWrapper = dynamic(() => import("@/components/game/GameWrapper"), {
  ssr: false,
  loading: () => <Spinner />,
});
const Leaderboard = dynamic(() => import("@/components/game/Leaderboard"), {
  ssr: false,
  loading: () => <Spinner />,
});
const ExpandedLeaderboardModal = dynamic(
  () => import("@/components/modals/ExpandedLeaderboardModal"),
  {
    ssr: false,
    loading: () => <Spinner />,
  }
);

import { Score } from "@/types";

export default function Home() {
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);

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

  return (
    <>
      {/* Main content area with stacked layout for mobile */}
      <div className="flex flex-col min-h-screen">
        {/* Game area always on top */}
        <div className="relative z-10 flex-grow mb-24">
          <GameWrapper />
        </div>
        
        {/* Desktop: Positioned at the bottom of screen */}
        <div className="fixed bottom-0 left-0 right-0 z-0 max-h-[30vh] hidden md:block">
          <div className="bg-black/90 border-t border-gray-800 py-2">
            <h3 className="text-center text-yellow-400 text-sm mb-2">LEADERBOARD</h3>
            <div id="desktopLeaderboardContainer" className="leaderboard-container">
              <Leaderboard limit={2} onViewMore={handleViewMore} />
            </div>
          </div>
        </div>
        
        {/* Mobile: Leaderboard below game content */}
        <div className="md:hidden mt-20 px-4 animate-fade-in">
          <h3 className="text-center text-yellow-400 text-sm mb-2">LEADERBOARD</h3>
          <div id="mobileLeaderboardContainer" className="leaderboard-container">
            <Leaderboard limit={2} onViewMore={handleViewMore} />
          </div>
        </div>
      </div>

      {/* Expanded Leaderboard Modal */}
      <ExpandedLeaderboardModal
        pushupLeaderboard={leaderboardData.pushups}
        squatLeaderboard={leaderboardData.squats}
        displayNames={leaderboardData.displayNames}
        isOpen={showExpandedLeaderboard}
        onClose={() => setShowExpandedLeaderboard(false)}
      />
    </>
  );
}

"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Spinner from "@/components/Spinner";
const Game = dynamic(() => import("@/components/Game"), {
  ssr: false,
  loading: () => <Spinner />,
});
const Leaderboard = dynamic(() => import("@/components/Leaderboard"), {
  ssr: false,
  loading: () => <Spinner />,
});
const ExpandedLeaderboardModal = dynamic(
  () => import("@/components/ExpandedLeaderboardModal"),
  {
    ssr: false,
    loading: () => <Spinner />,
  }
);

export default function Home() {
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  // Import Score type from Leaderboard component
  type Score = {
    user: string;
    score: number;
    network: "polygon" | "base";
    displayName?: string;
  };

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
      <Game />
      <div id="leaderboardContainer" className="leaderboard-container">
        <Leaderboard limit={2} onViewMore={handleViewMore} />
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

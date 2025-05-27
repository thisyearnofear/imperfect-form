"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";
import { useWalletProvider } from "@/contexts/WalletProviderContext";

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
import { MiniAppBanner } from "@/components/miniapp/MiniAppIndicator";
import { useMiniApp } from "@/contexts/MiniAppContext";

export default function Home() {
  const { walletProvider } = useWalletProvider();
  const { isInMiniApp } = useMiniApp();
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

  // Track initial load to apply animations only after first render
  const [hasLoaded, setHasLoaded] = useState(false);
  // Track if component has mounted to prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Set hasLoaded after initial render to enable animations
    setHasLoaded(true);
    // Set hasMounted to prevent hydration mismatch
    setHasMounted(true);
  }, []);

  // Check if wallet has been selected (for mobile leaderboard visibility)
  // Only check after component has mounted to prevent hydration mismatch
  const hasWalletSelected = hasMounted && walletProvider !== null;

  return (
    <>
      {/* Mini App Banner - only show in Farcaster */}
      {isInMiniApp && (
        <div className="p-4">
          <MiniAppBanner />
        </div>
      )}

      {/* Main content area with optimized stacked layout for mobile */}
      <div className="flex flex-col min-h-screen">
        {/* Game area with better padding for mobile */}
        <div className="relative z-10 flex-grow pb-8 md:pb-24 px-2 md:px-4">
          <div
            className={`transition-opacity duration-300 ${
              hasLoaded ? "opacity-100" : "opacity-0"
            }`}
          >
            <GameWrapper />
          </div>
        </div>

        {/* Desktop: Positioned at the bottom of screen with better visibility */}
        <div className="fixed bottom-0 left-0 right-0 z-0 max-h-[30vh] hidden md:block">
          <div className="bg-black/90 border-t border-gray-800 py-2 backdrop-blur-sm">
            <h3 className="text-center text-yellow-400 text-sm mb-2 font-bold">
              LEADERBOARD
            </h3>
            <div
              id="desktopLeaderboardContainer"
              className="leaderboard-container px-4"
            >
              <Leaderboard limit={2} onViewMore={handleViewMore} />
            </div>
          </div>
        </div>

        {/* Mobile: Leaderboard - only show after wallet selection */}
        {hasWalletSelected && (
          <div className="md:hidden mt-12 px-4 animate-fade-in pb-10">
            <div className="bg-black/80 p-4 rounded-lg border border-gray-800">
              <h3 className="text-center text-yellow-400 text-sm mb-3 font-bold">
                LEADERBOARD
              </h3>
              <div
                id="mobileLeaderboardContainer"
                className="leaderboard-container"
              >
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
    </>
  );
}

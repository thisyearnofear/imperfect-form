"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui";
import { useUniversalWallet } from "@/components/providers/AppProviders";
import { useMiniApp } from "@/contexts/MiniAppContext";
import { NotificationSignup } from "@/components/miniapp/NotificationSignup";

const GameWrapper = dynamic(() => import("@/components/game/GameWrapper"), {
  ssr: false,
  loading: () => <Spinner />,
});

// Use existing leaderboard component
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

export default function Home() {
  const { isConnected, isReady } = useUniversalWallet();
  const { isInMiniApp, isLoading: miniAppLoading } = useMiniApp();
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);
  const [uiReady, setUiReady] = useState(false);

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

  // Prevent hydration mismatch
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Call Farcaster ready() when UI is loaded
  useEffect(() => {
    if (hasMounted && !miniAppLoading && (isReady || isInMiniApp)) {
      // UI is ready, call Farcaster ready() if in Mini App
      if (isInMiniApp) {
        // Call ready directly via SDK
        import("@farcaster/frame-sdk")
          .then(({ sdk }) => {
            if (sdk.actions?.ready) {
              sdk.actions
                .ready()
                .then(() => {
                  console.log("🎯 Farcaster ready() called successfully");
                  setUiReady(true);
                })
                .catch((err) => {
                  console.warn("Farcaster ready() failed:", err);
                  setUiReady(true); // Continue anyway
                });
            } else {
              setUiReady(true);
            }
          })
          .catch(() => {
            setUiReady(true); // Continue anyway
          });
      } else {
        setUiReady(true);
      }
    }
  }, [hasMounted, miniAppLoading, isReady, isInMiniApp]);

  // Show first-time Mini App prompt
  useEffect(() => {
    if (isInMiniApp && hasMounted && uiReady) {
      const hasSeenPrompt = localStorage.getItem("miniapp-first-visit-seen");
      if (!hasSeenPrompt) {
        // Show prompt after a short delay to let the app load
        setTimeout(() => {
          setShowFirstTimePrompt(true);
        }, 3000);
      }
    }
  }, [isInMiniApp, hasMounted, uiReady]);

  // Loading state - be more lenient for Mini Apps
  const shouldShowLoading =
    !hasMounted ||
    (miniAppLoading && isInMiniApp) ||
    (!isInMiniApp && !isReady);

  if (shouldShowLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner />
          <p className="text-yellow-400 font-bold animate-pulse">
            {isInMiniApp ? "LOADING MINI APP..." : "LOADING IMPERFECT FORM..."}
          </p>
        </div>
      </div>
    );
  }

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
          <div className="transition-opacity duration-300 opacity-100">
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

        {/* Mobile: Leaderboard - only show after wallet connection */}
        {isConnected && (
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

      {/* First-time Mini App user prompt */}
      {showFirstTimePrompt && (
        <NotificationSignup
          variant="floating"
          trigger="first_visit"
          onSignupComplete={() => {
            setShowFirstTimePrompt(false);
            localStorage.setItem("miniapp-first-visit-seen", "true");
          }}
        />
      )}
    </>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { NotificationSignup } from '@/components/miniapp/NotificationSignup';
import ChainAmbient from '@/components/theme/ChainAmbient';
import { callFarcasterReady } from '@/utils/farcasterMiniApp';

const GameWrapper = dynamic(() => import('@/components/game/GameWrapper'), {
  ssr: false,
  loading: () => <Spinner />,
});

// Use existing leaderboard component
const Leaderboard = dynamic(() => import('@/components/game/Leaderboard'), {
  ssr: false,
  loading: () => <Spinner />,
});

const ExpandedLeaderboardModal = dynamic(
  () => import('@/components/modals/ExpandedLeaderboardModal'),
  {
    ssr: false,
    loading: () => <Spinner />,
  }
);

import { Score } from '@/types';

export default function Home() {
  const { platform, user } = usePlatform();
  const isInMiniApp = platform === 'farcaster';
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);

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

  // Simplified initialization for Mini App
  useEffect(() => {
    if (hasMounted && isInMiniApp) {
      console.log('🎯 Mini App initialization');

      // Track app launch
      if (user?.fid) {
        fetch('/api/analytics/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: user.fid,
            eventType: 'app_launched',
            metadata: {
              platform: platform,
              isInMiniApp: isInMiniApp,
              userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
            },
          }),
        }).catch((err) => console.warn('Failed to track app launch:', err));
      }

      // Try calling ready() for Farcaster Mini App
      callFarcasterReady()
        .then(() => {
          console.log('🎯 Ready() completed successfully');
        })
        .catch(() => {
          console.log('🎯 Ready() failed or not needed, continuing anyway');
        });
    }
  }, [hasMounted, isInMiniApp, user?.fid, platform]);

  // Show first-time Mini App prompt
  useEffect(() => {
    if (isInMiniApp && hasMounted) {
      const hasSeenPrompt = localStorage.getItem('miniapp-first-visit-seen');
      if (!hasSeenPrompt) {
        // Show prompt after a short delay to let the app load
        setTimeout(() => {
          setShowFirstTimePrompt(true);
        }, 3000);
      }
    }
  }, [isInMiniApp, hasMounted]);

  // Simple loading state check
  if (!hasMounted) {
    return null; // Let ClientOnlyProviders handle the loading screen
  }

  return (
    <>
      {/* Chain-specific ambient background effects */}
      <ChainAmbient />

      {/* Mini App Banner - hidden as users don't need to see it */}

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
            <h3 className="text-center text-yellow-400 text-sm mb-2 font-bold">LEADERBOARD</h3>
            <div id="desktopLeaderboardContainer" className="leaderboard-container px-4">
              <Leaderboard limit={2} onViewMore={handleViewMore} />
            </div>
          </div>
        </div>

        {/* Mobile: Leaderboard - visible to all users (read-only if not connected) */}
        <div className="md:hidden mt-12 px-4 animate-fade-in pb-10">
          <div className="bg-black/80 p-4 rounded-lg border border-gray-800">
            <h3 className="text-center text-yellow-400 text-sm mb-3 font-bold">LEADERBOARD</h3>
            <div id="mobileLeaderboardContainer" className="leaderboard-container">
              <Leaderboard limit={2} onViewMore={handleViewMore} />
            </div>
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

      {/* First-time Mini App user prompt */}
      {showFirstTimePrompt && (
        <NotificationSignup
          variant="floating"
          trigger="first_visit"
          onSignupComplete={() => {
            setShowFirstTimePrompt(false);
            localStorage.setItem('miniapp-first-visit-seen', 'true');
          }}
        />
      )}
    </>
  );
}

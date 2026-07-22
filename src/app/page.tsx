'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { NotificationSignup } from '@/components/miniapp/NotificationSignup';
import ChainAmbient from '@/components/theme/ChainAmbient';
import ThemeSync from '@/components/theme/ThemeSync';
import StudioAtmosphere from '@/components/theme/StudioAtmosphere';
import CoachTwinPeek from '@/components/theme/CoachTwinPeek';
import { useCoachBayPulse } from '@/hooks/useCoachBayPulse';
import { callFarcasterReady } from '@/utils/farcasterMiniApp';
import {
  HeroSection,
  QuestDashboard,
  RoadmapSection,
  ChallengeWidget,
  AchievementShowcase,
} from '@/components/home';
import { useXpProgress } from '@/hooks/useXpProgress';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { UniversalConnectButton } from '@/components/wallet';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useOnboarding } from '@/contexts/OnboardingContext';

const GameWrapper = dynamic(() => import('@/components/game/GameWrapper'), {
  ssr: false,
  loading: () => <Spinner />,
});

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

type ActiveTab = 'workout' | 'dashboard' | 'roadmap' | 'challenges';

export default function Home() {
  const { platform, user } = usePlatform();
  const { progress } = useXpProgress();
  const isInMiniApp = platform === 'farcaster';
  const [hasMounted, setHasMounted] = useState(false);
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('workout');
  const [showDashboard, setShowDashboard] = useState(true);
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  const { hasSeen: hasSeenOnboarding, markSeen: markOnboardingSeen } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Game-loop chrome is earned after the first coached feel — not the day-0 foyer.
  const hasTrained = progress.totalXp > 0;

  // Surface first-visit onboarding after the bay entry ceremony
  useEffect(() => {
    if (hasMounted && !hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [hasMounted, hasSeenOnboarding]);

  // Form cue / demonstration → bay arc pulse (fail-silent when station unset)
  useCoachBayPulse();

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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Studio shell owns day-0 chrome; chain themes only after first coached feel.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-shell', hasTrained ? 'earned' : 'studio');
    if (!hasTrained) {
      document.body.style.removeProperty('background-color');
      document.body.style.removeProperty('color');
    }
    return () => {
      document.body.removeAttribute('data-shell');
    };
  }, [hasTrained]);

  useEffect(() => {
    if (hasMounted && isInMiniApp) {
      console.log('🎯 Mini App initialization');

      if (user?.fid) {
        fetch('/api/analytics/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fid: user.fid,
            eventType: 'app_launched',
            metadata: {
              platform,
              isInMiniApp,
              userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
            },
          }),
        }).catch((err) => console.warn('Failed to track app launch:', err));
      }

      callFarcasterReady()
        .then(() => console.log('🎯 Ready() completed successfully'))
        .catch(() => console.log('🎯 Ready() failed or not needed, continuing anyway'));
    }
  }, [hasMounted, isInMiniApp, user?.fid, platform]);

  useEffect(() => {
    if (isInMiniApp && hasMounted) {
      const hasSeenPrompt = localStorage.getItem('miniapp-first-visit-seen');
      if (!hasSeenPrompt) {
        setTimeout(() => setShowFirstTimePrompt(true), 3000);
      }
    }
  }, [isInMiniApp, hasMounted]);

  const day0Topbar = (
    <div className="studio-topbar sticky top-0 z-50">
      <div className="studio-topbar__inner px-5 py-3.5 flex items-center justify-between gap-3">
        <div>
          <p className="studio-wordmark">IMPERFECT FORM</p>
          <p className="studio-wordmark-sub">Private camera coaching</p>
        </div>
        <p className="studio-status">
          <span /> Ready when you are
        </p>
      </div>
    </div>
  );

  // Before mount: studio bay + topbar so we never flash a blank or arcade frame.
  if (!hasMounted) {
    return (
      <div className="relative flex flex-col min-h-screen">
        <StudioAtmosphere />
        <div className="relative z-10 flex flex-col min-h-screen">{day0Topbar}</div>
      </div>
    );
  }

  return (
    <>
      {/* Day-0: studio bay. After XP: chain ambient + theme sync are earned. */}
      {hasTrained ? (
        <>
          <ChainAmbient />
          <ThemeSync />
          {/* Twin peek + demo pulse fallback when the day-0 bay is unmounted */}
          <CoachTwinPeek showFallbackPulse />
        </>
      ) : (
        <StudioAtmosphere />
      )}

      <div
        className={`relative z-10 flex flex-col min-h-screen ${hasTrained ? 'bg-[#061013]' : 'bg-transparent'}`}
      >
        {/* Top Navigation — full chrome only after first trained session */}
        {hasTrained ? (
          <div className="studio-topbar sticky top-0 z-50">
            <div className="studio-topbar__inner px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="studio-level-mark">
                  <span>{progress.currentLevel}</span>
                </div>
                <div>
                  <div className="studio-meta">Level {progress.currentLevel}</div>
                  <div className="studio-xp">{progress.totalXp.toLocaleString()} XP</div>
                </div>
              </div>

              <div className="studio-tabs flex items-center gap-1 p-1">
                {[
                  { id: 'workout', label: 'Workout', icon: 'W' },
                  { id: 'dashboard', label: 'Dashboard', icon: 'S' },
                  { id: 'challenges', label: 'Challenges', icon: 'G' },
                  { id: 'roadmap', label: 'Roadmap', icon: 'R' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === tab.id ? 'is-active' : ''
                    }`}
                    aria-label={`Switch to ${tab.label} tab`}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <span className="font-mono text-[10px] opacity-70">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="hidden sm:block">
                <UniversalConnectButton size="sm" showProfileWhenConnected />
              </div>
            </div>
          </div>
        ) : (
          day0Topbar
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Workout Tab - Game Area */}
          {(activeTab === 'workout' || !hasTrained) && (
            <div className="flex-1 flex flex-col">
              <div className="relative z-10 flex-grow">
                <GameWrapper />
              </div>

              {hasTrained && (
                <>
                  <div className="md:hidden px-4 pb-20 pt-4 space-y-4">
                    <QuestDashboard />
                    <ChallengeWidget />
                    <AchievementShowcase />
                  </div>

                  <div className="hidden md:block fixed bottom-0 left-0 right-0 z-0">
                    <button
                      onClick={() => setShowDashboard(!showDashboard)}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-t-lg font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-yellow-400 transition-colors"
                    >
                      {showDashboard ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                      {showDashboard ? 'Hide Features' : 'Show Features'}
                    </button>
                    <div
                      className={`bg-black/95 backdrop-blur-md border-t border-gray-800 transition-all duration-300 ${
                        showDashboard
                          ? 'max-h-[40vh] opacity-100'
                          : 'max-h-0 opacity-0 overflow-hidden'
                      }`}
                    >
                      <div className="grid grid-cols-4 gap-4 p-4 overflow-y-auto max-h-[40vh]">
                        <div>
                          <QuestDashboard compact />
                        </div>
                        <div>
                          <AchievementShowcase compact />
                        </div>
                        <div>
                          <ChallengeWidget />
                        </div>
                        <div>
                          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity className="w-4 h-4 text-green-400" />
                              <span className="text-xs font-bold text-white uppercase tracking-wider">
                                Quick Actions
                              </span>
                            </div>
                            <div className="space-y-2">
                              <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
                                View Leaderboard
                              </button>
                              <button className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors">
                                Share Ghost
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {hasTrained && activeTab === 'dashboard' && (
            <ScreenTransition key="dashboard" mode="slide-up" className="flex-1 flex flex-col">
              <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto pb-24">
                <div className="max-w-2xl mx-auto space-y-6">
                  <HeroSection />
                  <QuestDashboard />
                  <AchievementShowcase />
                  <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                      Top Performers
                    </h3>
                    <Leaderboard limit={5} onViewMore={handleViewMore} />
                  </div>
                </div>
              </div>
            </ScreenTransition>
          )}

          {hasTrained && activeTab === 'challenges' && (
            <ScreenTransition key="challenges" mode="slide-up" className="flex-1 flex flex-col">
              <div className="flex-1 px-4 py-6 overflow-y-auto pb-24">
                <div className="max-w-2xl mx-auto">
                  <ChallengeWidget />
                </div>
              </div>
            </ScreenTransition>
          )}

          {hasTrained && activeTab === 'roadmap' && (
            <ScreenTransition key="roadmap" mode="slide-up" className="flex-1 flex flex-col">
              <div className="flex-1 px-4 py-6 overflow-y-auto pb-24">
                <div className="max-w-2xl mx-auto">
                  <RoadmapSection />
                </div>
              </div>
            </ScreenTransition>
          )}
        </div>

        {/* Mobile bottom tabs — only after first session */}
        {hasTrained && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-white/10">
            <div className="grid grid-cols-4 gap-1 p-2">
              {[
                { id: 'workout', label: 'Workout' },
                { id: 'dashboard', label: 'Stats' },
                { id: 'challenges', label: 'Ghost' },
                { id: 'roadmap', label: 'Progress' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex flex-col items-center py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'text-yellow-400 bg-yellow-500/10'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {tab.label}
                  </span>
                </button>
              ))}
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

      {/* First-visit onboarding */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            markOnboardingSeen();
            setShowOnboarding(false);
          }}
        />
      )}

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

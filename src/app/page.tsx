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
import { BRAND } from '@/lib/brandPositioning';
import { useCoachBayPulse } from '@/hooks/useCoachBayPulse';
import { useImmersive } from '@/hooks/useImmersive';
import { callFarcasterReady } from '@/utils/farcasterMiniApp';
import {
  HeroSection,
  QuestDashboard,
  RoadmapSection,
  ChallengeWidget,
  AchievementShowcase,
} from '@/components/home';
import {
  Dumbbell,
  BarChart3,
  Ghost,
  Map as MapIcon,
  Gamepad2,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useXpProgress } from '@/hooks/useXpProgress';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import { getHasTrained } from '@/lib/hasTrained';
import { UniversalConnectButton, WalletStatusPill } from '@/components/wallet';
import { ScreenTransition } from '@/components/ui/ScreenTransition';
import { CountUp } from '@/components/ui/CountUp';

// Branded shell while the game chunk loads — visually identical to the
// InitializationScreen first frame so the boot splash → foyer swap is a
// fade within one surface, not a flash to a different layout.
function GameLoadingShell() {
  const { immersive } = useImmersive();
  return (
    <div className="studio-boot">
      <div className="studio-boot__atmosphere" aria-hidden="true">
        <div className="studio-boot__glow" />
        <div className="studio-boot__bay-markings" />
      </div>
      <div className="studio-boot__content">
        <p className="studio-boot__brand">{BRAND.studio.brand}</p>
        <p className="studio-boot__line">{BRAND.studio.line1}</p>
        <p className="studio-boot__status">
          <span className="studio-boot__signal" aria-hidden="true" />
          {immersive ? 'Calibrating the gauge' : 'Preparing the bay'}
        </p>
      </div>
    </div>
  );
}

const GameWrapper = dynamic(() => import('@/components/game/GameWrapper'), {
  ssr: false,
  loading: () => <GameLoadingShell />,
});

/** Wraps GameWrapper so page.tsx knows when the game chunk has mounted
 *  and can stop covering StudioAtmosphere with the boot splash. */
function GameReadyGate({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return <GameWrapper />;
}

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
  const { intent: sessionIntent, setIntent } = useSessionIntent();
  const isInMiniApp = platform === 'farcaster';
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('workout');
  const [showExpandedLeaderboard, setShowExpandedLeaderboard] = useState(false);
  // Level-up pulse: when the level mark increases, replay the brass ring.
  const prevLevelRef = React.useRef(progress.currentLevel);
  const [levelPulse, setLevelPulse] = useState(0);

  // Gradual tab reveal: Workout + Stats + Roadmap always (the roadmap is the
  // motivational 'what unlocks next' surface — honest about locks); Ghost at L3.
  // Avoids the 0->100 chrome flip on the first earned session.
  const visibleTabs: {
    id: ActiveTab;
    label: string;
    minLevel: number;
    icon: LucideIcon;
  }[] = (
    [
      { id: 'workout', label: 'Workout', minLevel: 0, icon: Dumbbell },
      { id: 'dashboard', label: 'Stats', minLevel: 0, icon: BarChart3 },
      { id: 'roadmap', label: 'Roadmap', minLevel: 0, icon: MapIcon },
      { id: 'challenges', label: 'Ghost', minLevel: 3, icon: Ghost },
    ] as const
  ).filter((t) => progress.currentLevel >= t.minLevel);

  // Game-loop chrome is earned after the first coached feel — not the day-0 foyer.
  // The initial decision must be synchronous: the instant localStorage flag
  // avoids flashing the day-0 foyer to returning users while XP loads from
  // IndexedDB. Async XP stays the source of truth (XP never decreases).
  const [hasTrained, setHasTrained] = useState(getHasTrained);
  // Immersive mode (opt-in Sandow storytelling, default off). Gates the loud
  // heritage copy; default experience is quiet/implicit/motif-led.
  const { immersive } = useImmersive();
  // Day-0 only: cover StudioAtmosphere (robot photo) with the studio-boot
  // splash until GameWrapper mounts, so the arm photo never flashes through
  // during the dynamic-import gap. Lifted above the loading slot so it's
  // always present, not dependent on the chunk's loading fallback timing.
  const [gameReady, setGameReady] = useState(false);
  useEffect(() => {
    if (progress.totalXp > 0) setHasTrained(true);
  }, [progress.totalXp]);

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

  // Studio shell owns day-0 chrome; chain themes only after first coached feel.
  // Set on documentElement (matches the synchronous <head> script) AND body so
  // ChainThemeContext's debounced apply reliably sees 'studio' on first paint.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const shell = hasTrained ? 'earned' : 'studio';
    document.documentElement.setAttribute('data-shell', shell);
    document.body.setAttribute('data-shell', shell);
    if (!hasTrained) {
      document.body.style.removeProperty('background-color');
      document.body.style.removeProperty('color');
    }
    return () => {
      document.documentElement.removeAttribute('data-shell');
      document.body.removeAttribute('data-shell');
    };
  }, [hasTrained]);

  // Level-up pulse + gradual reveal guard: if the active tab is gated out by
  // level (e.g. the user was on Ghost but dropped below Level 3), fall back to
  // Workout so the content area is never empty. Roadmap is always visible.
  useEffect(() => {
    if (progress.currentLevel > prevLevelRef.current) {
      setLevelPulse(Date.now());
    }
    prevLevelRef.current = progress.currentLevel;
  }, [progress.currentLevel]);

  useEffect(() => {
    if (activeTab === 'challenges' && progress.currentLevel < 3) setActiveTab('workout');
  }, [activeTab, progress.currentLevel]);

  useEffect(() => {
    if (isInMiniApp) {
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

      callFarcasterReady().catch(() => {
        // Ready() failure is non-blocking; app continues without ceremony.
      });
    }
  }, [isInMiniApp, user?.fid, platform]);

  // Notification ask is earned: only after the first coached session, never
  // 3 seconds after arrival before any value has been delivered.
  useEffect(() => {
    if (!isInMiniApp || !hasTrained) return;
    if (localStorage.getItem('miniapp-first-visit-seen')) return;
    const timer = setTimeout(() => setShowFirstTimePrompt(true), 1500);
    return () => clearTimeout(timer);
  }, [isInMiniApp, hasTrained]);

  const day0Topbar = (
    <div className="studio-topbar sticky top-0 z-50">
      <div className="studio-topbar__inner px-5 py-3.5 flex items-center justify-between gap-3">
        {/* Day-0: foyer carries the brand; topbar is status-only to avoid a
            duplicate wordmark in the first viewport. */}
        <p className="studio-status">
          <span /> Ready when you are
        </p>
        <div className="flex items-center gap-3">
          <p className="studio-wordmark-sub hidden sm:block">Private camera coaching</p>
          <WalletStatusPill />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Day-0: studio bay. After XP: chain ambient + theme sync are earned. */}
      {hasTrained ? (
        <>
          <ChainAmbient />
          <ThemeSync />
          {/* Twin peek + demo pulse fallback when the day-0 bay is unmounted */}
          {activeTab !== 'workout' && <CoachTwinPeek showFallbackPulse />}
        </>
      ) : (
        <StudioAtmosphere />
      )}

      {/* Day-0 boot splash overlay: covers StudioAtmosphere (robot photo) until
          the GameWrapper chunk mounts, so the arm never flashes through during
          the dynamic-import gap. Lifted above the loading slot so it's always
          present, not dependent on chunk timing. */}
      {!hasTrained && !gameReady && (
        <div
          className="studio-boot"
          role="status"
          aria-live="polite"
          aria-label="Loading Imperfect Form"
          style={{ zIndex: 10000 }}
        >
          <div className="studio-boot__atmosphere" aria-hidden="true">
            <div className="studio-boot__glow" />
            <div className="studio-boot__bay-markings" />
          </div>
          <div className="studio-boot__content">
            <p className="studio-boot__brand">{BRAND.studio.brand}</p>
            <p className="studio-boot__line">{BRAND.studio.line1}</p>
            <p className="studio-boot__status">
              <span className="studio-boot__signal" aria-hidden="true" />
              {immersive ? 'Calibrating the gauge' : 'Preparing the bay'}
            </p>
          </div>
        </div>
      )}

      <div
        className={`relative z-10 flex flex-col min-h-screen ${hasTrained ? 'bg-[#061013]' : 'bg-transparent'}`}
      >
        {/* Top Navigation — full chrome only after first trained session */}
        {hasTrained ? (
          <div className="studio-topbar sticky top-0 z-50">
            <div className="studio-topbar__inner px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  key={levelPulse || undefined}
                  className={`studio-level-mark${immersive ? ' sandow-stamp' : ''}${
                    levelPulse ? ' animate-level-up' : ''
                  }`}
                  aria-label="Level"
                >
                  <span>{progress.currentLevel}</span>
                </div>
                <div>
                  <div className="studio-meta">Level {progress.currentLevel}</div>
                  <div className="studio-xp">
                    <CountUp to={progress.totalXp} format /> {immersive ? 'graded reps' : 'XP'}
                  </div>
                </div>
              </div>

              {/* Desktop-only tabs — on mobile the bottom bar owns navigation,
                  so the topbar stays level + wallet (no duplicate chrome). */}
              <div className="studio-tabs hidden md:flex items-center gap-1 p-1">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === tab.id ? 'is-active' : ''
                    }`}
                    aria-label={`Switch to ${tab.label} tab`}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {/* Register entry pills — the arcade + calm doorways. Earned
                    chrome: they live in the shell, never the day-0 foyer.
                    Each toggles its register (↔ Coach) and lands on the
                    workout tab, where the matching foyer appears. Active
                    while their register is set. */}
                <button
                  type="button"
                  onClick={() => {
                    setIntent(sessionIntent === 'train' ? 'understand' : 'train');
                    setActiveTab('workout');
                  }}
                  className={`studio-entry-pill studio-entry-pill--arcade${
                    sessionIntent === 'train' ? ' is-active' : ''
                  }`}
                  aria-label="Train — arcade workout mode"
                  aria-pressed={sessionIntent === 'train'}
                >
                  <Gamepad2 size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>Train</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIntent(sessionIntent === 'recover' ? 'understand' : 'recover');
                    setActiveTab('workout');
                  }}
                  className={`studio-entry-pill studio-entry-pill--calm${
                    sessionIntent === 'recover' ? ' is-active' : ''
                  }`}
                  aria-label="Breathe — calm recovery mode"
                  aria-pressed={sessionIntent === 'recover'}
                >
                  <Wind size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>Breathe</span>
                </button>
                <div className="hidden sm:block">
                  <UniversalConnectButton size="sm" showProfileWhenConnected />
                </div>
                <div className="sm:hidden">
                  <WalletStatusPill compact />
                </div>
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
            <ScreenTransition
              key={`workout-${hasTrained ? 'earned' : 'studio'}`}
              mode="fade"
              className="flex-1 flex flex-col"
            >
              <div className="relative z-10 flex-grow">
                <GameReadyGate onReady={() => setGameReady(true)} />
              </div>

              {/* Retention widgets live in the Stats tab only — the bay stays
                  the coaching loop, not a widget stack (see design.md anti-pattern). */}
            </ScreenTransition>
          )}

          {hasTrained && activeTab === 'dashboard' && (
            <ScreenTransition key="dashboard" mode="slide-up" className="flex-1 flex flex-col">
              <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto pb-24">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Staggered cascade — the shell settles in, not all at once */}
                  <div className="motion-enter motion-delay-1">
                    <HeroSection onViewRoadmap={() => setActiveTab('roadmap')} />
                  </div>
                  <div className="motion-enter motion-delay-2">
                    <QuestDashboard />
                  </div>
                  <div className="motion-enter motion-delay-3">
                    <AchievementShowcase />
                  </div>
                  <div className="motion-enter motion-delay-4">
                    <div className="earned-surface p-4">
                      <h3 className="earned-surface__title mb-4">Top performers</h3>
                      <Leaderboard limit={5} onViewMore={handleViewMore} />
                    </div>
                  </div>
                </div>
              </div>
            </ScreenTransition>
          )}

          {hasTrained && activeTab === 'challenges' && (
            <ScreenTransition key="challenges" mode="slide-up" className="flex-1 flex flex-col">
              <div className="flex-1 px-4 py-6 overflow-y-auto pb-24">
                <div className="max-w-2xl mx-auto">
                  <div className="motion-enter">
                    <ChallengeWidget />
                  </div>
                </div>
              </div>
            </ScreenTransition>
          )}

          {hasTrained && activeTab === 'roadmap' && (
            <ScreenTransition key="roadmap" mode="slide-up" className="flex-1 flex flex-col">
              <div className="flex-1 px-4 py-6 overflow-y-auto pb-24">
                <div className="max-w-2xl mx-auto">
                  <div className="motion-enter">
                    <RoadmapSection />
                  </div>
                </div>
              </div>
            </ScreenTransition>
          )}
        </div>

        {/* Mobile bottom tabs — studio chassis; teal active (no yellow wallpaper) */}
        {hasTrained && (
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: 'rgba(6, 16, 19, 0.94)',
              borderTop: '1px solid var(--studio-border)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div
              className="grid gap-1 p-2"
              style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
            >
              {visibleTabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id ? 'earned-tab-active' : ''
                    }`}
                    style={activeTab === tab.id ? undefined : { color: 'var(--studio-muted)' }}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                  >
                    <TabIcon className="w-4 h-4" aria-hidden="true" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
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
            localStorage.setItem('miniapp-first-visit-seen', 'true');
          }}
        />
      )}
    </>
  );
}

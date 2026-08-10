'use client';

import React from 'react';
import { useXpProgress } from '@/hooks/useXpProgress';
import { useQuests } from '@/hooks/useQuests';
import { Zap, ChevronRight, Flame, Target, Ghost } from 'lucide-react';
import { xpService, StreakInfo } from '@/services/XPService';
import { getLocalWorkouts } from '@/services/integrations/WorkoutDataAdapter';
import { ProgressSpark } from '@/components/progress';
import { getRecentProgressSeries, type ProgressSeries } from '@/lib/progress/recentProgress';

interface HeroSectionProps {
  onStartWorkout?: () => void;
  onViewRoadmap?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartWorkout, onViewRoadmap }) => {
  const { progress, pbs, loading } = useXpProgress();
  const { quests } = useQuests();

  const [streakInfo, setStreakInfo] = React.useState<StreakInfo | null>(null);
  const [progressSeries, setProgressSeries] = React.useState<ProgressSeries | null>(null);

  React.useEffect(() => {
    getLocalWorkouts().then((workouts) => {
      const info = xpService.getStreakInfo(workouts);
      setStreakInfo(info);
    });
    getRecentProgressSeries().then(setProgressSeries);
  }, []);

  const completedQuests = quests.filter((q) => q.completed).length;
  const totalQuests = quests.length;
  const nextUnlockLevel = getNextUnlockLevel(progress.currentLevel);

  return (
    <div className="earned-surface relative overflow-hidden p-4 md:p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 20% 0%, var(--studio-glow), transparent 70%)',
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="earned-level-mark" aria-label={`Level ${progress.currentLevel}`}>
              {progress.currentLevel}
            </div>
            <div>
              <div className="earned-surface__title">Level {progress.currentLevel}</div>
              <div
                className="font-bold text-lg tabular-nums"
                style={{ color: 'var(--studio-paper-soft)' }}
              >
                {progress.totalXp.toLocaleString()} XP
              </div>
            </div>
          </div>

          {streakInfo && streakInfo.currentStreak > 0 && (
            <div className="earned-streak">
              <Flame className="w-4 h-4" fill="currentColor" aria-hidden="true" />
              <div>
                <div className="font-bold text-sm tabular-nums leading-none">
                  {streakInfo.currentStreak}
                </div>
                <div
                  className="text-[10px] leading-tight mt-0.5"
                  style={{ color: 'var(--sandow-brass-soft)', opacity: 0.75 }}
                >
                  day streak
                </div>
              </div>
              {streakInfo.multiplier > 1 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--sandow-brass)',
                    color: 'var(--studio-ink)',
                  }}
                >
                  {streakInfo.multiplier}x
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mb-4">
          <div
            className="flex justify-between text-[10px] mb-1 font-mono uppercase tracking-wider"
            style={{ color: 'var(--studio-muted-dim)' }}
          >
            <span>Progress to Level {progress.currentLevel + 1}</span>
            <span className="tabular-nums">
              {progress.xpToNextLevel - progress.totalXp < 0
                ? 0
                : progress.xpToNextLevel - progress.totalXp}{' '}
              XP needed
            </span>
          </div>
          <div className="earned-xp-track">
            <div
              className="earned-xp-fill"
              style={{ width: `${progress.progressToNextLevel * 100}%` }}
            />
          </div>
        </div>

        {progress.totalXp > 0 && progressSeries && (
          <div className="mb-4">
            <ProgressSpark
              points={progressSeries.points}
              register="studio"
              title="Recent progress"
              animate={!loading}
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatTile
            label="Quests"
            value={`${completedQuests}/${totalQuests}`}
            icon={<Target className="w-4 h-4" style={{ color: 'var(--studio-teal)' }} />}
          />
          <StatTile label="Pushups" value={String(pbs.pushups || 0)} accent="teal" />
          <StatTile label="Squats" value={String(pbs.squats || 0)} accent="teal" />
        </div>

        {nextUnlockLevel && (
          <button
            type="button"
            className="w-full text-left mb-4 p-3 rounded-lg transition-colors"
            style={{
              background: 'rgba(86, 217, 195, 0.06)',
              border: '1px solid var(--studio-border)',
            }}
            onClick={onViewRoadmap}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(86, 217, 195, 0.14)' }}
                >
                  {nextUnlockLevel.level === 3 ? (
                    <Ghost className="w-4 h-4" style={{ color: 'var(--sandow-brass)' }} />
                  ) : nextUnlockLevel.level === 5 ? (
                    <Zap className="w-4 h-4" style={{ color: 'var(--studio-teal)' }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--studio-teal)' }} />
                  )}
                </div>
                <div>
                  <div className="earned-surface__title">Next unlock</div>
                  <div className="font-bold text-sm" style={{ color: 'var(--studio-paper-soft)' }}>
                    Level {nextUnlockLevel.level}: {nextUnlockLevel.title}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--studio-muted-dim)' }} />
            </div>
          </button>
        )}

        {onStartWorkout && (
          <button
            type="button"
            onClick={onStartWorkout}
            className="earned-cta-studio w-full py-3.5 text-base flex items-center justify-center gap-2 active:scale-[0.96] transition-transform"
          >
            <Zap className="w-5 h-5" fill="currentColor" />
            <span>Start workout</span>
          </button>
        )}
      </div>
    </div>
  );
};

function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: 'teal';
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'var(--studio-surface-item)',
        border: '1px solid var(--studio-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="earned-surface__title">{label}</span>
      </div>
      <div
        className="text-2xl font-bold tabular-nums"
        style={{
          color: accent === 'teal' ? 'var(--studio-teal-bright)' : 'var(--studio-paper-soft)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function getNextUnlockLevel(currentLevel: number) {
  const unlocks = [
    { level: 3, title: 'Ghost Mode', icon: 'ghost' },
    { level: 5, title: 'On-chain Sync', icon: 'chain' },
    { level: 10, title: 'Elite Themes', icon: 'themes' },
  ];

  return unlocks.find((u) => u.level > currentLevel) || null;
}

export default React.memo(HeroSection);

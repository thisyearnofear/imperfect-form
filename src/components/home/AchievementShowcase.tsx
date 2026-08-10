'use client';

import React from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import {
  Award,
  Lock,
  Trophy,
  Rocket,
  Flame,
  Crown,
  Medal,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export const AchievementShowcase: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { unlockedAchievements, isLoading } = useAchievements();

  const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
    first_workout: Rocket,
    streak_3: Flame,
    streak_7: Crown,
    centurion: Medal,
    powerhouse: Dumbbell,
  };

  const allAchievements = [
    { id: 'first_workout', name: 'First Workout', locked: true },
    { id: 'streak_3', name: '3-Day Streak', locked: true },
    { id: 'streak_7', name: '7-Day Streak', locked: true },
    { id: 'centurion', name: 'Centurion', locked: true },
    { id: 'powerhouse', name: 'Powerhouse', locked: true },
  ].map((a) => ({
    ...a,
    icon: ACHIEVEMENT_ICONS[a.id] ?? Medal,
    unlocked: unlockedAchievements.some((u) => u.id === a.id),
  }));

  const unlockedCount = allAchievements.filter((a) => a.unlocked).length;
  const totalCount = allAchievements.length;

  if (!isLoading && unlockedCount === 0 && !compact) {
    return (
      <EmptyState
        variant="achievements"
        title="No achievements yet"
        description="Complete workouts to unlock your first achievement."
        className="earned-surface"
      />
    );
  }

  if (compact) {
    return (
      <div className="earned-surface p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" style={{ color: 'var(--sandow-brass)' }} />
            <span className="earned-surface__title">Achievements</span>
          </div>
          <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--studio-muted)' }}>
            {unlockedCount}/{totalCount}
          </span>
        </div>
        <div className="flex -space-x-2">
          {allAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className="w-8 h-8 rounded-full flex items-center justify-center border-2"
              style={{
                borderColor: 'var(--studio-ink)',
                background: achievement.unlocked
                  ? 'rgba(252, 177, 49, 0.16)'
                  : 'var(--studio-surface-item)',
              }}
              title={achievement.name}
            >
              {achievement.unlocked ? (
                <achievement.icon
                  size={14}
                  style={{ color: 'var(--sandow-brass)' }}
                  aria-hidden="true"
                />
              ) : (
                <Lock size={12} style={{ color: 'var(--studio-muted)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="earned-surface p-4 animate-pulse">
        <div
          className="h-5 w-32 rounded mb-3"
          style={{ background: 'var(--studio-surface-item)' }}
        />
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 w-10 rounded-full mx-auto"
              style={{ background: 'var(--studio-surface-item)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="earned-surface p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5" style={{ color: 'var(--sandow-brass)' }} />
        <h3 className="earned-surface__title" style={{ fontSize: '0.75rem' }}>
          Achievements
        </h3>
      </div>

      <div className="mb-4 text-center">
        <div className="earned-streak inline-flex">
          <Award className="w-4 h-4" />
          <span className="font-bold" style={{ color: 'var(--studio-paper-soft)' }}>
            {unlockedCount}
          </span>
          <span style={{ color: 'var(--studio-muted-dim)' }}>/ {totalCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {allAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className="relative group flex flex-col items-center p-2 rounded-lg transition-colors"
            style={{
              background: achievement.unlocked
                ? 'rgba(252, 177, 49, 0.08)'
                : 'var(--studio-surface-item)',
              opacity: achievement.unlocked ? 1 : 0.65,
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
              style={{
                background: achievement.unlocked
                  ? 'linear-gradient(180deg, var(--sandow-brass), var(--sandow-brass-dim))'
                  : 'rgba(9, 33, 34, 0.8)',
              }}
            >
              {achievement.unlocked ? (
                <achievement.icon
                  size={18}
                  style={{ color: 'var(--studio-ink)' }}
                  aria-hidden="true"
                />
              ) : (
                <Lock size={16} style={{ color: 'var(--studio-muted)' }} />
              )}
            </div>
            <span
              className="text-[11px] font-bold text-center"
              style={{
                color: achievement.unlocked ? 'var(--studio-paper-soft)' : 'var(--studio-muted)',
              }}
            >
              {achievement.name}
            </span>
          </div>
        ))}
      </div>

      {unlockedAchievements.length > 0 && (
        <div
          className="pt-3 flex items-center gap-2 text-xs"
          style={{ borderTop: '1px solid var(--studio-border)' }}
        >
          <span style={{ color: 'var(--studio-muted-dim)' }}>Latest:</span>
          <span
            className="px-2 py-0.5 rounded font-bold"
            style={{
              background: 'rgba(86, 217, 195, 0.14)',
              color: 'var(--studio-teal-bright)',
              border: '1px solid var(--studio-border-strong)',
            }}
          >
            {unlockedAchievements[unlockedAchievements.length - 1].name}
          </span>
        </div>
      )}
    </div>
  );
};

export default React.memo(AchievementShowcase);

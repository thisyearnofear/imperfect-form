'use client';

import React from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { Award, Lock, Trophy, ChevronRight } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';

export const AchievementShowcase: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { unlockedAchievements, isLoading } = useAchievements();

  // Get all possible achievements and mark locked ones
  const allAchievements = [
    { id: 'first_workout', name: 'First Workout', icon: '🚀', locked: true },
    { id: 'streak_3', name: '3-Day Streak', icon: '🔥', locked: true },
    { id: 'streak_7', name: '7-Day Streak', icon: '👑', locked: true },
    { id: 'centurion', name: 'Centurion', icon: '💯', locked: true },
    { id: 'powerhouse', name: 'Powerhouse', icon: '💪', locked: true },
  ].map((a) => ({
    ...a,
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
        className="bg-zinc-900/80 border border-zinc-800 rounded-xl"
      />
    );
  }

  if (compact) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Achievements
            </span>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {unlockedCount}/{totalCount}
          </span>
        </div>
        <div className="flex -space-x-2">
          {allAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 border-zinc-900 ${
                achievement.unlocked
                  ? 'bg-yellow-500/20 border-yellow-500/30'
                  : 'bg-gray-800 border-gray-700'
              }`}
              title={achievement.name}
            >
              {achievement.unlocked ? (
                achievement.icon
              ) : (
                <Lock size={12} className="text-gray-600" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 animate-pulse">
        <div className="h-5 w-32 bg-zinc-800 rounded mb-3" />
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-10 bg-zinc-800 rounded-full mx-auto" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Achievements</h3>
        </div>
        <Link
          href="/achievements"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Progress Summary */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20">
          <Award className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-bold">{unlockedCount}</span>
          <span className="text-gray-500">/ {totalCount}</span>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {allAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative group flex flex-col items-center p-2 rounded-xl transition-all ${
              achievement.unlocked
                ? 'bg-yellow-500/10 hover:bg-yellow-500/20 cursor-pointer'
                : 'bg-gray-800/50 opacity-60'
            }`}
          >
            {/* Badge */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl mb-1 ${
                achievement.unlocked
                  ? 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/30'
                  : 'bg-gray-700'
              }`}
            >
              {achievement.unlocked ? (
                achievement.icon
              ) : (
                <Lock size={16} className="text-gray-500" />
              )}
            </div>

            {/* Name */}
            <span
              className={`text-[10px] font-bold text-center ${
                achievement.unlocked ? 'text-white' : 'text-gray-500'
              }`}
            >
              {achievement.name}
            </span>

            {/* Tooltip on hover */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {achievement.unlocked ? achievement.name : 'Locked'}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Unlock */}
      {unlockedAchievements.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Latest:</span>
            <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 font-bold">
              {unlockedAchievements[unlockedAchievements.length - 1].name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(AchievementShowcase);

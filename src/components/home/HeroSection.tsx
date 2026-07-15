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
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 via-transparent to-transparent" />

      <div className="relative z-10 p-4 md:p-6">
        {/* Level & XP Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <span className="text-2xl font-black text-black tabular-nums">
                {progress.currentLevel}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                Level {progress.currentLevel}
              </div>
              <div className="text-white font-bold text-lg tabular-nums">
                {progress.totalXp.toLocaleString()} XP
              </div>
            </div>
          </div>

          {/* Streak Badge */}
          {streakInfo && streakInfo.currentStreak > 0 && (
            <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/30">
              <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
              <div>
                <div className="text-orange-400 font-black text-sm tabular-nums">
                  {streakInfo.currentStreak}
                </div>
                <div className="text-[10px] text-orange-300/60">day streak</div>
              </div>
              {streakInfo.multiplier > 1 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {streakInfo.multiplier}x
                </span>
              )}
            </div>
          )}
        </div>

        {/* XP Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">
            <span>Progress to Level {progress.currentLevel + 1}</span>
            <span className="tabular-nums">
              {progress.xpToNextLevel - progress.totalXp < 0
                ? 0
                : progress.xpToNextLevel - progress.totalXp}{' '}
              XP needed
            </span>
          </div>
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-[width] duration-500 shadow-[0_0_10px_rgba(252,177,49,0.4)]"
              style={{ width: `${progress.progressToNextLevel * 100}%` }}
            />
          </div>
        </div>

        {progress.totalXp > 0 && progressSeries && (
          <div className="mb-4">
            <ProgressSpark
              points={progressSeries.points}
              register="arcade"
              title="Recent progress"
              animate={!loading}
            />
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                Quests
              </span>
            </div>
            <div className="text-2xl font-black text-white tabular-nums">
              {completedQuests}/{totalQuests}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">
              Pushups
            </div>
            <div className="text-2xl font-black text-green-400 tabular-nums">
              {pbs.pushups || 0}
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3 border border-white/5">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">
              Squats
            </div>
            <div className="text-2xl font-black text-blue-400 tabular-nums">{pbs.squats || 0}</div>
          </div>
        </div>

        {nextUnlockLevel && (
          <div
            className="bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-lg p-3 border border-purple-500/20 mb-4"
            onClick={onViewRoadmap}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  {nextUnlockLevel.level === 3 ? (
                    <Ghost className="w-4 h-4 text-purple-400" />
                  ) : nextUnlockLevel.level === 5 ? (
                    <Zap className="w-4 h-4 text-purple-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-purple-400 uppercase tracking-widest font-bold">
                    Next Unlock
                  </div>
                  <div className="text-white font-bold text-sm">
                    Level {nextUnlockLevel.level}: {nextUnlockLevel.title}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/50" />
            </div>
          </div>
        )}

        <button
          onClick={onStartWorkout}
          className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-lg rounded-xl shadow-lg shadow-yellow-500/30 transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.96] flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" fill="currentColor" />
          <span>START WORKOUT</span>
        </button>
      </div>
    </div>
  );
};

function getNextUnlockLevel(currentLevel: number) {
  const unlocks = [
    { level: 3, title: 'Ghost Mode', icon: 'ghost' },
    { level: 5, title: 'On-chain Sync', icon: 'chain' },
    { level: 10, title: 'Elite Themes', icon: 'themes' },
  ];

  return unlocks.find((u) => u.level > currentLevel) || null;
}

export default React.memo(HeroSection);

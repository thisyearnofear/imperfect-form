'use client';

import React from 'react';
import { useXpProgress } from '@/hooks/useXpProgress';
import { Lock, Unlock, Ghost, Share2, Award, Trophy, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface RoadmapSectionProps {
  onViewAll?: () => void;
}

const MILESTONES = [
  {
    level: 1,
    title: 'Beginner',
    description: 'Start your journey',
    icon: <Award size={16} />,
    color: 'from-gray-600 to-gray-700',
    unlocked: true,
  },
  {
    level: 3,
    title: 'Ghost Mode',
    description: 'Race your Personal Best',
    icon: <Ghost size={16} />,
    color: 'from-purple-600 to-violet-600',
    feature: 'race-pb',
  },
  {
    level: 5,
    title: 'On-chain Sync',
    description: 'Immutable on-chain records',
    icon: <Share2 size={16} />,
    color: 'from-blue-600 to-cyan-600',
    feature: 'onchain',
  },
  {
    level: 10,
    title: 'Elite Status',
    description: 'Exclusive UI themes',
    icon: <Trophy size={16} />,
    color: 'from-yellow-500 to-amber-600',
    feature: 'themes',
  },
];

export const RoadmapSection: React.FC<RoadmapSectionProps> = ({ onViewAll }) => {
  const { progress, loading } = useXpProgress();
  const currentLevel = progress.currentLevel;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Feature Roadmap</h3>
        </div>
        <Link
          href="/roadmap"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <span>View All</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Current Level Indicator */}
      <div className="mb-4 flex items-center gap-3 p-3 bg-white/5 rounded-lg">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
          <span className="text-2xl font-black text-black">{currentLevel}</span>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">
            Current Level
          </div>
          <div className="text-white font-bold">{getLevelTitle(currentLevel)}</div>
          <div
            className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mt-2"
            role="progressbar"
            aria-valuenow={Math.round(progress.progressToNextLevel * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Level ${currentLevel} progress`}
          >
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
              style={{ width: `${progress.progressToNextLevel * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-[22px] top-8 bottom-8 w-0.5 bg-gray-800" />

        <div className="space-y-4">
          {MILESTONES.map((milestone) => {
            const isUnlocked = currentLevel >= milestone.level;
            const isNext = !isUnlocked && currentLevel >= milestone.level - 1;

            return (
              <div key={milestone.level} className="relative flex gap-4">
                {/* Node */}
                <div
                  className={`z-10 flex-shrink-0 w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all ${
                    isUnlocked
                      ? `bg-gradient-to-br ${milestone.color} border-transparent text-white shadow-lg`
                      : isNext
                        ? 'bg-zinc-800 border-yellow-400/50 text-yellow-400 shadow-[0_0_15px_rgba(252,177,49,0.3)] animate-pulse'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                  }`}
                >
                  {isUnlocked ? (
                    <div className="flex items-center justify-center w-full h-full">
                      {milestone.icon}
                    </div>
                  ) : (
                    <Lock size={16} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isUnlocked
                          ? 'bg-white/10 text-white'
                          : isNext
                            ? 'bg-yellow-400/20 text-yellow-400'
                            : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      LVL {milestone.level}
                    </span>
                    <h4
                      className={`font-bold text-sm ${
                        isUnlocked ? 'text-white' : isNext ? 'text-yellow-400' : 'text-zinc-500'
                      }`}
                    >
                      {milestone.title}
                    </h4>
                  </div>
                  <p className={`text-xs ${isUnlocked ? 'text-gray-400' : 'text-zinc-600'}`}>
                    {milestone.description}
                  </p>

                  {/* Progress hint for next unlock */}
                  {isNext && (
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="h-1 flex-1 bg-zinc-800 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(progress.progressToNextLevel * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progress to unlock ${milestone.title}`}
                      >
                        <div
                          className="h-full bg-yellow-400/50"
                          style={{ width: `${progress.progressToNextLevel * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-yellow-400/60 font-mono">
                        {Math.round(progress.progressToNextLevel * 100)}% to unlock
                      </span>
                    </div>
                  )}

                  {/* Unlock Badge */}
                  {isUnlocked && milestone.level <= currentLevel && (
                    <div className="mt-2 flex items-center gap-1">
                      <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 font-bold">
                        UNLOCKED
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function getLevelTitle(level: number): string {
  if (level >= 10) return 'Elite Status';
  if (level >= 5) return 'On-chain Sync';
  if (level >= 3) return 'Ghost Mode';
  return 'Beginner';
}

export default React.memo(RoadmapSection);

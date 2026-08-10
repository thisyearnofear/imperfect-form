'use client';

import React from 'react';
import { useXpProgress } from '@/hooks/useXpProgress';
import { Lock, Ghost, Share2, Award, Trophy, ChevronRight } from 'lucide-react';
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
    unlocked: true,
  },
  {
    level: 3,
    title: 'Ghost Mode',
    description: 'Beat your own line',
    icon: <Ghost size={16} />,
    feature: 'race-pb',
  },
  {
    level: 5,
    title: 'On-chain Sync',
    description: 'Immutable on-chain records',
    icon: <Share2 size={16} />,
    feature: 'onchain',
  },
  {
    level: 10,
    title: 'Elite Status',
    description: 'Exclusive UI themes',
    icon: <Trophy size={16} />,
    feature: 'themes',
  },
];

export const RoadmapSection: React.FC<RoadmapSectionProps> = ({ onViewAll: _onViewAll }) => {
  const { progress, loading: _loading } = useXpProgress();
  const currentLevel = progress.currentLevel;

  return (
    <div className="earned-surface p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: 'var(--sandow-brass)' }} />
          <h3 className="earned-surface__title" style={{ fontSize: '0.75rem' }}>
            Feature roadmap
          </h3>
        </div>
        <Link
          href="/roadmap"
          className="text-xs transition-colors flex items-center gap-1"
          style={{ color: 'var(--studio-muted-dim)' }}
        >
          <span>View all</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div
        className="mb-4 flex items-center gap-3 p-3 rounded-lg"
        style={{
          background: 'var(--studio-surface-item)',
          border: '1px solid var(--studio-border)',
        }}
      >
        <div
          className="earned-level-mark"
          style={{ width: '3rem', height: '3rem', fontSize: '1.15rem' }}
        >
          {currentLevel}
        </div>
        <div className="flex-1">
          <div className="earned-surface__title mb-1">Current level</div>
          <div className="font-bold" style={{ color: 'var(--studio-paper-soft)' }}>
            {getLevelTitle(currentLevel)}
          </div>
          <div
            className="earned-xp-track mt-2"
            role="progressbar"
            aria-valuenow={Math.round(progress.progressToNextLevel * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Level ${currentLevel} progress`}
          >
            <div
              className="earned-xp-fill"
              style={{ width: `${progress.progressToNextLevel * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          className="absolute left-[22px] top-8 bottom-8 w-0.5"
          style={{ background: 'var(--studio-border)' }}
        />

        <div className="space-y-4">
          {MILESTONES.map((milestone) => {
            const isUnlocked = currentLevel >= milestone.level;
            const isNext = !isUnlocked && currentLevel >= milestone.level - 1;

            return (
              <div key={milestone.level} className="relative flex gap-4">
                <div
                  className="z-10 flex-shrink-0 w-11 h-11 rounded-lg border flex items-center justify-center transition-colors"
                  style={{
                    background: isUnlocked
                      ? 'var(--studio-teal-cta)'
                      : isNext
                        ? 'rgba(252, 177, 49, 0.12)'
                        : 'var(--studio-surface-item)',
                    borderColor: isUnlocked
                      ? 'var(--studio-border-strong)'
                      : isNext
                        ? 'var(--sandow-rule)'
                        : 'var(--studio-border)',
                    color: isUnlocked
                      ? 'var(--studio-ink)'
                      : isNext
                        ? 'var(--sandow-brass)'
                        : 'var(--studio-muted-dim)',
                  }}
                >
                  {isUnlocked ? milestone.icon : <Lock size={16} />}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: isUnlocked
                          ? 'rgba(86, 217, 195, 0.14)'
                          : isNext
                            ? 'rgba(252, 177, 49, 0.14)'
                            : 'var(--studio-surface-item)',
                        color: isUnlocked
                          ? 'var(--studio-teal-bright)'
                          : isNext
                            ? 'var(--sandow-brass)'
                            : 'var(--studio-muted-dim)',
                      }}
                    >
                      LVL {milestone.level}
                    </span>
                    <h4
                      className="font-bold text-sm"
                      style={{
                        color: isUnlocked
                          ? 'var(--studio-paper-soft)'
                          : isNext
                            ? 'var(--sandow-brass)'
                            : 'var(--studio-muted-dim)',
                      }}
                    >
                      {milestone.title}
                    </h4>
                  </div>
                  <p
                    className="text-xs"
                    style={{
                      color: isUnlocked ? 'var(--studio-muted)' : 'var(--studio-muted-dim)',
                    }}
                  >
                    {milestone.description}
                  </p>

                  {isNext && (
                    <div className="mt-2 flex items-center gap-2">
                      <div
                        className="earned-xp-track flex-1"
                        style={{ height: '0.25rem' }}
                        role="progressbar"
                        aria-valuenow={Math.round(progress.progressToNextLevel * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Progress to unlock ${milestone.title}`}
                      >
                        <div
                          className="earned-xp-fill"
                          style={{ width: `${progress.progressToNextLevel * 100}%` }}
                        />
                      </div>
                      <span
                        className="text-[10px] font-mono"
                        style={{ color: 'var(--sandow-brass)', opacity: 0.75 }}
                      >
                        {Math.round(progress.progressToNextLevel * 100)}% to unlock
                      </span>
                    </div>
                  )}

                  {isUnlocked && milestone.level <= currentLevel && (
                    <div className="mt-2 flex items-center gap-1">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: 'rgba(86, 217, 195, 0.14)',
                          color: 'var(--studio-teal-bright)',
                          border: '1px solid var(--studio-border-strong)',
                        }}
                      >
                        Unlocked
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

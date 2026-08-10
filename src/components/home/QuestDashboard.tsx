'use client';

import React from 'react';
import { useQuests } from '@/hooks/useQuests';
import { CheckCircle, Circle, Target, Zap, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { CountUp } from '@/components/ui/CountUp';

interface QuestDashboardProps {
  compact?: boolean;
}

export const QuestDashboard: React.FC<QuestDashboardProps> = ({ compact = false }) => {
  const { quests, loading } = useQuests();

  if (loading && quests.length === 0) {
    return (
      <div className="earned-surface p-4 animate-pulse">
        <div
          className="h-5 w-32 rounded mb-3"
          style={{ background: 'var(--studio-surface-item)' }}
        />
        <div className="space-y-2">
          <div className="h-12 rounded" style={{ background: 'var(--studio-surface-item)' }} />
          <div className="h-12 rounded" style={{ background: 'var(--studio-surface-item)' }} />
        </div>
      </div>
    );
  }

  const completedCount = quests.filter((q) => q.completed).length;
  const totalCount = quests.length;
  const allComplete = completedCount === totalCount && totalCount > 0;

  if (!loading && quests.length === 0) {
    return (
      <EmptyState
        variant="default"
        title="No quests today"
        description="Check back tomorrow for new daily quests."
        className="earned-surface"
      />
    );
  }

  if (compact) {
    return (
      <div className="earned-surface p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: 'var(--studio-teal)' }} />
            <span className="earned-surface__title">Daily quests</span>
          </div>
          <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--studio-muted)' }}>
            {completedCount}/{totalCount}
          </span>
        </div>

        <div className="space-y-1.5">
          {quests.slice(0, 3).map((quest) => (
            <div key={quest.id} className="flex items-center gap-2 text-xs">
              {quest.completed ? (
                <CheckCircle
                  className="w-3.5 h-3.5 flex-shrink-0 animate-quest-complete"
                  style={{ color: 'var(--studio-teal-bright)' }}
                />
              ) : (
                <Circle
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: 'var(--studio-muted-dim)' }}
                />
              )}
              <span
                style={{
                  color: quest.completed ? 'var(--studio-teal-bright)' : 'var(--studio-muted)',
                }}
              >
                {quest.title}
              </span>
              <span
                className="ml-auto font-mono text-xs"
                style={{ color: 'var(--sandow-brass)', opacity: 0.85 }}
              >
                +{quest.xpReward}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="earned-surface p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5" style={{ color: 'var(--studio-teal)' }} />
          <h3 className="earned-surface__title" style={{ fontSize: '0.75rem' }}>
            Daily quests
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {allComplete && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{
                background: 'rgba(86, 217, 195, 0.14)',
                color: 'var(--studio-teal-bright)',
                border: '1px solid var(--studio-border-strong)',
              }}
            >
              All done
            </span>
          )}
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--studio-muted)' }}>
            <Clock className="w-3 h-3" />
            <span>12h</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div
          className="earned-xp-track"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label={`Daily quests: ${completedCount} of ${totalCount} completed`}
        >
          <div
            className="earned-xp-fill"
            style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className="p-3 rounded-lg transition-colors"
            style={{
              background: quest.completed
                ? 'rgba(86, 217, 195, 0.06)'
                : 'var(--studio-surface-item)',
              border: quest.completed
                ? '1px solid var(--studio-border-strong)'
                : '1px solid var(--studio-border)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {quest.completed ? (
                  <CheckCircle
                    className="w-5 h-5 animate-quest-complete"
                    style={{ color: 'var(--studio-teal-bright)' }}
                  />
                ) : (
                  <Circle className="w-5 h-5" style={{ color: 'var(--studio-muted-dim)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className="font-bold text-sm truncate"
                    style={{
                      color: quest.completed
                        ? 'var(--studio-teal-bright)'
                        : 'var(--studio-paper-soft)',
                    }}
                  >
                    {quest.title}
                  </h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Zap
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      style={{ color: 'var(--sandow-brass)' }}
                    />
                    <span className="text-xs font-bold" style={{ color: 'var(--sandow-brass)' }}>
                      +{quest.xpReward}
                    </span>
                  </div>
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--studio-muted)' }}>
                  {quest.description}
                </p>
                {!quest.completed && (
                  <div className="mt-2">
                    <div
                      className="flex justify-between text-xs font-mono mb-1"
                      style={{ color: 'var(--studio-muted)' }}
                    >
                      <span>
                        {quest.progress}/{quest.target}
                      </span>
                      <span>{Math.round((quest.progress / quest.target) * 100)}%</span>
                    </div>
                    <div
                      className="earned-xp-track"
                      style={{ height: '0.25rem' }}
                      role="progressbar"
                      aria-valuenow={quest.progress}
                      aria-valuemin={0}
                      aria-valuemax={quest.target}
                      aria-label={`${quest.title}: ${quest.progress} of ${quest.target}`}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(quest.progress / quest.target) * 100}%`,
                          background: 'var(--studio-teal)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {completedCount > 0 && (
        <div
          className="mt-4 pt-3 text-center text-xs"
          style={{ borderTop: '1px solid var(--studio-border)', color: 'var(--studio-muted)' }}
        >
          <span className="font-bold" style={{ color: 'var(--sandow-brass)' }}>
            <CountUp to={completedCount * 100} />
          </span>{' '}
          XP earned today
        </div>
      )}
    </div>
  );
};

export default React.memo(QuestDashboard);

'use client';

import React from 'react';
import { useQuests } from '@/hooks/useQuests';
import { CheckCircle, Circle, Target, Zap, Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface QuestDashboardProps {
  compact?: boolean;
}

export const QuestDashboard: React.FC<QuestDashboardProps> = ({ compact = false }) => {
  const { quests, loading } = useQuests();

  if (loading && quests.length === 0) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 animate-pulse">
        <div className="h-5 w-32 bg-zinc-800 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-12 bg-zinc-800 rounded" />
          <div className="h-12 bg-zinc-800 rounded" />
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
        className="bg-zinc-900/80 border border-zinc-800 rounded-xl"
      />
    );
  }

  if (compact) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Daily Quests
            </span>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {completedCount}/{totalCount}
          </span>
        </div>

        <div className="space-y-1.5">
          {quests.slice(0, 3).map((quest) => (
            <div key={quest.id} className="flex items-center gap-2 text-xs">
              {quest.completed ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 animate-quest-complete" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
              )}
              <span className={quest.completed ? 'text-green-400' : 'text-gray-400'}>
                {quest.title}
              </span>
              <span className="ml-auto text-yellow-400/60 font-mono text-[10px]">
                +{quest.xpReward}
              </span>
            </div>
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
          <Target className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daily Quests</h3>
        </div>
        <div className="flex items-center gap-2">
          {allComplete && (
            <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30">
              ALL DONE!
            </span>
          )}
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            <span>12h</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          className="h-2 bg-gray-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          aria-label={`Daily quests: ${completedCount} of ${totalCount} completed`}
        >
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Quest List */}
      <div className="space-y-2">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`p-3 rounded-lg border transition-all ${
              quest.completed
                ? 'bg-green-500/5 border-green-500/20 animate-fade-in'
                : 'bg-white/5 border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {quest.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-400 animate-quest-complete" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`font-bold text-sm truncate ${
                      quest.completed ? 'text-green-400' : 'text-white'
                    }`}
                  >
                    {quest.title}
                  </h4>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" />
                    <span className="text-yellow-400 text-xs font-bold">+{quest.xpReward}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5 truncate">{quest.description}</p>
                {!quest.completed && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-gray-500">
                        {quest.progress}/{quest.target}
                      </span>
                      <span className="text-gray-600">
                        {Math.round((quest.progress / quest.target) * 100)}%
                      </span>
                    </div>
                    <div
                      className="h-1 bg-gray-800 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={quest.progress}
                      aria-valuemin={0}
                      aria-valuemax={quest.target}
                      aria-label={`${quest.title}: ${quest.progress} of ${quest.target}`}
                    >
                      <div
                        className="h-full bg-gray-500 transition-all"
                        style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* XP Summary */}
      {completedCount > 0 && (
        <div className="mt-4 pt-3 border-t border-white/5 text-center">
          <span className="text-xs text-gray-400">
            <span className="text-yellow-400 font-bold">{completedCount * 100}</span> XP earned
            today
          </span>
        </div>
      )}
    </div>
  );
};

export default React.memo(QuestDashboard);

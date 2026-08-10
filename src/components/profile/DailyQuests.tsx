import React from 'react';
import { useQuests } from '@/hooks/useQuests';
import { CheckCircle, Circle, Target, Zap } from 'lucide-react';

export const DailyQuests: React.FC = () => {
  const { quests, loading } = useQuests();

  if (loading && quests.length === 0) {
    return (
      <div className="studio-card studio-card__body" aria-busy="true">
        <div className="h-4 w-32 rounded animate-pulse bg-[rgba(139,227,212,0.12)]" />
        <div className="h-16 rounded animate-pulse bg-[rgba(139,227,212,0.06)]" />
        <div className="h-16 rounded animate-pulse bg-[rgba(139,227,212,0.06)]" />
        <div className="h-16 rounded animate-pulse bg-[rgba(139,227,212,0.06)]" />
      </div>
    );
  }

  return (
    <div className="studio-card studio-card__body">
      <div className="flex items-center justify-between">
        <h3 className="studio-card__section-title flex items-center gap-1.5">
          <Target size={13} style={{ color: 'var(--sandow-brass)' }} aria-hidden="true" />
          Daily Quests
        </h3>
        <span className="text-[11px] font-mono text-[var(--studio-muted)]">Resets in 12h</span>
      </div>

      <div className="space-y-3">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`p-4 rounded-lg border transition-colors ${
              quest.completed
                ? 'bg-[rgba(252,177,49,0.07)] border-[color:var(--sandow-rule-quiet)]'
                : 'bg-[rgba(9,33,34,0.5)] border-[color:var(--studio-border)]'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4
                  className={`font-bold text-sm ${
                    quest.completed
                      ? 'text-[var(--sandow-brass)]'
                      : 'text-[var(--studio-paper-soft)]'
                  }`}
                >
                  {quest.title}
                </h4>
                <p className="text-xs text-[var(--studio-muted)] mt-1">{quest.description}</p>
              </div>
              <div className="flex flex-col items-end">
                <div
                  className="flex items-center gap-1 text-xs font-bold mb-1"
                  style={{ color: 'var(--sandow-brass)' }}
                >
                  <Zap size={12} fill="currentColor" aria-hidden="true" />+{quest.xpReward} XP
                </div>
                {quest.completed ? (
                  <CheckCircle
                    size={20}
                    className="text-[var(--sandow-brass)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle size={20} className="text-[var(--studio-muted-dim)]" aria-hidden="true" />
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span
                  className={
                    quest.completed ? 'text-[var(--sandow-brass)]' : 'text-[var(--studio-muted)]'
                  }
                >
                  PROGRESS: {quest.progress} / {quest.target}
                </span>
                <span className="text-[var(--studio-muted-dim)]">
                  {Math.round((quest.progress / quest.target) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden bg-[rgba(139,227,212,0.12)]">
                <div
                  className={`h-full transition-all duration-500 ${
                    quest.completed ? 'bg-[var(--sandow-brass)]' : 'bg-[var(--studio-teal-bright)]'
                  }`}
                  style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyQuests;

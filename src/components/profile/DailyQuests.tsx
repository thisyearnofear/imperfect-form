import React from 'react';
import { useQuests } from '@/hooks/useQuests';
import { CheckCircle, Circle, Target, Zap } from 'lucide-react';

export const DailyQuests: React.FC = () => {
  const { quests, loading } = useQuests();

  if (loading && quests.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-zinc-800 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-20 bg-zinc-800 rounded"></div>
          <div className="h-20 bg-zinc-800 rounded"></div>
          <div className="h-20 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Target className="text-yellow-400 w-5 h-5" />
          Daily Quests
        </h3>
        <span className="text-xs text-zinc-500 font-mono">Resets in 12h</span>
      </div>

      <div className="space-y-4">
        {quests.map((quest) => (
          <div
            key={quest.id}
            className={`p-4 rounded-lg border transition-all ${
              quest.completed
                ? 'bg-yellow-400/5 border-yellow-400/20'
                : 'bg-zinc-800/50 border-zinc-700'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4
                  className={`font-bold ${quest.completed ? 'text-yellow-400' : 'text-zinc-200'}`}
                >
                  {quest.title}
                </h4>
                <p className="text-xs text-zinc-400 mt-1">{quest.description}</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold mb-1">
                  <Zap size={12} fill="currentColor" />+{quest.xpReward} XP
                </div>
                {quest.completed ? (
                  <CheckCircle className="text-yellow-400 w-5 h-5" />
                ) : (
                  <Circle className="text-zinc-600 w-5 h-5" />
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className={quest.completed ? 'text-yellow-400' : 'text-zinc-400'}>
                  PROGRESS: {quest.progress} / {quest.target}
                </span>
                <span className="text-zinc-500">
                  {Math.round((quest.progress / quest.target) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    quest.completed ? 'bg-yellow-400' : 'bg-zinc-500'
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

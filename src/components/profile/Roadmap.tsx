import React from 'react';
import { useXpProgress } from '@/hooks/useXpProgress';
import { Lock, Ghost, Share2, Award, Trophy } from 'lucide-react';

interface Milestone {
  level: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const MILESTONES: Milestone[] = [
  {
    level: 1,
    title: 'Beginner',
    description: 'Welcome to the journey.',
    icon: <Award size={18} />,
  },
  {
    level: 3,
    title: 'Ghost Mode',
    description: 'Race against your Personal Best.',
    icon: <Ghost size={18} />,
  },
  {
    level: 5,
    title: 'On-chain Sync',
    description: 'Immutable proof of your work.',
    icon: <Share2 size={18} />,
  },
  {
    level: 10,
    title: 'Elite Status',
    description: 'Exclusive UI themes unlocked.',
    icon: <Trophy size={18} />,
  },
];

export const Roadmap: React.FC = () => {
  const { progress } = useXpProgress();
  const currentLevel = progress.currentLevel;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6">Unlocks Roadmap</h3>

      <div className="relative">
        {/* Timeline Path */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-800" />

        <div className="space-y-8 relative">
          {MILESTONES.map((milestone) => {
            const isUnlocked = currentLevel >= milestone.level;

            return (
              <div key={milestone.level} className="flex gap-6 items-start">
                {/* Node */}
                <div
                  className={`z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                    isUnlocked
                      ? 'bg-yellow-400 border-yellow-400 text-black'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                  }`}
                >
                  {isUnlocked ? milestone.icon : <Lock size={18} />}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                        isUnlocked
                          ? 'bg-yellow-400/20 text-yellow-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      LVL {milestone.level}
                    </span>
                    <h4 className={`font-bold ${isUnlocked ? 'text-white' : 'text-zinc-500'}`}>
                      {milestone.title}
                    </h4>
                  </div>
                  <p className={`text-sm ${isUnlocked ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {milestone.description}
                  </p>

                  {!isUnlocked && milestone.level > currentLevel && (
                    <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-700"
                        style={{ width: `${(currentLevel / milestone.level) * 100}%` }}
                      />
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

export default Roadmap;

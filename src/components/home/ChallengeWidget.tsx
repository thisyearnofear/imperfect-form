'use client';

import React, { useState, useEffect } from 'react';
import { Ghost, Trophy, ChevronRight, Share2, Play, Crown } from 'lucide-react';
import { useXpProgress } from '@/hooks/useXpProgress';
import { getChampionTrace, isChampion } from '@/constants/championTraces';
import { ghostService } from '@/services/GhostService';
import { useSearchParams } from 'next/navigation';

interface ChallengeWidgetProps {
  onStartGhostRace?: (mode: 'pushups' | 'squats') => void;
}

// Sample champions data for display
const SAMPLE_CHAMPIONS = [
  { name: 'The Pro', mode: 'pushups' as const, reps: 52, date: '2026-04-15', level: 12 },
  { name: 'Base God', mode: 'pushups' as const, reps: 48, date: '2026-04-10', level: 11 },
  { name: 'Squat King', mode: 'squats' as const, reps: 75, date: '2026-04-12', level: 10 },
  { name: 'Ghost Rider', mode: 'squats' as const, reps: 68, date: '2026-04-08', level: 9 },
];

export const ChallengeWidget: React.FC<ChallengeWidgetProps> = ({ onStartGhostRace }) => {
  const { progress } = useXpProgress();
  const [champions, setChampions] = useState<
    Array<{
      name: string;
      mode: 'pushups' | 'squats';
      reps: number;
      date: string;
      level: number;
    }>
  >([]);
  const [hasIncomingChallenge, setHasIncomingChallenge] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for incoming ghost challenge in URL
    const raceParam = searchParams?.get('race');
    if (raceParam) {
      setHasIncomingChallenge(true);
    }

    // Use sample champions for display
    setChampions(SAMPLE_CHAMPIONS);
  }, [searchParams]);

  const canUseGhostMode = progress.currentLevel >= 3;
  const canUseOnChain = progress.currentLevel >= 5;

  const handleStartChallenge = (mode: 'pushups' | 'squats') => {
    if (onStartGhostRace) {
      onStartGhostRace(mode);
    }
  };

  const handleShareChallenge = async () => {
    // Get the current workout trace from localStorage
    const lastWorkoutTrace = localStorage.getItem('lastWorkoutTrace');
    if (!lastWorkoutTrace) {
      alert('Complete a workout first to share a ghost challenge!');
      return;
    }

    try {
      const trace = JSON.parse(lastWorkoutTrace);
      const mode = (localStorage.getItem('lastWorkoutMode') as 'pushups' | 'squats') || 'pushups';
      const shareUrl = ghostService.generateShareUrl(trace, mode);

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert('Ghost challenge link copied to clipboard!');
    } catch (error) {
      console.error('Failed to share challenge:', error);
      alert('Failed to create challenge. Please complete a workout first.');
    }
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ghost className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Ghost Challenges
          </h3>
        </div>
      </div>

      {/* Incoming Challenge Alert */}
      {hasIncomingChallenge && (
        <div className="mb-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
              <Ghost className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-bold text-sm">Incoming Challenge!</div>
              <div className="text-purple-300 text-xs">
                A friend challenged you to race their ghost
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-400" />
          </div>
        </div>
      )}

      {/* Ghost Mode Feature */}
      <div
        className={`mb-4 p-4 rounded-xl ${canUseGhostMode ? 'bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30' : 'bg-gray-800/50 border border-gray-700/50'}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${canUseGhostMode ? 'bg-purple-500/30' : 'bg-gray-700'}`}
          >
            <Ghost className={`w-5 h-5 ${canUseGhostMode ? 'text-purple-400' : 'text-gray-500'}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4
                className={`font-bold text-sm ${canUseGhostMode ? 'text-white' : 'text-gray-400'}`}
              >
                Race Your Ghost
              </h4>
              {canUseGhostMode ? (
                <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">
                  ACTIVE
                </span>
              ) : (
                <span className="text-[10px] bg-gray-600/50 text-gray-400 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                  <Lock size={10} /> LVL 3
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {canUseGhostMode
                ? 'See your past performance as a ghost to beat!'
                : 'Complete workouts to unlock and race your Personal Best'}
            </p>
            {canUseGhostMode && (
              <button
                onClick={() => handleStartChallenge('pushups')}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Play size={14} />
                Start Ghost Race
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share Your Challenge */}
      {canUseGhostMode && (
        <button
          onClick={handleShareChallenge}
          className="w-full mb-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          <Share2 size={16} />
          <span>Share Challenge Link</span>
        </button>
      )}

      {/* Champions Section */}
      <div className="border-t border-white/5 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Race Champions</h4>
        </div>

        {champions.length > 0 ? (
          <div className="space-y-2">
            {champions.slice(0, 4).map((champion, index) => (
              <div
                key={`${champion.name}-${index}`}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => handleStartChallenge(champion.mode)}
              >
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  {index === 0 ? (
                    <Crown className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <span className="text-yellow-400 font-bold text-sm">#{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-bold truncate">{champion.name}</div>
                  <div className="text-gray-500 text-[10px] font-mono uppercase">
                    {champion.mode} • Lvl {champion.level}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-black text-sm">{champion.reps}</div>
                  <div className="text-gray-500 text-[10px] font-mono">reps</div>
                </div>
                <Play className="w-4 h-4 text-gray-500" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No champions yet. Be the first!</p>
          </div>
        )}
      </div>

      {/* On-chain Sync Preview */}
      {canUseOnChain && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
            <Share2 size={14} />
            <span>On-chain Challenges Active</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Your challenges are now recorded on-chain for verified competition
          </p>
        </div>
      )}
    </div>
  );
};

// Mini Lock icon component
function Lock({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default ChallengeWidget;

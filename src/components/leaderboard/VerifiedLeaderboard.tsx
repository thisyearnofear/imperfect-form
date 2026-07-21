import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  verifiedFitnessLeaderboardABI,
  VERIFIED_FITNESS_CONTRACT_ADDRESS,
} from '@/constants/contracts';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { getBestDisplayName } from '@/utils/web3bio';
import { DataLoader } from '@/components/ui';
import { CELO_FALLBACK_RPCS } from '@/utils/rpcUtils';

interface VerifiedScore {
  user: string;
  pushups: number;
  squats: number;
  timestamp: number;
}

interface VerifiedLeaderboardProps {
  className?: string;
}

const VerifiedLeaderboard: React.FC<VerifiedLeaderboardProps> = ({ className }) => {
  const [verifiedScores, setVerifiedScores] = useState<VerifiedScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayNames, setDisplayNames] = useState<{ [address: string]: string }>({});

  useEffect(() => {
    fetchVerifiedLeaderboard();
  }, []);

  const fetchVerifiedLeaderboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Connect to Celo mainnet
      const provider = new ethers.JsonRpcProvider(CELO_FALLBACK_RPCS[0]);
      const contract = new ethers.Contract(
        VERIFIED_FITNESS_CONTRACT_ADDRESS,
        verifiedFitnessLeaderboardABI,
        provider
      );

      // Fetch the verified leaderboard
      const leaderboardData = await contract.getLeaderboard();

      // Convert BigInt values to numbers and sort by total score
      const scores: VerifiedScore[] = leaderboardData.map((entry: any) => ({
        user: entry.user,
        pushups: Number(entry.pushups),
        squats: Number(entry.squats),
        timestamp: Number(entry.timestamp),
      }));

      // Sort by total score (pushups + squats) descending
      const sortedScores = scores.sort((a, b) => b.pushups + b.squats - (a.pushups + a.squats));

      setVerifiedScores(sortedScores);

      // Fetch display names for all users
      const names: { [address: string]: string } = {};
      for (const score of sortedScores) {
        try {
          const displayName = await getBestDisplayName(score.user);
          names[score.user] = displayName || `${score.user.slice(0, 6)}...${score.user.slice(-4)}`;
        } catch {
          names[score.user] = `${score.user.slice(0, 6)}...${score.user.slice(-4)}`;
        }
      }
      setDisplayNames(names);
    } catch (err) {
      console.error('Error fetching verified leaderboard:', err);
      setError('Failed to load verified leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`leaderboard-container p-8 ${className}`} style={{ marginTop: 0 }}>
        <DataLoader isLoading={true} type="leaderboard" count={10} />
        <span
          className="block text-center mt-4 text-fcb131 font-medium"
          style={{ color: 'primary' }}
        >
          Loading verified athletes...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`leaderboard-container text-center p-8 ${className}`}
        style={{ marginTop: 0 }}
      >
        <p className="text-red-400 mb-4 font-medium">{error}</p>
        <button
          onClick={fetchVerifiedLeaderboard}
          className="load-button"
          style={{
            backgroundColor: 'primary',
            color: 'black',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
          }}
        >
          🔄 Retry Loading
        </button>
      </div>
    );
  }

  if (verifiedScores.length === 0) {
    return (
      <div
        className={`leaderboard-container text-center p-8 ${className}`}
        style={{ marginTop: 0 }}
      >
        <div
          style={{
            padding: '20px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '2px solid #10b981',
            borderRadius: '8px',
          }}
        >
          <p className="text-fcb131 font-bold mb-2" style={{ color: 'primary' }}>
            🏆 No Verified Athletes Yet
          </p>
          <p className="text-green-400 text-sm">
            Complete Self Protocol verification to be the first on this exclusive leaderboard!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Enhanced Header with consistent theming */}
      <div className="bg-black/80 border-2 border-primary rounded-lg p-4 mb-6 shadow-[0_0_20px_rgba(252,177,49,0.5)]">
        <h2 className="text-primary font-bold text-center text-xl mb-2">
          🏆 Verified Champions 🏆
        </h2>
        <p className="text-primary/80 text-center text-sm">
          Self Protocol verified athletes on Celo network
        </p>
      </div>

      {/* Enhanced Leaderboard Table */}
      <div className="bg-black/20 rounded-lg p-4 md:p-6 border border-primary/30 shadow-[0_0_15px_rgba(252,177,49,0.3)]">
        <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-primary text-center border-b-2 border-primary pb-2">
          🏅 Elite Verified Performers 🏅
        </h3>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-black/60 border border-primary/30 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-primary">
                <th className="px-4 py-3 text-primary font-bold">#</th>
                <th className="px-4 py-3 text-primary font-bold">Verified Athlete</th>
                <th className="px-4 py-3 text-primary font-bold">Total Score</th>
                <th className="px-4 py-3 text-primary font-bold">Performance Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {verifiedScores.map((score, index) => {
                const totalScore = score.pushups + score.squats;
                const displayName =
                  displayNames[score.user] || `${score.user.slice(0, 6)}...${score.user.slice(-4)}`;

                return (
                  <tr
                    key={`${score.user}-${index}`}
                    className={`text-center border-b border-primary/20 last:border-none hover:bg-primary/10 transition-colors ${
                      index === 0
                        ? 'bg-primary/20 border-l-4 border-l-primary'
                        : index === 1
                          ? 'bg-primary/15 border-l-4 border-l-[#10b981]'
                          : index === 2
                            ? 'bg-primary/10 border-l-4 border-l-[#10b981]'
                            : 'bg-[#10b981]/10 border-l-4 border-l-[#10b981]'
                    }`}
                  >
                    <td className="px-4 py-3 font-bold text-primary" style={{ color: 'primary' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="font-bold text-[#10b981]" style={{ color: '#10b981' }}>
                          {displayName}
                        </span>
                        <VerificationBadge isVerified={true} size="sm" />
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-primary text-lg">{totalScore}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-4 text-sm">
                        <span className="text-orange-400 font-medium">
                          {score.pushups} Push-ups
                        </span>
                        <span className="text-green-400 font-medium">{score.squats} Squats</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Optimized for small screens */}
        <div className="md:hidden space-y-3 px-2">
          {verifiedScores.map((score, index) => {
            const totalScore = score.pushups + score.squats;
            const displayName =
              displayNames[score.user] || `${score.user.slice(0, 6)}...${score.user.slice(-4)}`;

            return (
              <div
                key={`${score.user}-${index}`}
                className={`bg-black/80 border rounded-lg p-3 cursor-pointer hover:bg-primary/10 transition-colors ${
                  index === 0
                    ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(252,177,49,0.5)]'
                    : index === 1
                      ? 'border-[#10b981] bg-[#10b981]/10 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : index === 2
                        ? 'border-[#10b981] bg-[#10b981]/10'
                        : 'border-[#10b981]/50'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span
                      className="text-lg flex-shrink-0 text-primary font-bold"
                      style={{ color: 'primary' }}
                    >
                      {index === 0
                        ? '🥇'
                        : index === 1
                          ? '🥈'
                          : index === 2
                            ? '🥉'
                            : `#${index + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1">
                        <span
                          className="font-bold text-xs truncate text-[#10b981]"
                          style={{ color: '#10b981' }}
                        >
                          {displayName}
                        </span>
                        <VerificationBadge isVerified={true} size="sm" />
                      </div>
                    </div>
                  </div>
                  <div className="text-primary font-bold text-lg flex-shrink-0 ml-2">
                    {totalScore}
                  </div>
                </div>
                <div className="flex justify-center space-x-4 mt-2 text-xs">
                  <span className="text-orange-400">{score.pushups} Push-ups</span>
                  <span className="text-green-400">{score.squats} Squats</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enhanced Stats Footer */}
      <div className="bg-black/20 rounded-lg p-4 md:p-6 border border-primary/30 mt-6 shadow-[0_0_15px_rgba(252,177,49,0.3)]">
        <div className="text-center">
          <h4 className="text-primary font-bold text-lg mb-2">
            🏆 {verifiedScores.length} Elite Verified Athletes 🏆
          </h4>
          <p className="text-[#10b981] text-sm mb-3">
            Self Protocol verified users earn enhanced recognition and exclusive rewards
          </p>
          <div className="flex justify-center space-x-4 text-xs">
            <span className="text-primary font-medium">🌟 Bonus Recognition</span>
            <span className="text-[#10b981] font-medium">💎 Enhanced Rewards</span>
            <span className="text-purple-400 font-medium">🏅 Elite Status</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifiedLeaderboard;

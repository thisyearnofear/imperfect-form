import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  verifiedFitnessLeaderboardABI,
  VERIFIED_FITNESS_CONTRACT_ADDRESS,
} from '@/constants/contracts';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { getBestDisplayName } from '@/utils/web3bio';
import { Spinner } from '@/components/ui';
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
      <div
        className={`leaderboard-container flex justify-center items-center p-8 ${className}`}
        style={{ marginTop: 0 }}
      >
        <Spinner />
        <span className="ml-3 text-fcb131 font-medium" style={{ color: '#fcb131' }}>
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
            backgroundColor: '#fcb131',
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
          <p className="text-fcb131 font-bold mb-2" style={{ color: '#fcb131' }}>
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
      {/* Verified Leaderboard Table */}
      <div className="leaderboard-container" style={{ marginTop: 0 }}>
        <table id="verifiedLeaderboardTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  backgroundColor: '#111',
                  color: '#fcb131',
                  padding: '10px',
                  textAlign: 'center',
                  borderBottom: '2px solid #fcb131',
                }}
              >
                Rank
              </th>
              <th
                style={{
                  backgroundColor: '#111',
                  color: '#fcb131',
                  padding: '10px',
                  textAlign: 'center',
                  borderBottom: '2px solid #fcb131',
                }}
              >
                Verified User
              </th>
              <th
                style={{
                  backgroundColor: '#111',
                  color: '#fcb131',
                  padding: '10px',
                  textAlign: 'center',
                  borderBottom: '2px solid #fcb131',
                }}
              >
                Score
              </th>
              <th
                style={{
                  backgroundColor: '#111',
                  color: '#fcb131',
                  padding: '10px',
                  textAlign: 'center',
                  borderBottom: '2px solid #fcb131',
                }}
              >
                Breakdown
              </th>
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
                  className="celo-entry" // Using celo styling since it's on Celo network
                  style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    borderLeft: '3px solid #10b981',
                  }}
                >
                  <td
                    style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #333' }}
                  >
                    <span className="text-fcb131 font-bold">#{index + 1}</span>
                  </td>
                  <td
                    style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #333' }}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-white font-medium">{displayName}</span>
                      <VerificationBadge isVerified={true} size="sm" />
                    </div>
                  </td>
                  <td
                    style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #333' }}
                  >
                    <span className="text-fcb131 font-bold text-lg">{totalScore}</span>
                  </td>
                  <td
                    style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #333' }}
                  >
                    <div className="flex items-center justify-center space-x-4 text-sm">
                      <span className="text-orange-400">{score.pushups} Push-ups</span>
                      <span className="text-green-400">{score.squats} Squats</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Stats Footer */}
        <div
          style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '2px solid #10b981',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <p style={{ color: '#fcb131', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            🏆 {verifiedScores.length} Verified Athletes on Celo
          </p>
          <p style={{ color: '#10b981', fontSize: '14px', margin: 0 }}>
            Self Protocol verified users earn bonus recognition and may receive enhanced rewards
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifiedLeaderboard;

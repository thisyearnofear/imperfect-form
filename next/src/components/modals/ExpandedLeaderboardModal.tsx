'use client';

import React, { useState } from 'react';
import '@/styles/leaderboard.css';
import { shortenAddress } from '@/utils/formatters';
import { Dialog } from '@/components/ui';
import { Score } from '@/types';
import { useBatchVerificationStatus } from '@/hooks/useBatchVerificationStatus';
import VerificationBadge from '@/components/verification/VerificationBadge';

interface ExpandedLeaderboardModalProps {
  pushupLeaderboard: Score[];
  squatLeaderboard: Score[];
  displayNames: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
}

const ExpandedLeaderboardModal: React.FC<ExpandedLeaderboardModalProps> = ({
  pushupLeaderboard,
  squatLeaderboard,
  displayNames,
  isOpen,
  onClose,
}) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [breakdownType, setBreakdownType] = useState<'pushups' | 'squats' | null>(null);
  const [progressiveDisplayNames, setProgressiveDisplayNames] =
    useState<Record<string, string>>(displayNames);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);

  // Get all unique user addresses for verification checking
  const allUserAddresses = React.useMemo(() => {
    const addresses = new Set<string>();
    [...pushupLeaderboard, ...squatLeaderboard].forEach((entry) => {
      addresses.add(entry.user);
    });
    return Array.from(addresses);
  }, [pushupLeaderboard, squatLeaderboard]);

  // Check verification status for all users
  const { verificationStatuses } = useBatchVerificationStatus(allUserAddresses);

  // Progressive ENS resolution - update names as they come in
  React.useEffect(() => {
    setProgressiveDisplayNames(displayNames);
  }, [displayNames]);

  if (!isOpen) return null;

  // Aggregate scores across networks for each user
  const aggregateScores = (leaderboard: Score[]) => {
    const combined: Record<string, { totalScore: number; networks: Record<string, number> }> = {};
    leaderboard.forEach((entry) => {
      // Filter by verification status if enabled
      if (showVerifiedOnly && !verificationStatuses[entry.user]) {
        return;
      }

      if (!combined[entry.user]) {
        combined[entry.user] = { totalScore: 0, networks: {} };
      }
      combined[entry.user].totalScore += entry.score;
      if (!combined[entry.user].networks[entry.network]) {
        combined[entry.user].networks[entry.network] = 0;
      }
      combined[entry.user].networks[entry.network] += entry.score;
    });
    return combined;
  };

  const pushupAggregated = aggregateScores(pushupLeaderboard);
  const squatAggregated = aggregateScores(squatLeaderboard);

  // Sort users by total score
  const sortedPushupUsers = Object.entries(pushupAggregated)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore)
    .map(([user, data]) => ({ user, ...data }));
  const sortedSquatUsers = Object.entries(squatAggregated)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore)
    .map(([user, data]) => ({ user, ...data }));

  const handleUserClick = (user: string, type: 'pushups' | 'squats') => {
    setSelectedUser(user);
    setBreakdownType(type);
  };

  const closeBreakdown = () => {
    setSelectedUser(null);
    setBreakdownType(null);
  };

  // Network color mapping for consistency
  const getNetworkColor = (network: string) => {
    switch (network) {
      case 'polygon':
        return 'bg-purple-500';
      case 'base':
        return 'bg-blue-500';
      case 'monad':
        return 'bg-gray-500';
      case 'celo':
        return 'bg-[#fcb131]';
      default:
        return 'bg-gray-400';
    }
  };

  const getNetworkName = (network: string) => {
    switch (network) {
      case 'polygon':
        return 'Polygon';
      case 'base':
        return 'Base';
      case 'monad':
        return 'Monad';
      case 'celo':
        return 'Celo';
      default:
        return network;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="🏆 Onchain Olympians Leaderboard 🏆"
      description="Out of difficulties grow miracles"
      maxWidth="900px"
    >
      {/* Header with consistent theming */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#fcb131]">🏆 Full Leaderboard</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
            className="px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center"
            title={showVerifiedOnly ? 'Show all users' : 'Show verified users only'}
            style={{
              backgroundColor: showVerifiedOnly ? '#10b981' : '#fcb131',
              color: '#000000',
              fontWeight: 'bold',
              border: '2px solid white',
              boxShadow: showVerifiedOnly
                ? '0 0 15px rgba(16,185,129,0.5)'
                : '0 0 10px rgba(252,177,49,0.3)',
              minWidth: '140px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showVerifiedOnly ? '✓ Verified Only' : '🔍 Show Verified'}
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="bg-[#fcb131] hover:bg-[#f39c12] text-black px-4 py-2 rounded-lg font-bold transition-all duration-200 shadow-lg border-2 border-[#fcb131]"
            title="Refresh leaderboard"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Consistent with main leaderboard styling */}
      <div className="bg-black/80 border-2 border-[#fcb131] rounded-lg p-4 mb-6 shadow-[0_0_20px_rgba(252,177,49,0.5)]">
        <p className="text-[#fcb131] font-bold text-center text-lg">
          🏆 Compete globally and earn your place in the Onchain Olympics! 🏆
        </p>
      </div>

      {/* Push-ups Leaderboard */}
      <div className="mb-8 bg-black/20 rounded-lg p-4 md:p-6 border border-[#fcb131]/30">
        <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-[#fcb131] text-center border-b-2 border-[#fcb131] pb-2">
          💪 Push-ups Champions 💪
        </h3>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-black/60 border border-[#fcb131]/30 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-[#fcb131]">
                <th className="px-4 py-3 text-[#fcb131] font-bold">#</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Athlete</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Total Score</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Networks</th>
              </tr>
            </thead>
            <tbody>
              {sortedPushupUsers.slice(0, 10).map((entry, i) => (
                <tr
                  key={`pushup-${entry.user}-${i}`}
                  className={`text-center border-b border-[#fcb131]/20 last:border-none hover:bg-[#fcb131]/10 transition-colors cursor-pointer ${
                    verificationStatuses[entry.user]
                      ? 'bg-[#10b981]/10 border-l-4 border-l-[#10b981]'
                      : i === 0
                        ? 'bg-[#fcb131]/20'
                        : i === 1
                          ? 'bg-[#fcb131]/15'
                          : i === 2
                            ? 'bg-[#fcb131]/10'
                            : ''
                  }`}
                  onClick={() => handleUserClick(entry.user, 'pushups')}
                >
                  <td className="px-4 py-3 font-bold text-[#fcb131]" style={{ color: '#fcb131' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-2">
                      <span
                        className={`font-bold ${
                          verificationStatuses[entry.user] ? 'text-[#10b981]' : 'text-[#fcb131]'
                        }`}
                        style={{
                          color: verificationStatuses[entry.user] ? '#10b981' : '#fcb131',
                        }}
                      >
                        {progressiveDisplayNames[entry.user] || shortenAddress(entry.user)}
                      </span>
                      <VerificationBadge
                        isVerified={verificationStatuses[entry.user] || false}
                        size="sm"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#fcb131] text-lg">{entry.totalScore}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center space-x-1">
                      {Object.entries(entry.networks).map(([network, score]) => (
                        <div
                          key={network}
                          className={`w-4 h-4 rounded-full ${getNetworkColor(
                            network
                          )} border border-white/20`}
                          title={`${getNetworkName(network)}: ${score}`}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Optimized for small screens */}
        <div className="md:hidden space-y-3 px-2">
          {sortedPushupUsers.slice(0, 10).map((entry, i) => (
            <div
              key={`pushup-mobile-${entry.user}-${i}`}
              className={`bg-black/80 border rounded-lg p-3 cursor-pointer hover:bg-[#fcb131]/10 transition-colors ${
                verificationStatuses[entry.user]
                  ? 'border-[#10b981] bg-[#10b981]/10 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : i === 0
                    ? 'border-[#fcb131] bg-[#fcb131]/10'
                    : 'border-[#fcb131]/50'
              }`}
              onClick={() => handleUserClick(entry.user, 'pushups')}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span
                    className="text-lg flex-shrink-0 text-[#fcb131] font-bold"
                    style={{ color: '#fcb131' }}
                  >
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <div
                        className={`font-bold text-xs truncate ${
                          verificationStatuses[entry.user] ? 'text-[#10b981]' : 'text-[#fcb131]'
                        }`}
                        style={{
                          color: verificationStatuses[entry.user] ? '#10b981' : '#fcb131',
                        }}
                      >
                        {progressiveDisplayNames[entry.user] || shortenAddress(entry.user)}
                      </div>
                      <VerificationBadge
                        isVerified={verificationStatuses[entry.user] || false}
                        size="sm"
                      />
                    </div>
                    <div className="flex space-x-1 mt-1">
                      {Object.entries(entry.networks).map(([network, score]) => (
                        <div
                          key={network}
                          className={`w-2 h-2 rounded-full ${getNetworkColor(
                            network
                          )} flex-shrink-0`}
                          title={`${getNetworkName(network)}: ${score}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-[#fcb131] font-bold text-lg flex-shrink-0 ml-2">
                  {entry.totalScore}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Squats Leaderboard */}
      <div className="mb-6 bg-black/20 rounded-lg p-4 md:p-6 border border-[#fcb131]/30">
        <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-[#fcb131] text-center border-b-2 border-[#fcb131] pb-2">
          🏋️ Squats Champions 🏋️
        </h3>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto bg-black/60 border border-[#fcb131]/30 rounded-lg">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-[#fcb131]">
                <th className="px-4 py-3 text-[#fcb131] font-bold">#</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Athlete</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Total Score</th>
                <th className="px-4 py-3 text-[#fcb131] font-bold">Networks</th>
              </tr>
            </thead>
            <tbody>
              {sortedSquatUsers.slice(0, 10).map((entry, i) => (
                <tr
                  key={`squat-${entry.user}-${i}`}
                  className={`text-center border-b border-[#fcb131]/20 last:border-none hover:bg-[#fcb131]/10 transition-colors cursor-pointer ${
                    verificationStatuses[entry.user]
                      ? 'bg-[#10b981]/10 border-l-4 border-l-[#10b981]'
                      : i === 0
                        ? 'bg-[#fcb131]/20'
                        : i === 1
                          ? 'bg-[#fcb131]/15'
                          : i === 2
                            ? 'bg-[#fcb131]/10'
                            : ''
                  }`}
                  onClick={() => handleUserClick(entry.user, 'squats')}
                >
                  <td className="px-4 py-3 font-bold text-[#fcb131]" style={{ color: '#fcb131' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-2">
                      <span
                        className={`font-bold ${
                          verificationStatuses[entry.user] ? 'text-[#10b981]' : 'text-[#fcb131]'
                        }`}
                        style={{
                          color: verificationStatuses[entry.user] ? '#10b981' : '#fcb131',
                        }}
                      >
                        {progressiveDisplayNames[entry.user] || shortenAddress(entry.user)}
                      </span>
                      <VerificationBadge
                        isVerified={verificationStatuses[entry.user] || false}
                        size="sm"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#fcb131] text-lg">{entry.totalScore}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center space-x-1">
                      {Object.entries(entry.networks).map(([network, score]) => (
                        <div
                          key={network}
                          className={`w-4 h-4 rounded-full ${getNetworkColor(
                            network
                          )} border border-white/20`}
                          title={`${getNetworkName(network)}: ${score}`}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Optimized for small screens */}
        <div className="md:hidden space-y-3 px-2">
          {sortedSquatUsers.slice(0, 10).map((entry, i) => (
            <div
              key={`squat-mobile-${entry.user}-${i}`}
              className={`bg-black/80 border rounded-lg p-3 cursor-pointer hover:bg-[#fcb131]/10 transition-colors ${
                verificationStatuses[entry.user]
                  ? 'border-[#10b981] bg-[#10b981]/10 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : i === 0
                    ? 'border-[#fcb131] bg-[#fcb131]/10'
                    : 'border-[#fcb131]/50'
              }`}
              onClick={() => handleUserClick(entry.user, 'squats')}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span
                    className="text-lg flex-shrink-0 text-[#fcb131] font-bold"
                    style={{ color: '#fcb131' }}
                  >
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <div
                        className={`font-bold text-xs truncate ${
                          verificationStatuses[entry.user] ? 'text-[#10b981]' : 'text-[#fcb131]'
                        }`}
                        style={{
                          color: verificationStatuses[entry.user] ? '#10b981' : '#fcb131',
                        }}
                      >
                        {progressiveDisplayNames[entry.user] || shortenAddress(entry.user)}
                      </div>
                      <VerificationBadge
                        isVerified={verificationStatuses[entry.user] || false}
                        size="sm"
                      />
                    </div>
                    <div className="flex space-x-1 mt-1">
                      {Object.entries(entry.networks).map(([network, score]) => (
                        <div
                          key={network}
                          className={`w-2 h-2 rounded-full ${getNetworkColor(
                            network
                          )} flex-shrink-0`}
                          title={`${getNetworkName(network)}: ${score}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-[#fcb131] font-bold text-lg flex-shrink-0 ml-2">
                  {entry.totalScore}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Breakdown Modal */}
      {selectedUser && breakdownType && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2002]"
          onClick={closeBreakdown}
        >
          <div
            className="bg-black border-2 border-[#fcb131] rounded-lg p-6 max-w-md w-full mx-4 shadow-[0_0_25px_rgba(252,177,49,0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center space-x-2 mb-4">
              <h4
                className={`text-lg font-bold text-center ${
                  verificationStatuses[selectedUser] ? 'text-[#10b981]' : 'text-[#fcb131]'
                }`}
              >
                {progressiveDisplayNames[selectedUser] || shortenAddress(selectedUser)}
              </h4>
              <VerificationBadge
                isVerified={verificationStatuses[selectedUser] || false}
                size="md"
              />
            </div>
            <p className="text-white mb-4 text-center">
              {breakdownType === 'pushups' ? '💪 Push-ups' : '🏋️ Squats'} breakdown by network:
            </p>
            <div className="space-y-2">
              {Object.entries(
                breakdownType === 'pushups'
                  ? pushupAggregated[selectedUser]?.networks || {}
                  : squatAggregated[selectedUser]?.networks || {}
              ).map(([network, score]) => (
                <div
                  key={network}
                  className="flex justify-between items-center bg-black/40 p-2 rounded border border-[#fcb131]/20"
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${getNetworkColor(network)}`} />
                    <span className="text-white font-medium">{getNetworkName(network)}</span>
                  </div>
                  <span className="text-[#fcb131] font-bold">{score}</span>
                </div>
              ))}
            </div>
            <button
              onClick={closeBreakdown}
              className="w-full mt-4 bg-[#fcb131] hover:bg-[#f39c12] text-black font-bold py-2 px-4 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default ExpandedLeaderboardModal;

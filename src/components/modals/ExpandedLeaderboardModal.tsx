'use client';

import React, { useState, useMemo, useEffect } from 'react';
import '@/styles/leaderboard.css';
import '@/styles/expanded-leaderboard.css';
import { shortenAddress } from '@/utils/formatters';
import { AccessibleDialog } from '@/components/ui';
import { Score } from '@/types';
import { useBatchVerificationStatus } from '@/hooks/useBatchVerificationStatus';
import { useFadeTransition } from '@/hooks';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { ProfileDisplay } from '@/components/leaderboard/ProfileDisplay';
import { usePlatform } from '@/contexts/PlatformContext';
import { isChampion } from '@/constants/championTraces';
import {
  getNetworkStyling,
  getMedalStyle,
  aggregateScoresAcrossNetworks,
  sortAggregatedScores,
  getHoverEffects,
  getGoldenGlow,
} from '@/utils/leaderboardUtils';
import { batchResolveFarcasterProfiles, type FarcasterProfile } from '@/utils/neynarResolver';

interface ExpandedLeaderboardModalProps {
  pushupLeaderboard: Score[];
  squatLeaderboard: Score[];
  displayNames: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
  // New prop for profile viewing
  onViewProfile?: (userAddress: string) => void;
}

const ExpandedLeaderboardModal: React.FC<ExpandedLeaderboardModalProps> = ({
  pushupLeaderboard,
  squatLeaderboard,
  displayNames,
  isOpen,
  onClose,
  onViewProfile,
}) => {
  const { isVisible, className: transitionClass } = useFadeTransition(isOpen, 300);
  const { wallet } = usePlatform();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [breakdownType, setBreakdownType] = useState<'pushups' | 'squats' | null>(null);

  // Progressive display names and profiles
  const [progressiveDisplayNames, setProgressiveDisplayNames] =
    useState<Record<string, string>>(displayNames);
  const [farcasterProfiles, setFarcasterProfiles] = useState<Record<string, FarcasterProfile>>({});

  // Get all user addresses for verification check
  const allAddresses = useMemo(() => {
    const addresses = new Set<string>();
    pushupLeaderboard.forEach((entry) => addresses.add(entry.user));
    squatLeaderboard.forEach((entry) => addresses.add(entry.user));
    return Array.from(addresses);
  }, [pushupLeaderboard, squatLeaderboard]);

  const { verificationStatuses } = useBatchVerificationStatus(allAddresses);

  // Resolve profiles when modal opens
  useEffect(() => {
    if (isOpen && allAddresses.length > 0) {
      batchResolveFarcasterProfiles(allAddresses).then((profilesMap) => {
        // Convert Map to Record
        const profilesRecord: Record<string, FarcasterProfile> = {};
        profilesMap.forEach((profile, address) => {
          if (profile) {
            profilesRecord[address] = profile;
          }
        });
        setFarcasterProfiles(profilesRecord);

        // Update display names with Farcaster names if available
        const updatedNames = { ...displayNames };
        profilesMap.forEach((profile, address) => {
          if (profile?.displayName) {
            updatedNames[address] = profile.displayName;
          }
        });
        setProgressiveDisplayNames(updatedNames);
      });
    }
  }, [isOpen, allAddresses, displayNames]);

  const handleRaceClick = (userAddress: string, mode: 'pushups' | 'squats') => {
    console.log(`👻 Triggering race against: ${userAddress} in ${mode} mode`);
    const event = new CustomEvent('raceGhost', {
      detail: { address: userAddress, mode },
    });
    window.dispatchEvent(event);
    onClose();
  };

  if (!isVisible) return null;

  // Filter leaderboards by verification status if enabled
  const filterLeaderboard = (leaderboard: Score[]) => {
    if (!showVerifiedOnly) return leaderboard;
    return leaderboard.filter((entry) => verificationStatuses[entry.user]);
  };

  const filteredPushupLeaderboard = filterLeaderboard(pushupLeaderboard);
  const filteredSquatLeaderboard = filterLeaderboard(squatLeaderboard);

  // Aggregate scores across networks for each user
  const pushupAggregated = aggregateScoresAcrossNetworks(filteredPushupLeaderboard);
  const squatAggregated = aggregateScoresAcrossNetworks(filteredSquatLeaderboard);

  // Sort users by total score
  const sortedPushupUsers = sortAggregatedScores(pushupAggregated);
  const sortedSquatUsers = sortAggregatedScores(squatAggregated);

  const handleUserClick = (user: string, type: 'pushups' | 'squats') => {
    setSelectedUser(user);
    setBreakdownType(type);
  };

  const closeBreakdown = () => {
    setSelectedUser(null);
    setBreakdownType(null);
  };

  // Handle profile view with consistent behavior
  const handleProfileView = (userAddress: string) => {
    if (onViewProfile) {
      onViewProfile(userAddress);
    }
    onClose(); // Close modal when switching to profile view
  };

  // Get dominant network for a user (network with highest score)
  const getDominantNetwork = (networks: Record<string, number>) => {
    if (Object.keys(networks).length === 0) return 'base';
    return Object.entries(networks).sort(([, a], [, b]) => b - a)[0][0];
  };

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="🏆 Onchain Olympians 🏆"
      description="Out of difficulties grow miracles"
      maxWidth="900px"
    >
      {/* Compact Header with main leaderboard aesthetic */}
      <div
        className={`bg-black/80 border-2 border-[#fcb131] rounded-lg p-4 mb-4 shadow-[0_0_20px_rgba(252,177,49,0.5)] ${transitionClass}`}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#fcb131]">🏆 Leaderboard</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className="px-3 py-1 rounded font-bold transition-all duration-200 text-xs shadow"
              title={showVerifiedOnly ? 'Show all users' : 'Show verified users only'}
              style={{
                backgroundColor: showVerifiedOnly ? '#10b981' : '#fcb131',
                color: '#000000',
                border: '1px solid white',
                boxShadow: showVerifiedOnly
                  ? '0 0 8px rgba(16,185,129,0.3)'
                  : '0 0 6px rgba(252,177,49,0.2)',
              }}
            >
              {showVerifiedOnly ? '✓ Verified' : '🔍 Verified'}
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="bg-[#fcb131] hover:bg-[#f39c12] text-black px-3 py-1 rounded font-bold transition-all duration-200 text-xs shadow border border-[#fcb131]"
              title="Refresh leaderboard"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Push-ups Leaderboard - Compact styling */}
      <div className="mb-4 bg-black/20 rounded-lg p-2 md:p-3 border border-[#fcb131]/30 shadow-[0_0_10px_rgba(252,177,49,0.3)] expanded-leaderboard-container">
        <h3 className="text-sm md:text-base font-bold mb-2 text-[#fcb131] text-center border-b border-[#fcb131]/50 pb-1 section-header section-title">
          💪 Push-ups Champions 💪
        </h3>

        {/* Desktop Table View - Enhanced with main leaderboard styling */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full expanded-leaderboard-table">
            <tbody>
              {sortedPushupUsers.slice(0, 5).map((entry, i) => {
                const medalStyle = getMedalStyle(i);
                const dominantNetwork = getDominantNetwork(entry.networks);
                const networkStyle = getNetworkStyling(dominantNetwork);

                return (
                  <tr
                    key={`pushup-${entry.user}-${i}`}
                    className={`text-center transition-all duration-300 ${getHoverEffects()} ${
                      medalStyle.bg
                    } ${networkStyle.borderLeft} hover:${getGoldenGlow()}`}
                    style={{
                      backgroundColor:
                        i < 3
                          ? `${medalStyle.bg.replace('bg-', '').replace('/20', '')}20`
                          : 'rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <td className={`rank-cell ${medalStyle.textColor}`}>
                      <div className="medal-display">
                        <span className="medal-icon">{medalStyle.medal}</span>
                        <span className="rank-number">{i + 1}</span>
                      </div>
                    </td>
                    <td className="profile-cell">
                      <div className="profile-display-compact">
                        <ProfileDisplay
                          userAddress={entry.user}
                          displayName={
                            progressiveDisplayNames[entry.user] || shortenAddress(entry.user)
                          }
                          farcasterProfile={farcasterProfiles[entry.user]}
                          isVerified={verificationStatuses[entry.user] || false}
                          onClick={() => handleProfileView(entry.user)}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className={`score-cell ${medalStyle.textColor}`}>
                      <div className="score-display">{entry.totalScore}</div>
                    </td>
                    <td className="ghost-cell px-2">
                      {(isChampion(entry.user) ||
                        wallet.address?.toLowerCase() === entry.user.toLowerCase()) && (
                        <button
                          onClick={() => handleRaceClick(entry.user, 'pushups')}
                          className="p-1 hover:bg-white/10 rounded-full transition-colors group relative"
                          title="Race against ghost"
                        >
                          <span className="text-lg group-hover:scale-125 transition-transform inline-block">
                            👻
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="network-cell">
                      <div className="network-indicator">
                        <div className={`network-dot ${networkStyle.bg}`} />
                        <span className={networkStyle.text}>{networkStyle.name}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Compact styling */}
        <div className="md:hidden space-y-2 px-1">
          {sortedPushupUsers.slice(0, 10).map((entry, i) => {
            const medalStyle = getMedalStyle(i);
            const dominantNetwork = getDominantNetwork(entry.networks);
            const networkStyle = getNetworkStyling(dominantNetwork);

            return (
              <div
                key={`pushup-mobile-${entry.user}-${i}`}
                className={`expanded-leaderboard-mobile-card border rounded cursor-pointer transition-all duration-300 ${getHoverEffects()} ${
                  verificationStatuses[entry.user]
                    ? `border-[#10b981] bg-[#10b981]/10 ${getGoldenGlow('subtle')}`
                    : medalStyle.border
                } ${medalStyle.bg} ${getGoldenGlow()}`}
                onClick={() => handleUserClick(entry.user, 'pushups')}
                style={{
                  borderColor: verificationStatuses[entry.user]
                    ? '#10b981'
                    : i === 0
                      ? '#fcb131'
                      : i === 1
                        ? '#9ca3af'
                        : i === 2
                          ? '#ea580c'
                          : '#fcb131',
                }}
              >
                <div className="card-content">
                  <div className="medal-section">
                    <span className={`text-base font-bold ${medalStyle.textColor}`}>
                      {medalStyle.medal}
                    </span>
                  </div>
                  <div className="profile-section">
                    <div className="profile-display-compact">
                      <ProfileDisplay
                        userAddress={entry.user}
                        displayName={
                          progressiveDisplayNames[entry.user] || shortenAddress(entry.user)
                        }
                        farcasterProfile={farcasterProfiles[entry.user]}
                        isVerified={verificationStatuses[entry.user] || false}
                        onClick={() => handleProfileView(entry.user)}
                        size="sm"
                      />
                    </div>
                    <div className="network-indicator">
                      <div className={`network-dot ${networkStyle.bg}`} />
                      <span className={networkStyle.text}>{networkStyle.name}</span>
                    </div>
                  </div>
                  <div className="score-section flex items-center space-x-2">
                    <div className={`score-display ${medalStyle.textColor}`}>
                      {entry.totalScore}
                    </div>
                    {(isChampion(entry.user) ||
                      wallet.address?.toLowerCase() === entry.user.toLowerCase()) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRaceClick(entry.user, 'pushups');
                        }}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <span className="text-lg">👻</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Squats Leaderboard - Compact styling */}
      <div className="mb-4 bg-black/20 rounded-lg p-2 md:p-3 border border-[#00a651]/30 shadow-[0_0_10px_rgba(0,166,81,0.3)] expanded-leaderboard-container">
        <h3 className="text-sm md:text-base font-bold mb-2 text-[#00a651] text-center border-b border-[#00a651]/50 pb-1 section-header section-title">
          🏋️ Squats Champions 🏋️
        </h3>

        {/* Desktop Table View - Enhanced with main leaderboard styling */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full">
            <tbody>
              {sortedSquatUsers.slice(0, 5).map((entry, i) => {
                const medalStyle = getMedalStyle(i);
                const dominantNetwork = getDominantNetwork(entry.networks);
                const networkStyle = getNetworkStyling(dominantNetwork);

                return (
                  <tr
                    key={`squat-${entry.user}-${i}`}
                    className={`text-center transition-all duration-300 ${getHoverEffects()} ${
                      medalStyle.bg
                    } ${networkStyle.borderLeft} hover:${getGoldenGlow()}`}
                    style={{
                      backgroundColor:
                        i < 3
                          ? `${medalStyle.bg.replace('bg-', '').replace('/20', '')}20`
                          : 'rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <td className={`px-1 py-1 font-bold text-xs ${medalStyle.textColor}`}>
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-sm">{medalStyle.medal}</span>
                        <span className="text-xs">{i + 1}</span>
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center justify-start">
                        <ProfileDisplay
                          userAddress={entry.user}
                          displayName={
                            progressiveDisplayNames[entry.user] || shortenAddress(entry.user)
                          }
                          farcasterProfile={farcasterProfiles[entry.user]}
                          isVerified={verificationStatuses[entry.user] || false}
                          onClick={() => handleProfileView(entry.user)}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className={`px-1 py-1 font-bold text-center ${medalStyle.textColor}`}>
                      <div className="flex items-center justify-center">
                        <span className="text-sm font-bold">{entry.totalScore}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 text-center">
                      {(isChampion(entry.user) ||
                        wallet.address?.toLowerCase() === entry.user.toLowerCase()) && (
                        <button
                          onClick={() => handleRaceClick(entry.user, 'squats')}
                          className="p-1 hover:bg-white/10 rounded-full transition-colors group"
                          title="Race against ghost"
                        >
                          <span className="text-lg group-hover:scale-125 transition-transform inline-block">
                            👻
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center justify-end space-x-1">
                        <div
                          className={`w-2 h-2 rounded-full ${networkStyle.bg} border border-white/30`}
                        />
                        <span className={`font-bold text-xs ${networkStyle.text}`}>
                          {networkStyle.name}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Enhanced with main leaderboard styling */}
        <div className="md:hidden space-y-3 px-2">
          {sortedSquatUsers.slice(0, 10).map((entry, i) => {
            const medalStyle = getMedalStyle(i);
            const dominantNetwork = getDominantNetwork(entry.networks);
            const networkStyle = getNetworkStyling(dominantNetwork);

            return (
              <div
                key={`squat-mobile-${entry.user}-${i}`}
                className={`expanded-leaderboard-mobile-card border rounded cursor-pointer transition-all duration-300 ${getHoverEffects()} ${
                  verificationStatuses[entry.user]
                    ? `border-[#10b981] bg-[#10b981]/10 ${getGoldenGlow('subtle')}`
                    : medalStyle.border
                } ${medalStyle.bg} ${getGoldenGlow()}`}
                onClick={() => handleUserClick(entry.user, 'squats')}
                style={{
                  borderColor: verificationStatuses[entry.user]
                    ? '#10b981'
                    : i === 0
                      ? '#fcb131'
                      : i === 1
                        ? '#9ca3af'
                        : i === 2
                          ? '#ea580c'
                          : '#fcb131',
                }}
              >
                <div className="card-content">
                  <div className="medal-section">
                    <span className={`text-base font-bold ${medalStyle.textColor}`}>
                      {medalStyle.medal}
                    </span>
                  </div>
                  <div className="profile-section">
                    <div className="profile-display-compact">
                      <ProfileDisplay
                        userAddress={entry.user}
                        displayName={
                          progressiveDisplayNames[entry.user] || shortenAddress(entry.user)
                        }
                        farcasterProfile={farcasterProfiles[entry.user]}
                        isVerified={verificationStatuses[entry.user] || false}
                        onClick={() => handleProfileView(entry.user)}
                        size="sm"
                      />
                    </div>
                    <div className="network-indicator">
                      <div className={`network-dot ${networkStyle.bg}`} />
                      <span className={networkStyle.text}>{networkStyle.name}</span>
                    </div>
                  </div>
                  <div className="score-section flex items-center space-x-2">
                    <div className={`score-display ${medalStyle.textColor}`}>
                      {entry.totalScore}
                    </div>
                    {(isChampion(entry.user) ||
                      wallet.address?.toLowerCase() === entry.user.toLowerCase()) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRaceClick(entry.user, 'squats');
                        }}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <span className="text-lg">👻</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedUser && breakdownType && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2002] transition-opacity duration-300"
          onClick={closeBreakdown}
        >
          <div
            className="bg-black/90 backdrop-blur-xl border border-[#fcb131]/30 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-[#fcb131]/10 transform transition-all scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <ProfileDisplay
                  userAddress={selectedUser}
                  displayName={
                    progressiveDisplayNames[selectedUser] || shortenAddress(selectedUser)
                  }
                  farcasterProfile={farcasterProfiles[selectedUser]}
                  isVerified={verificationStatuses[selectedUser] || false}
                  size="md"
                  className="justify-center"
                />
              </div>
              <p className="text-[#fcb131] text-sm font-bold tracking-wide uppercase opacity-90">
                {breakdownType === 'pushups' ? '💪 Push-ups' : '🏋️ Squats'} performance
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {Object.entries(
                breakdownType === 'pushups'
                  ? pushupAggregated[selectedUser]?.networks || {}
                  : squatAggregated[selectedUser]?.networks || {}
              ).map(([network, score]) => {
                const networkStyle = getNetworkStyling(network);
                return (
                  <div
                    key={network}
                    className={`flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:border-[#fcb131]/30 transition-all duration-200 group`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${networkStyle.bg} shadow-lg shadow-${networkStyle.bg.replace('bg-', '')}/50`}
                      />
                      <span className="text-gray-300 font-medium group-hover:text-white transition-colors">
                        {networkStyle.name}
                      </span>
                    </div>
                    <span className="text-white font-black text-xl tracking-tight">{score}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={closeBreakdown}
              className="w-full bg-gradient-to-r from-[#fcb131] to-[#f59e0b] hover:from-[#f59e0b] hover:to-[#fcb131] text-black font-black py-4 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/20 active:scale-[0.98]"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </AccessibleDialog>
  );
};

export default ExpandedLeaderboardModal;

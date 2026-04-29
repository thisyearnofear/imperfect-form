'use client';

import React from 'react';
import { type EnhancedProfile } from '@/hooks/useEnhancedProfile';
import { usePlatform } from '@/contexts/PlatformContext';
import { useXpProgress } from '@/hooks/useXpProgress';
import { XpProgressBar } from './XpProgressBar';
import { DailyQuests } from './DailyQuests';
import { Roadmap } from './Roadmap';

interface ProfileDisplayProps {
  profile?: EnhancedProfile;
  loading?: boolean;
  isCurrentUser?: boolean;
}

export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  profile,
  loading = false,
  isCurrentUser = false,
}) => {
  const { wallet, user: farcasterUser } = usePlatform();
  const { progress, pbs, workouts } = useXpProgress();

  const LoadingSpinner = () => (
    <div className="inline-flex items-center space-x-1">
      <div className="animate-spin text-xs">⚡</div>
      <span className="animate-pulse">Loading...</span>
    </div>
  );

  // Show loading state while loading
  if (loading) {
    return (
      <div className="space-y-1">
        <div className="profile-instruction">
          <span className="button-text start">LOADING</span> ={' '}
          <span className="text-[#fcb131]">Retrieving profile data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Show loading indicator while loading */}
      {loading && (
        <div className="profile-instruction">
          <span className="button-text start">LOADING</span> ={' '}
          <span className="text-[#fcb131]">Retrieving profile data...</span>
        </div>
      )}

      {/* Show profile data when available */}
      {!loading && profile && (
        <>
          {/* XP & Leveling - Only for current user or if profile has XP data */}
          {isCurrentUser && (
            <div className="mb-6 mt-2 p-4 bg-black/40 border border-gray-800 rounded-xl backdrop-blur-sm">
              <XpProgressBar
                progress={progress.progressToNextLevel}
                currentLevel={progress.currentLevel}
                xpToNextLevel={progress.xpToNextLevel}
              />

              <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase font-mono tracking-tighter">
                    Personal Best: Pushups
                  </div>
                  <div className="text-lg font-bold text-[#fcb131]">
                    {pbs.pushups} <span className="text-xs font-normal text-gray-400">reps</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase font-mono tracking-tighter">
                    Personal Best: Squats
                  </div>
                  <div className="text-lg font-bold text-[#fcb131]">
                    {pbs.squats} <span className="text-xs font-normal text-gray-400">reps</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex justify-between items-center text-[10px] font-mono text-gray-400 uppercase">
                <span>Total Workouts: {workouts.length}</span>
                <span>Total XP: {progress.totalXp}</span>
              </div>
            </div>
          )}

          {isCurrentUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DailyQuests />
              <Roadmap />
            </div>
          )}

          {/* Social context */}
          {profile.mutualConnections && profile.mutualConnections.length > 0 && (
            <div className="profile-instruction">
              <span className="text-[#10b981] text-xs">
                🤝 {profile.mutualConnections.length} mutual connections
              </span>
            </div>
          )}

          {/* Wallet */}
          <p className="profile-instruction">
            <span className="button-text start">WALLET</span> ={' '}
            <span
              className="text-[#fcb131] font-mono cursor-pointer hover:text-yellow-400 transition-all duration-200 transform hover:scale-105"
              onClick={() =>
                navigator.clipboard.writeText(
                  profile.walletInfo?.address ||
                    wallet?.address ||
                    '0x55A5705453Ee82c742274154136Fce8149597058'
                )
              }
            >
              {profile.walletInfo?.address
                ? `${profile.walletInfo.address.slice(0, 6)}...${profile.walletInfo.address.slice(-4)}`
                : wallet?.address
                  ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                  : '0x55A5...7058'}
            </span>
          </p>

          {/* Farcaster */}
          <p className="profile-instruction">
            <span className="button-text stop">🟣 FARCASTER</span> ={' '}
            <span
              className="text-purple-300 cursor-pointer hover:text-purple-100 transition-all duration-200 transform hover:scale-105"
              onClick={() => {
                const farcasterIdentity = profile.identities.find(
                  (id) => id.platform === 'farcaster'
                );
                const username = farcasterIdentity?.username || farcasterUser?.username || 'papa';
                window.open(`https://farcaster.xyz/${username}`, '_blank');
              }}
            >
              {profile.socialStats?.farcasterFollowers?.toLocaleString() || '0'} followers
            </span>
          </p>

          {/* Twitter */}
          <p className="profile-instruction">
            <span className="button-text reset">🐦 TWITTER</span> ={' '}
            <span
              className="text-blue-300 cursor-pointer hover:text-blue-100 transition-all duration-200 transform hover:scale-105"
              onClick={() => {
                const twitterIdentity = profile.identities.find((id) => id.platform === 'twitter');
                const username = twitterIdentity?.username || 'unknown';
                window.open(`https://x.com/${username}`, '_blank');
              }}
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                `${profile.socialStats?.twitterFollowers?.toLocaleString() || '0'} followers`
              )}
            </span>
          </p>

          {/* Lens */}
          <p className="profile-instruction">
            <span className="button-text fun-highlight">👁️ LENS</span> ={' '}
            <span
              className="text-cyan-300 cursor-pointer hover:text-cyan-100 transition-all duration-200 transform hover:scale-105"
              onClick={() => {
                const lensIdentity = profile.identities.find((id) => id.platform === 'lens');
                const username = lensIdentity?.username || 'unknown';
                window.open(`https://hey.xyz/u/${username}`, '_blank');
              }}
            >
              {loading ? (
                <LoadingSpinner />
              ) : (
                `${profile.socialStats?.lensFollowers?.toLocaleString() || '0'} followers`
              )}
            </span>
          </p>
        </>
      )}
    </div>
  );
};

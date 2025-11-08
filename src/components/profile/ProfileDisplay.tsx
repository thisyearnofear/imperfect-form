'use client';

import React from 'react';
import { type EnhancedProfile } from '@/hooks/useEnhancedProfile';
import { usePlatform } from '@/contexts/PlatformContext';

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

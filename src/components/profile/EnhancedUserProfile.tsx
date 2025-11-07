/**
 * Enhanced User Profile Component
 *
 * Displays comprehensive user identity information from Memory Protocol,
 * including cross-platform identities, social stats, and verification status.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { getMemoryClient, type IdentityNode, type SocialProfile } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';
import ErrorBoundary from '@/utils/errorBoundary';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('EnhancedUserProfile');

interface EnhancedUserProfileProps {
  userIdentifier?: string | number; // wallet address, fid, or username
  showSocialStats?: boolean;
  showIdentities?: boolean;
  compact?: boolean;
  className?: string;
}

interface PlatformIconProps {
  platform: string;
  size?: number;
  className?: string;
}

function PlatformIcon({ platform, size = 20, className = '' }: PlatformIconProps) {
  const iconClass = `inline-block ${className}`;

  switch (platform.toLowerCase()) {
    case 'farcaster':
      return <span className={`${iconClass} text-purple-500`}>🟣</span>;
    case 'twitter':
    case 'x':
      return <span className={`${iconClass} text-blue-500`}>🐦</span>;
    case 'github':
      return <span className={`${iconClass} text-gray-700`}>🐙</span>;
    case 'lens':
      return <span className={`${iconClass} text-green-500`}>👁️</span>;
    case 'ens':
      return <span className={`${iconClass} text-blue-600`}>🌐</span>;
    case 'ethereum':
      return <span className={`${iconClass} text-gray-600`}>Ξ</span>;
    case 'talent-protocol':
      return <span className={`${iconClass} text-orange-500`}>🎭</span>;
    default:
      return <span className={`${iconClass} text-gray-500`}>🔗</span>;
  }
}

function EnhancedUserProfile({
  userIdentifier,
  showSocialStats = true,
  showIdentities = true,
  compact = false,
  className = '',
}: EnhancedUserProfileProps) {
  const { wallet, user: farcasterUser } = usePlatform();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [earnings, setEarnings] = useState<{
    totalEarned: number;
    weeklyEarnings: number;
    dataQueries: number;
    lastPayout: string;
  } | null>(null);
  const [profile, setProfile] = useState<{
    identities: IdentityNode[];
    primaryIdentity?: IdentityNode;
    socialStats: {
      totalFollowers: number;
      platforms: string[];
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine identifier to use
  const identifier =
    userIdentifier || wallet.address || farcasterUser?.username || farcasterUser?.fid;

  logger.info('EnhancedUserProfile identifier determination', {
    userIdentifier,
    walletAddress: wallet.address,
    farcasterUsername: farcasterUser?.username,
    farcasterFid: farcasterUser?.fid,
    finalIdentifier: identifier,
    identifierType: typeof identifier,
  });

  useEffect(() => {
    logger.info('EnhancedUserProfile useEffect triggered', { identifier });

    if (!identifier) {
      logger.warn('No identifier available for enhanced profile lookup');
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const client = getMemoryClient();
        if (!client) {
          throw new Error('Memory API not configured. Enhanced profile features are disabled.');
        }
        const profileData = await client.getEnhancedUserProfile(identifier, {
          walletAddress: wallet.address || undefined,
        });
        setProfile(profileData);

        // Fetch earnings data if we have a wallet address
        if (wallet.address) {
          try {
            const earningsData = await client.getEarnings(wallet.address);
            setEarnings(earningsData);
            logger.info('Earnings data loaded', { walletAddress: wallet.address, earningsData });
          } catch (earningsError) {
            logger.warn('Failed to load earnings data', { error: earningsError });
            // Don't fail the whole profile load if earnings fail
          }
        }

        logger.info('Enhanced profile loaded', {
          identifier,
          identitiesCount: profileData.identities.length,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
        setError(errorMessage);
        logger.error('Failed to load enhanced profile', { error: err, identifier });

        // Provide more specific error messages to the user
        if (errorMessage.includes('404')) {
          toast.error(
            'Profile not found in Memory Protocol. This user may not have connected their identities yet.'
          );
        } else if (errorMessage.includes('API key')) {
          toast.error('Memory Protocol API key error. Please check the API configuration.');
        } else {
          toast.error(`Failed to load enhanced profile: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [identifier]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Spinner />
        <span className="ml-2 text-[#fcb131]">Loading profile...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-4 text-red-400 ${className}`}>
        <p>⚠️ Failed to load enhanced profile</p>
        <p className="text-xs opacity-70">{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={`text-center p-4 text-gray-400 ${className}`}>
        <p>No profile data available</p>
      </div>
    );
  }

  if (compact) {
    // Find primary social platforms for display
    const farcasterIdentity = profile.identities.find((id) => id.platform === 'farcaster');
    const twitterIdentity = profile.identities.find((id) => id.platform === 'twitter');
    const lensIdentity = profile.identities.find((id) => id.platform === 'lens');

    return (
      <div
        className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg touch-manipulation ${className}`}
      >
        {/* Header with Avatar and Name */}
        <div className="flex items-center space-x-3 mb-3">
          {profile.primaryIdentity?.avatar ? (
            <img
              src={profile.primaryIdentity.avatar}
              alt="Profile"
              className="w-12 h-12 rounded-full border-2 border-[#fcb131] shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#fcb131] to-orange-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">
                {(profile.primaryIdentity?.username ||
                  profile.primaryIdentity?.id ||
                  'U')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-lg truncate">
              {profile.primaryIdentity?.username || profile.primaryIdentity?.id}
            </h3>
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <PlatformIcon platform={profile.primaryIdentity?.platform || 'ethereum'} size={12} />
              <span className="capitalize">{profile.primaryIdentity?.platform || 'ethereum'}</span>
            </div>
          </div>
        </div>

        {/* Social Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-[#fcb131]">
              {profile.socialStats.totalFollowers.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Followers</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-blue-400">
              {profile.socialStats.platforms.length}
            </div>
            <div className="text-xs text-gray-400">Platforms</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-400">{profile.identities.length}</div>
            <div className="text-xs text-gray-400">Identities</div>
          </div>
        </div>

        {/* Earnings Display */}
        {earnings && (
          <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-700/30 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-green-400">💰</span>
                <span className="text-sm font-semibold text-green-400">Data Earnings</span>
              </div>
              <span className="text-xs text-gray-400">Powered by Memory</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-green-300 font-medium">${earnings.totalEarned.toFixed(4)}</div>
                <div className="text-gray-400">Total Earned</div>
              </div>
              <div>
                <div className="text-blue-300 font-medium">
                  ${earnings.weeklyEarnings.toFixed(4)}
                </div>
                <div className="text-gray-400">This Week</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {earnings.dataQueries} queries served • Last payout: {earnings.lastPayout || 'Never'}
            </div>
          </div>
        )}

        {/* Key Platform Highlights & Expand Toggle */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            {farcasterIdentity && (
              <div className="flex items-center space-x-1">
                <PlatformIcon platform="farcaster" size={10} />
                <span className="text-gray-300">
                  {farcasterIdentity.social?.followers?.toLocaleString() || 0}
                </span>
              </div>
            )}
            {twitterIdentity && (
              <div className="flex items-center space-x-1">
                <PlatformIcon platform="twitter" size={10} />
                <span className="text-gray-300">
                  {twitterIdentity.social?.followers?.toLocaleString() || 0}
                </span>
              </div>
            )}
            {lensIdentity && (
              <div className="flex items-center space-x-1">
                <PlatformIcon platform="lens" size={10} />
                <span className="text-gray-300">
                  {lensIdentity.social?.followers?.toLocaleString() || 0}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 text-xs">Powered by Memory</span>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[#fcb131] hover:text-yellow-400 text-xs font-medium transition-colors"
            >
              {expanded ? 'Less' : 'More'} →
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-700 animate-in slide-in-from-top-2 duration-200">
            <h4 className="text-sm font-semibold text-white mb-3">Connected Identities</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {profile.identities.map((identity, index) => (
                <div
                  key={`${identity.platform}-${identity.id}-${index}`}
                  className="flex items-center justify-between bg-gray-800/30 rounded-lg p-2"
                >
                  <div className="flex items-center space-x-2">
                    <PlatformIcon platform={identity.platform} size={16} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {identity.username || identity.id}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">{identity.platform}</div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    {identity.social?.followers && (
                      <div>{identity.social.followers.toLocaleString()} followers</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700 text-center">
              <a
                href="https://memoryproto.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#fcb131] hover:text-yellow-400 text-xs transition-colors inline-flex items-center space-x-1"
              >
                <span>🔗 Enhanced by Memory Protocol</span>
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-6 border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        {profile.primaryIdentity?.avatar && (
          <img
            src={profile.primaryIdentity.avatar}
            alt="Profile"
            className="w-16 h-16 rounded-full border-2 border-[#fcb131]"
          />
        )}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-[#fcb131]">
            {profile.primaryIdentity?.username || profile.primaryIdentity?.id}
          </h2>
          {profile.primaryIdentity?.platform && (
            <div className="flex items-center space-x-2">
              <PlatformIcon platform={profile.primaryIdentity.platform} />
              <span className="text-sm text-gray-400 capitalize">
                {profile.primaryIdentity.platform}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Social Stats */}
      {showSocialStats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#fcb131]">
              {profile.socialStats.totalFollowers.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">Total Followers</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#fcb131]">
              {profile.socialStats.platforms.length}
            </div>
            <div className="text-sm text-gray-400">Platforms</div>
          </div>
        </div>
      )}

      {/* Identity List */}
      {showIdentities && (
        <div>
          <h3 className="text-lg font-semibold text-[#fcb131] mb-3">Connected Identities</h3>
          <div className="space-y-3">
            {profile.identities.map((identity, index) => (
              <div
                key={`${identity.platform}-${identity.id}-${index}`}
                className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
              >
                <div className="flex items-center space-x-3">
                  <PlatformIcon platform={identity.platform} size={24} />
                  <div>
                    <div className="font-medium text-white">{identity.username || identity.id}</div>
                    <div className="text-sm text-gray-400 capitalize">
                      {identity.platform}
                      {identity.social?.verified && (
                        <span className="ml-2 text-green-400">✓ Verified</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-400">
                  {identity.social?.followers && (
                    <div>{identity.social.followers.toLocaleString()} followers</div>
                  )}
                  {identity.sources.length > 0 && <div>{identity.sources.length} connections</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory Protocol Attribution */}
      <div className="mt-6 pt-4 border-t border-gray-700 text-center text-xs text-gray-500">
        Enhanced by{' '}
        <a
          href="https://memoryproto.co"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#fcb131] hover:underline"
        >
          Memory Protocol
        </a>
      </div>
    </div>
  );
}

// Wrap with error boundary for additional safety
const EnhancedUserProfileWithBoundary = (props: EnhancedUserProfileProps) => (
  <ErrorBoundary>
    <EnhancedUserProfile {...props} />
  </ErrorBoundary>
);

// Export individual components for reuse
export { PlatformIcon };
export default EnhancedUserProfileWithBoundary;

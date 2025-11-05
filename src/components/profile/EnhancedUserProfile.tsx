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

export default function EnhancedUserProfile({
  userIdentifier,
  showSocialStats = true,
  showIdentities = true,
  compact = false,
  className = '',
}: EnhancedUserProfileProps) {
  const { wallet, user: farcasterUser } = usePlatform();
  const [loading, setLoading] = useState(false);
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
        const profileData = await client.getEnhancedUserProfile(identifier);
        setProfile(profileData);
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
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {profile.primaryIdentity?.avatar && (
          <img
            src={profile.primaryIdentity.avatar}
            alt="Profile"
            className="w-10 h-10 rounded-full border-2 border-[#fcb131]"
          />
        )}
        <div className="flex-1">
          <h3 className="font-bold text-[#fcb131]">
            {profile.primaryIdentity?.username || profile.primaryIdentity?.id}
          </h3>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>{profile.socialStats.totalFollowers} followers</span>
            <span>•</span>
            <span>{profile.socialStats.platforms.length} platforms</span>
          </div>
        </div>
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

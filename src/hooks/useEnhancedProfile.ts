/**
 * Enhanced Profile Hook
 *
 * Modularized Memory Protocol integration for user profile data.
 * Provides reusable profile fetching, caching, and state management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getMemoryClient, type IdentityNode } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('useEnhancedProfile');

export interface EnhancedProfile {
  identifier: string;
  walletAddress?: string;
  identities: IdentityNode[];
  primaryIdentity?: IdentityNode;
  socialStats: {
    totalFollowers: number;
    platforms: string[];
    farcasterFollowers?: number;
    twitterFollowers?: number;
    lensFollowers?: number;
  };
  walletInfo: {
    address?: string;
    ensName?: string;
    basename?: string;
  };
  mutualConnections?: string[];
  loadedAt: number;
}

interface ProfileCache {
  [key: string]: {
    data: EnhancedProfile;
    timestamp: number;
  };
}

// Global cache to persist across component unmounts
const profileCache: ProfileCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useEnhancedProfile = (identifier?: string) => {
  const [profile, setProfile] = useState<EnhancedProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the current request to prevent race conditions
  const currentRequestRef = useRef<string | null>(null);

  // Clear profile when identifier changes
  useEffect(() => {
    if (!identifier) {
      setProfile(null);
      setError(null);
      return;
    }

    // Check cache first
    const normalizedId = identifier.toLowerCase();
    const cached = profileCache[normalizedId];

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.info('Using cached profile data', { identifier: normalizedId });
      setProfile(cached.data);
      setError(null);
      return;
    }

    // Load fresh data if not cached or expired
    loadProfile(identifier);
  }, [identifier]);

  const loadProfile = useCallback(async (targetIdentifier: string) => {
    if (!targetIdentifier) {
      setProfile(null);
      setError(null);
      return;
    }

    const normalizedId = targetIdentifier.toLowerCase();
    currentRequestRef.current = normalizedId;

    setLoading(true);
    setError(null);

    try {
      logger.info('Loading enhanced profile', { identifier: targetIdentifier });

      const client = getMemoryClient();
      if (!client) {
        // If Memory API is not configured, create a basic profile with available information
        logger.warn('Memory API not configured, creating basic profile with identifier only', {
          identifier: targetIdentifier,
        });
        const basicProfile: EnhancedProfile = {
          identifier: targetIdentifier,
          identities: [],
          primaryIdentity: undefined,
          socialStats: {
            totalFollowers: 0,
            platforms: [],
          },
          walletInfo: {
            address: targetIdentifier.startsWith('0x') ? targetIdentifier : undefined,
          },
          mutualConnections: [],
          loadedAt: Date.now(),
        };
        setProfile(basicProfile);
        return; // Exit early, don't continue with API calls
      }

      // Try to get identity graph by different methods
      let identityGraph: { identities: IdentityNode[] };

      if (targetIdentifier.startsWith('0x') && targetIdentifier.length === 42) {
        // Wallet address
        identityGraph = await client.getIdentityGraphByWallet(targetIdentifier);
      } else if (targetIdentifier.includes('.eth') || targetIdentifier.includes('.base.eth')) {
        // ENS/Basename - try wallet lookup first, then direct
        try {
          identityGraph = await client.getIdentityGraphByWallet(targetIdentifier);
        } catch {
          identityGraph = await client.getIdentityGraphByFarcasterUsername(targetIdentifier);
        }
      } else if (!isNaN(Number(targetIdentifier))) {
        // Farcaster ID (FID)
        identityGraph = await client.getIdentityGraphByFarcasterId(Number(targetIdentifier));
      } else {
        // Username - try Farcaster first
        identityGraph = await client.getIdentityGraphByFarcasterUsername(targetIdentifier);
      }

      // Check if request is still current
      if (currentRequestRef.current !== normalizedId) {
        logger.info('Request superseded, ignoring result', {
          current: currentRequestRef.current,
          requested: normalizedId,
        });
        return;
      }

      // Process the identity graph
      // The API returns an array of identities directly, not in an object wrapper
      // So identityGraph is actually an array of IdentityNode[] rather than { identities: IdentityNode[] }
      let identities: IdentityNode[] = [];

      // Handle different possible response formats
      if (Array.isArray(identityGraph)) {
        // If identityGraph is directly an array of identities (current API format)
        identities = identityGraph;
      } else if (
        identityGraph &&
        typeof identityGraph === 'object' &&
        Array.isArray(identityGraph.identities)
      ) {
        // If identityGraph is an object with an identities property (older expected format)
        identities = identityGraph.identities;
      } else {
        // If neither format matches, use empty array
        logger.warn('Unexpected identity graph format, using empty array', { identityGraph });
        identities = [];
      }

      // Find primary identity (prioritize Farcaster, then most sources)
      const primaryIdentity =
        identities.find((id) => id.platform === 'farcaster') ||
        identities.find((id) => id.sources?.length > 0) ||
        identities[0];

      // Extract social stats
      const socialStats = {
        totalFollowers: identities.reduce((total, id) => total + (id.social?.followers || 0), 0),
        platforms: [...new Set(identities.map((id) => id.platform))],
        farcasterFollowers: identities.find((id) => id.platform === 'farcaster')?.social?.followers,
        twitterFollowers: identities.find((id) => id.platform === 'twitter')?.social?.followers,
        lensFollowers: identities.find((id) => id.platform === 'lens')?.social?.followers,
      };

      // Extract wallet information
      const walletInfo = {
        address:
          identities.find((id) => id.platform === 'ethereum')?.id ||
          (targetIdentifier.startsWith('0x') ? targetIdentifier : undefined),
        ensName: identities.find((id) => id.platform === 'ens')?.id,
        basename: identities.find((id) => id.platform === 'basenames')?.id,
      };

      const enhancedProfile: EnhancedProfile = {
        identifier: targetIdentifier,
        walletAddress: walletInfo.address,
        identities,
        primaryIdentity,
        socialStats,
        walletInfo,
        mutualConnections: [], // TODO: Implement mutual connections logic
        loadedAt: Date.now(),
      };

      // Cache the result
      profileCache[normalizedId] = {
        data: enhancedProfile,
        timestamp: Date.now(),
      };

      setProfile(enhancedProfile);
      logger.info('Enhanced profile loaded successfully', {
        identifier: targetIdentifier,
        platforms: socialStats.platforms,
        totalFollowers: socialStats.totalFollowers,
      });
    } catch (err) {
      if (currentRequestRef.current !== normalizedId) {
        // Request was superseded
        return;
      }

      const errorMessage =
        err instanceof Error
          ? err.message.includes('not found') || err.message.includes('404')
            ? 'Profile not found. Please check the address or ENS name and try again.'
            : err.message
          : 'Unknown error loading profile';
      logger.error('Failed to load enhanced profile', {
        identifier: targetIdentifier,
        error: errorMessage,
      });
      setError(errorMessage);
      // Re-throw for debugging purposes to see the actual error
      console.error('Enhanced profile error:', err);
      // Create a basic profile instead of setting to null to ensure UI has data to display
      const basicProfile: EnhancedProfile = {
        identifier: targetIdentifier,
        identities: [],
        primaryIdentity: undefined,
        socialStats: {
          totalFollowers: 0,
          platforms: [],
        },
        walletInfo: {
          address: targetIdentifier.startsWith('0x') ? targetIdentifier : undefined,
        },
        mutualConnections: [],
        loadedAt: Date.now(),
      };
      setProfile(basicProfile);
    } finally {
      if (currentRequestRef.current === normalizedId) {
        setLoading(false);
      }
    }
  }, []);

  const refreshProfile = useCallback(() => {
    if (profile?.identifier) {
      // Clear cache for this identifier to force a fresh fetch
      const normalizedId = profile.identifier.toLowerCase();
      delete profileCache[normalizedId];

      // Reload the same profile (refresh)
      loadProfile(profile.identifier);
    }
  }, [profile?.identifier, loadProfile]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    setLoading(false);
    currentRequestRef.current = null;
  }, []);

  return {
    profile,
    loading,
    error,
    loadProfile,
    refreshProfile,
    clearProfile,
    // Helper functions for UI
    hasData: !!profile,
    isInitial: !profile && !loading && !error,
  };
};

// Helper hook for multiple profiles (for leaderboard use)
export const useMultipleProfiles = (identifiers: string[]) => {
  const [profiles, setProfiles] = useState<{ [key: string]: EnhancedProfile }>({});
  const [loading, setLoading] = useState(false);

  const loadProfiles = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    setLoading(true);
    const results: { [key: string]: EnhancedProfile } = {};

    // Load profiles in parallel (limit concurrency to avoid rate limits)
    const batchSize = 3;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);

      const promises = batch.map(async (id) => {
        try {
          const client = getMemoryClient();
          if (!client) return null;

          const normalizedId = id.toLowerCase();

          // Check cache first
          const cached = profileCache[normalizedId];
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return { id, profile: cached.data };
          }

          // Load fresh data
          let identityGraph;
          if (id.startsWith('0x')) {
            identityGraph = await client.getIdentityGraphByWallet(id);
          } else {
            identityGraph = await client.getIdentityGraphByFarcasterUsername(id);
          }

          if (identityGraph?.identities) {
            const profile: EnhancedProfile = {
              identifier: id,
              identities: identityGraph.identities,
              primaryIdentity:
                identityGraph.identities.find((i) => i.platform === 'farcaster') ||
                identityGraph.identities[0],
              socialStats: {
                totalFollowers: identityGraph.identities.reduce(
                  (total, i) => total + (i.social?.followers || 0),
                  0
                ),
                platforms: [...new Set(identityGraph.identities.map((i) => i.platform))],
              },
              walletInfo: {
                address: id.startsWith('0x')
                  ? id
                  : identityGraph.identities.find((i) => i.platform === 'ethereum')?.id,
              },
              mutualConnections: [], // TODO: Implement mutual connections logic
              loadedAt: Date.now(),
            };

            // Cache it
            profileCache[normalizedId] = { data: profile, timestamp: Date.now() };
            return { id, profile };
          }
        } catch (error) {
          logger.warn('Failed to load profile in batch', { id, error });
        }
        return null;
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach((result) => {
        if (result) {
          results[result.id] = result.profile;
        }
      });
    }

    setProfiles(results);
    setLoading(false);
  }, []);

  return { profiles, loading, loadProfiles };
};

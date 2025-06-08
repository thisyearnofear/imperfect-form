/**
 * Neynar API utilities for resolving Farcaster profiles from wallet addresses
 * This provides more detailed Farcaster profile information than web3bio
 */

import { createRemoteLogger } from './remoteLogger';

const logger = createRemoteLogger('NeynarResolver');

// Cache for resolved profiles to avoid repeated API calls
const profileCache: Record<string, FarcasterProfile | null> = {};

export interface FarcasterProfile {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
  verifiedAddresses: string[];
}

/**
 * Resolve wallet address to Farcaster profile using Neynar API
 * @param address Ethereum wallet address
 * @returns Farcaster profile if found, null otherwise
 */
export async function resolveFarcasterProfile(address: string): Promise<FarcasterProfile | null> {
  // Return from cache if available
  if (profileCache[address] !== undefined) {
    return profileCache[address];
  }

  try {
    // Call Neynar API to resolve address to Farcaster profile
    const response = await fetch(`/api/farcaster/resolve-address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Address not found - cache null result
        profileCache[address] = null;
        return null;
      }
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.profile) {
      const profile: FarcasterProfile = {
        fid: data.profile.fid,
        username: data.profile.username,
        displayName: data.profile.display_name || data.profile.username,
        pfpUrl: data.profile.pfp_url,
        bio: data.profile.profile?.bio?.text,
        followerCount: data.profile.follower_count,
        followingCount: data.profile.following_count,
        verifiedAddresses: data.profile.verified_addresses?.eth_addresses || [],
      };

      // Cache the result
      profileCache[address] = profile;
      
      logger.info('🎭 Resolved Farcaster profile', {
        address,
        username: profile.username,
        fid: profile.fid
      });

      return profile;
    }

    // No profile found - cache null result
    profileCache[address] = null;
    return null;

  } catch (error) {
    logger.warn('🎭 Failed to resolve Farcaster profile', { address, error });
    
    // Cache null result to avoid repeated failed calls
    profileCache[address] = null;
    return null;
  }
}

/**
 * Get enhanced display name with Farcaster profile information
 * @param address Ethereum wallet address
 * @returns Enhanced display name with Farcaster info if available
 */
export async function getEnhancedDisplayName(address: string): Promise<{
  displayName: string;
  isFarcaster: boolean;
  profile?: FarcasterProfile;
}> {
  // First try Farcaster resolution
  const farcasterProfile = await resolveFarcasterProfile(address);
  
  if (farcasterProfile) {
    return {
      displayName: `@${farcasterProfile.username}`,
      isFarcaster: true,
      profile: farcasterProfile,
    };
  }

  // Fallback to existing web3bio resolution
  try {
    const { getBestDisplayName } = await import('./web3bio');
    const displayName = await getBestDisplayName(address);
    
    return {
      displayName,
      isFarcaster: false,
    };
  } catch {
    // Final fallback to shortened address
    const shortenedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    return {
      displayName: shortenedAddress,
      isFarcaster: false,
    };
  }
}

/**
 * Batch resolve multiple addresses to Farcaster profiles
 * More efficient for leaderboards with many addresses
 * @param addresses Array of Ethereum addresses
 * @returns Map of address to profile
 */
export async function batchResolveFarcasterProfiles(
  addresses: string[]
): Promise<Map<string, FarcasterProfile | null>> {
  const results = new Map<string, FarcasterProfile | null>();
  
  // Filter out addresses we already have cached
  const uncachedAddresses = addresses.filter(addr => profileCache[addr] === undefined);
  
  // Add cached results
  addresses.forEach(addr => {
    if (profileCache[addr] !== undefined) {
      results.set(addr, profileCache[addr]);
    }
  });

  if (uncachedAddresses.length === 0) {
    return results;
  }

  try {
    // Batch resolve uncached addresses
    const response = await fetch(`/api/farcaster/batch-resolve-addresses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addresses: uncachedAddresses }),
    });

    if (!response.ok) {
      throw new Error(`Batch resolve API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Process results
    uncachedAddresses.forEach(address => {
      const profileData = data.profiles[address];
      
      if (profileData) {
        const profile: FarcasterProfile = {
          fid: profileData.fid,
          username: profileData.username,
          displayName: profileData.display_name || profileData.username,
          pfpUrl: profileData.pfp_url,
          bio: profileData.profile?.bio?.text,
          followerCount: profileData.follower_count,
          followingCount: profileData.following_count,
          verifiedAddresses: profileData.verified_addresses?.eth_addresses || [],
        };
        
        profileCache[address] = profile;
        results.set(address, profile);
      } else {
        profileCache[address] = null;
        results.set(address, null);
      }
    });

    logger.info('🎭 Batch resolved Farcaster profiles', {
      total: addresses.length,
      resolved: Array.from(results.values()).filter(p => p !== null).length
    });

  } catch (error) {
    logger.warn('🎭 Batch resolve failed, falling back to individual calls', error);
    
    // Fallback to individual resolution
    for (const address of uncachedAddresses) {
      const profile = await resolveFarcasterProfile(address);
      results.set(address, profile);
    }
  }

  return results;
}

/**
 * Clear the profile cache (useful for testing or manual refresh)
 */
export function clearProfileCache(): void {
  Object.keys(profileCache).forEach(key => delete profileCache[key]);
  logger.info('🎭 Cleared Farcaster profile cache');
}

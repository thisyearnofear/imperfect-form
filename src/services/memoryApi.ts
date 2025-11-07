/**
 * Memory Protocol API Client
 *
 * Provides integration with Memory Protocol for identity graphs, social data, and data monetization.
 */

import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('MemoryAPI');

// Types for Memory Protocol API
export interface IdentityNode {
  id: string;
  platform: string;
  url?: string;
  avatar?: string;
  username?: string;
  social?: {
    followers?: number;
    following?: number;
    verified?: boolean | null;
  };
  sources: Array<{
    id: string;
    platform: string;
    verified: boolean;
  }>;
}

export interface IdentityGraph {
  identities: IdentityNode[];
}

export interface SocialProfile {
  id: string;
  username: string;
  avatar?: string;
  social: {
    followers: number;
    following: number;
    verified?: boolean;
  };
  bio?: string;
  url: string;
}

export interface FitnessDataUpload {
  userId: string;
  dataType: 'structured' | 'unstructured';
  schema?: string;
  data: any;
  metadata: {
    description: string;
    tags: string[];
    quality: number;
  };
}

export interface EarningsData {
  totalEarned: number;
  weeklyEarnings: number;
  dataQueries: number;
  lastPayout: string;
}

class MemoryAPIClient {
  private baseUrl = 'https://api.memoryproto.co';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;

    logger.info('Making Memory API request', {
      url,
      method: options.method || 'GET',
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorDetails = {
        endpoint,
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries()),
      };

      logger.error('Memory API request failed', errorDetails);

      // Provide more specific error messages based on status code
      let errorMessage = `Memory API error: ${response.status}`;
      if (response.status === 401) {
        errorMessage =
          'Invalid or missing API key. Please check your Memory API key configuration.';
      } else if (response.status === 404) {
        errorMessage = `Resource not found: ${endpoint}. This could mean the identifier doesn't exist in Memory Protocol or the endpoint is incorrect.`;
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait before making more requests.';
      } else if (errorText) {
        errorMessage += ` - ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Identity Graph Methods
  async getIdentityGraphByWallet(walletAddress: string): Promise<IdentityGraph> {
    logger.info('Fetching identity graph by wallet', { walletAddress });

    // Validate wallet address format
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      throw new Error(`Invalid wallet address format: ${walletAddress}`);
    }

    // Normalize wallet address to lowercase for consistent API calls
    const normalizedAddress = walletAddress.toLowerCase();
    logger.info('Normalized wallet address for API call', {
      original: walletAddress,
      normalized: normalizedAddress,
    });

    try {
      return await this.request(`/identities/wallet/${normalizedAddress}`);
    } catch (error) {
      logger.error('Failed to fetch identity graph by wallet', {
        error,
        walletAddress,
        normalizedAddress,
        url: `${this.baseUrl}/identities/wallet/${normalizedAddress}`,
      });
      throw error;
    }
  }

  async getIdentityGraphByFarcasterUsername(username: string): Promise<IdentityGraph> {
    logger.info('Fetching identity graph by Farcaster username', { username });
    // Try multiple possible endpoints
    try {
      return await this.request(`/identities/farcaster/${username}`);
    } catch (error) {
      logger.warn('Primary Farcaster username endpoint failed, trying alternatives', {
        username,
        error,
      });
      // Try alternative endpoints if the primary one fails
      try {
        return await this.request(`/identities/farcaster/username/${username}`);
      } catch (error2) {
        logger.warn('Alternative Farcaster username endpoint also failed', {
          username,
          error: error2,
        });
        throw error; // Throw the original error
      }
    }
  }

  async getIdentityGraphByFarcasterId(fid: number): Promise<IdentityGraph> {
    logger.info('Fetching identity graph by Farcaster ID', { fid });
    // Try multiple possible endpoints
    try {
      return await this.request(`/identities/farcaster/id/${fid}`);
    } catch (error) {
      logger.warn('Primary Farcaster ID endpoint failed, trying alternatives', { fid, error });
      // Try alternative endpoints if the primary one fails
      try {
        return await this.request(`/identities/fid/${fid}`);
      } catch (error2) {
        logger.warn('Alternative Farcaster ID endpoint also failed', { fid, error: error2 });
        throw error; // Throw the original error
      }
    }
  }

  async getIdentityGraphByTwitterUsername(username: string): Promise<IdentityGraph> {
    logger.info('Fetching identity graph by Twitter username', { username });
    return this.request(`/identities/twitter/${username}`);
  }

  // Social Graph Methods
  async getFarcasterProfile(fid: number): Promise<SocialProfile> {
    logger.info('Fetching Farcaster profile', { fid });
    return this.request(`/social-graph/farcaster/profile/${fid}`);
  }

  async getFarcasterFollowers(fid: number, limit = 50): Promise<string[]> {
    logger.info('Fetching Farcaster followers', { fid, limit });
    const response = await this.request(`/social-graph/farcaster/followers/${fid}?limit=${limit}`);
    return response.followers || [];
  }

  async getFarcasterFollowing(fid: number, limit = 50): Promise<string[]> {
    logger.info('Fetching Farcaster following', { fid, limit });
    const response = await this.request(`/social-graph/farcaster/following/${fid}?limit=${limit}`);
    return response.following || [];
  }

  async getTwitterProfile(username: string): Promise<SocialProfile> {
    logger.info('Fetching Twitter profile', { username });
    return this.request(`/social-graph/twitter/profile/${username}`);
  }

  async getTwitterFollowers(username: string, limit = 50): Promise<string[]> {
    logger.info('Fetching Twitter followers', { username, limit });
    const response = await this.request(
      `/social-graph/twitter/followers/${username}?limit=${limit}`
    );
    return response.followers || [];
  }

  async getTwitterFollowing(username: string, limit = 50): Promise<string[]> {
    logger.info('Fetching Twitter following', { username, limit });
    const response = await this.request(
      `/social-graph/twitter/following/${username}?limit=${limit}`
    );
    return response.following || [];
  }

  // Data Upload Methods (when available)
  async uploadFitnessData(
    data: FitnessDataUpload
  ): Promise<{ success: boolean; uploadId: string }> {
    logger.info('Uploading fitness data', { userId: data.userId, dataType: data.dataType });
    // Note: This endpoint may not be available yet in the current API
    return this.request('/data/uploads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEarnings(userId: string): Promise<EarningsData> {
    logger.info('Fetching earnings data', { userId });
    // Note: This endpoint may not be available yet in the current API
    return this.request(`/data/earnings/${userId}`);
  }

  // Utility Methods
  async getCredits(): Promise<{ remaining: number; limit: number }> {
    logger.info('Fetching API credits');
    return this.request('/credits');
  }

  // Enhanced User Profile Helper
  async getEnhancedUserProfile(
    identifier: string | number,
    context?: { walletAddress?: string }
  ): Promise<{
    identities: IdentityNode[];
    primaryIdentity?: IdentityNode;
    socialStats: {
      totalFollowers: number;
      platforms: string[];
    };
  }> {
    logger.info('Getting enhanced user profile', { identifier, context });

    // Validate identifier
    if (!identifier) {
      throw new Error('Invalid identifier provided for enhanced profile lookup');
    }

    // If we have a wallet address in context and the identifier is not a wallet, try wallet lookup first
    if (
      context?.walletAddress &&
      typeof identifier === 'string' &&
      !identifier.startsWith('0x') &&
      typeof identifier !== 'number'
    ) {
      logger.info('Attempting wallet-based lookup as primary method', {
        walletAddress: context.walletAddress,
      });
      try {
        const walletIdentityGraph = await this.getIdentityGraphByWallet(context.walletAddress);
        // Check if this wallet contains the requested identity
        const matchingIdentity = walletIdentityGraph.identities.find(
          (id) =>
            id.username === identifier ||
            id.id === identifier ||
            (id.platform === 'farcaster' && id.id === identifier) ||
            (id.platform === 'farcaster' && id.username === identifier)
        );

        if (matchingIdentity) {
          logger.info('Found matching identity in wallet graph, using wallet data', {
            identifier,
            walletAddress: context.walletAddress,
          });
          // Process the wallet identity graph
          const primaryIdentity =
            walletIdentityGraph.identities.find(
              (id) => id.platform === 'farcaster' || id.sources?.length > 0
            ) || walletIdentityGraph.identities[0];

          const socialStats = {
            totalFollowers: walletIdentityGraph.identities.reduce(
              (total, id) => total + (id.social?.followers || 0),
              0
            ),
            platforms: [...new Set(walletIdentityGraph.identities.map((id) => id.platform))],
          };

          return {
            identities: walletIdentityGraph.identities,
            primaryIdentity,
            socialStats,
          };
        }
      } catch (walletError) {
        logger.warn('Wallet lookup failed, falling back to direct identifier lookup', {
          walletAddress: context.walletAddress,
          error: walletError,
        });
      }
    }

    let identityGraph: IdentityGraph;

    try {
      // Try different identifier types, with wallet lookup as fallback
      if (typeof identifier === 'string' && identifier.startsWith('0x')) {
        logger.info('Fetching identity graph by wallet address', { walletAddress: identifier });
        identityGraph = await this.getIdentityGraphByWallet(identifier);
      } else {
        // For any other identifier (username, FID, etc.), try Farcaster endpoints first, then fallback to wallet lookup
        logger.info('Attempting Farcaster-based lookup first', { identifier });

        try {
          if (typeof identifier === 'number') {
            logger.info('Fetching identity graph by Farcaster ID', { fid: identifier });
            identityGraph = await this.getIdentityGraphByFarcasterId(identifier);
          } else if (typeof identifier === 'string' && identifier.includes('@')) {
            // Assume Farcaster username (remove @ if present)
            const username = identifier.replace('@', '');
            logger.info('Fetching identity graph by Farcaster username', { username });
            identityGraph = await this.getIdentityGraphByFarcasterUsername(username);
          } else {
            // Try as Farcaster username by default
            logger.info('Fetching identity graph by Farcaster username (default)', {
              username: identifier,
            });
            identityGraph = await this.getIdentityGraphByFarcasterUsername(identifier);
          }
        } catch (farcasterError) {
          logger.warn('Farcaster endpoints failed, attempting wallet lookup as fallback', {
            identifier,
            error: farcasterError,
          });

          // Farcaster lookup failed, try to find by wallet if we have context
          // For now, we'll re-throw the error since we don't have a way to map username to wallet
          throw farcasterError;
        }
      }
    } catch (error) {
      logger.error('Failed to fetch identity graph', { error, identifier });

      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Failed to fetch identity data for ${identifier}: ${error.message}`);
      }
      throw new Error(`Failed to fetch identity data for ${identifier}`);
    }

    // Ensure identityGraph and identities exist before processing
    if (!identityGraph || !identityGraph.identities || !Array.isArray(identityGraph.identities)) {
      logger.warn('Invalid or empty identity graph received', { identityGraph, identifier });
      return {
        identities: [],
        primaryIdentity: undefined,
        socialStats: {
          totalFollowers: 0,
          platforms: [],
        },
      };
    }

    // Find primary identity (usually the one with most sources or Farcaster)
    const primaryIdentity =
      identityGraph.identities.find(
        (id) => id.platform === 'farcaster' || id.sources?.length > 0
      ) || identityGraph.identities[0];

    // Calculate social stats
    const socialStats = {
      totalFollowers: identityGraph.identities.reduce(
        (total, id) => total + (id.social?.followers || 0),
        0
      ),
      platforms: [...new Set(identityGraph.identities.map((id) => id.platform))],
    };

    const result = {
      identities: identityGraph.identities,
      primaryIdentity,
      socialStats,
    };

    logger.info('Enhanced profile processing complete', {
      identifier,
      inputIdentityGraphSize: identityGraph.identities.length,
      outputIdentitiesSize: result.identities.length,
      calculatedTotalFollowers: result.socialStats.totalFollowers,
      calculatedPlatforms: result.socialStats.platforms.length,
      primaryIdentityPlatform: result.primaryIdentity?.platform,
      socialStatsBreakdown: identityGraph.identities.map((id) => ({
        platform: id.platform,
        followers: id.social?.followers || 0,
        username: id.username,
      })),
    });

    return result;
  }
}

// Create singleton instance
let memoryClient: MemoryAPIClient | null = null;

export function getMemoryClient(): MemoryAPIClient | null {
  if (!memoryClient) {
    const apiKey = process.env.NEXT_PUBLIC_MEMORY_API_KEY;
    logger.info('Memory API key configuration check', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0,
      isProduction: process.env.NODE_ENV === 'production',
    });

    if (!apiKey) {
      logger.warn('Memory API key not configured - enhanced features disabled');
      return null; // Return null instead of throwing
    }
    memoryClient = new MemoryAPIClient(apiKey);
  }
  return memoryClient;
}

// Export types and client
export { MemoryAPIClient };
export default getMemoryClient;

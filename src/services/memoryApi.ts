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

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Memory API request failed', { endpoint, status: response.status, error });
      throw new Error(`Memory API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Identity Graph Methods
  async getIdentityGraphByWallet(walletAddress: string): Promise<IdentityGraph> {
    logger.info('Fetching identity graph by wallet', { walletAddress });
    return this.request(`/identity-graph/wallet/${walletAddress}`);
  }

  async getIdentityGraphByFarcasterUsername(username: string): Promise<IdentityGraph> {
    logger.info('Fetching identity graph by Farcaster username', { username });
    return this.request(`/identity-graph/farcaster/${username}`);
  }

  async getIdentityGraphByFarcasterId(fid: number): Promise<IdentityGraph> {
    logger.info('Fetching identity graph by Farcaster ID', { fid });
    return this.request(`/identity-graph/farcaster/id/${fid}`);
  }

  async getIdentityGraphByTwitterUsername(username: string): Promise<IdentityGraph> {
    logger.info('Fetching identity graph by Twitter username', { username });
    return this.request(`/identity-graph/twitter/${username}`);
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
  async getEnhancedUserProfile(identifier: string | number): Promise<{
    identities: IdentityNode[];
    primaryIdentity?: IdentityNode;
    socialStats: {
      totalFollowers: number;
      platforms: string[];
    };
  }> {
    logger.info('Getting enhanced user profile', { identifier });

    let identityGraph: IdentityGraph;

    // Try different identifier types
    if (typeof identifier === 'string' && identifier.startsWith('0x')) {
      identityGraph = await this.getIdentityGraphByWallet(identifier);
    } else if (typeof identifier === 'number') {
      identityGraph = await this.getIdentityGraphByFarcasterId(identifier);
    } else if (typeof identifier === 'string' && identifier.includes('@')) {
      // Assume Farcaster username (remove @ if present)
      const username = identifier.replace('@', '');
      identityGraph = await this.getIdentityGraphByFarcasterUsername(username);
    } else {
      // Try as Farcaster username by default
      identityGraph = await this.getIdentityGraphByFarcasterUsername(identifier);
    }

    // Find primary identity (usually the one with most sources or Farcaster)
    const primaryIdentity =
      identityGraph.identities.find((id) => id.platform === 'farcaster' || id.sources.length > 0) ||
      identityGraph.identities[0];

    // Calculate social stats
    const socialStats = {
      totalFollowers: identityGraph.identities.reduce(
        (total, id) => total + (id.social?.followers || 0),
        0
      ),
      platforms: [...new Set(identityGraph.identities.map((id) => id.platform))],
    };

    return {
      identities: identityGraph.identities,
      primaryIdentity,
      socialStats,
    };
  }
}

// Create singleton instance
let memoryClient: MemoryAPIClient | null = null;

export function getMemoryClient(): MemoryAPIClient | null {
  if (!memoryClient) {
    const apiKey = process.env.NEXT_PUBLIC_MEMORY_API_KEY;
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

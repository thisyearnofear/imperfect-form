/**
 * Enhanced Profile Hook (local-only stub)
 *
 * The Memory Protocol integration was descoped after the upstream
 * memoryproto.co deployment went dark. This hook now returns a
 * minimal profile shape derived from the identifier alone, so
 * consumer UIs keep rendering without any network calls.
 */

import { useState, useCallback, useEffect } from 'react';

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

const buildBasicProfile = (identifier: string): EnhancedProfile => ({
  identifier,
  walletAddress: identifier.startsWith('0x') ? identifier : undefined,
  identities: [],
  primaryIdentity: undefined,
  socialStats: {
    totalFollowers: 0,
    platforms: [],
  },
  walletInfo: {
    address: identifier.startsWith('0x') ? identifier : undefined,
  },
  mutualConnections: [],
  loadedAt: Date.now(),
});

export const useEnhancedProfile = (identifier?: string) => {
  const [profile, setProfile] = useState<EnhancedProfile | null>(
    identifier ? buildBasicProfile(identifier) : null
  );

  useEffect(() => {
    setProfile(identifier ? buildBasicProfile(identifier) : null);
  }, [identifier]);

  const loadProfile = useCallback((targetIdentifier: string) => {
    setProfile(targetIdentifier ? buildBasicProfile(targetIdentifier) : null);
  }, []);

  const refreshProfile = useCallback(() => {
    setProfile((prev) => (prev ? buildBasicProfile(prev.identifier) : prev));
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
  }, []);

  return {
    profile,
    loading: false,
    error: null as string | null,
    loadProfile,
    refreshProfile,
    clearProfile,
    hasData: !!profile,
    isInitial: !profile,
  };
};

export const useMultipleProfiles = (_identifiers: string[]) => {
  const [profiles] = useState<{ [key: string]: EnhancedProfile }>({});
  const loadProfiles = useCallback(async (_ids: string[]) => {
    // no-op: Memory Protocol integration was descoped
  }, []);

  return { profiles, loading: false, loadProfiles };
};

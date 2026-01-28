/**
 * useSyncedLeaderboard - React hook for unified leaderboard data
 *
 * Provides drop-in replacement for existing leaderboard fetching patterns.
 * Automatically manages caching, deduplication, and offline fallbacks via DataSyncService.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getLeaderboardSyncService,
  LEADERBOARD_KEYS,
  invalidateLeaderboard,
  type EnhancedLeaderboardData,
} from '@/services/integrations/LeaderboardDataAdapter';
import { Score } from '@/types';

interface LeaderboardState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
}

interface UseSyncedLeaderboardOptions {
  type?: 'pushups' | 'squats' | 'full';
  revalidate?: boolean;
  skipCache?: boolean;
}

/**
 * Hook to fetch leaderboard data via DataSyncService
 * Automatically handles caching, deduplication, and subscriptions
 */
export function useSyncedLeaderboard(
  options: UseSyncedLeaderboardOptions = {}
): LeaderboardState<Score[] | EnhancedLeaderboardData> & { refetch: () => void } {
  const { type = 'full', revalidate = false, skipCache = false } = options;

  const [state, setState] = useState<LeaderboardState<Score[] | EnhancedLeaderboardData>>({
    data: null,
    loading: true,
    error: null,
    isStale: false,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  const key =
    LEADERBOARD_KEYS[type === 'full' ? 'FULL' : type === 'pushups' ? 'PUSHUPS' : 'SQUATS'];

  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const service = getLeaderboardSyncService();
      const data = await service.fetch(key, {
        revalidate,
        skipCache,
        ttl: 5 * 60 * 1000, // 5 minutes
      });

      if (isMountedRef.current) {
        const metadata = service.getCacheMetadata(key);
        setState({
          data: data as Score[] | EnhancedLeaderboardData,
          loading: false,
          error: null,
          isStale: metadata?.status === 'stale',
        });
      }
    } catch (error) {
      if (isMountedRef.current) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
          isStale: false,
        });
      }
    }
  }, [key, revalidate, skipCache]);

  // Initial fetch + subscribe for updates
  useEffect(() => {
    isMountedRef.current = true;

    // Fetch immediately
    fetchData();

    // Subscribe for real-time updates (automatic polling via DataSyncService)
    const service = getLeaderboardSyncService();
    unsubscribeRef.current = service.subscribe(
      key,
      (data) => {
        if (isMountedRef.current) {
          setState({
            data: data as Score[] | EnhancedLeaderboardData,
            loading: false,
            error: null,
            isStale: false,
          });
        }
      },
      { pollInterval: 5 * 60 * 1000 } // Poll every 5 minutes
    );

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [key, fetchData]);

  const refetch = useCallback(() => {
    invalidateLeaderboard(type as any);
    fetchData();
  }, [type, fetchData]);

  return {
    ...state,
    refetch,
  };
}

/**
 * Hook for fetching specific leaderboard type (pushups or squats)
 */
export function useSyncedScores(type: 'pushups' | 'squats') {
  return useSyncedLeaderboard({ type });
}

/**
 * Hook for full leaderboard with both pushups and squats
 */
export function useSyncedFullLeaderboard() {
  return useSyncedLeaderboard({ type: 'full' });
}

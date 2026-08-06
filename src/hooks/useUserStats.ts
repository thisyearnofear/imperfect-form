/**
 * Custom hook to fetch and manage user statistics from leaderboard data
 * Reuses the same data fetching logic as the leaderboard component
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { extractUserStats, formatUserStatsForProfile, UserStats } from '@/utils/userStatsExtractor';
import { getCachedLeaderboardData } from '@/utils/leaderboardCache';
import { getLocalWorkouts, WORKOUT_KEYS } from '@/services/integrations/WorkoutDataAdapter';
import { getDataSyncService } from '@/services/DataSyncService';

interface UseUserStatsReturn {
  userStats: UserStats | null;
  formattedStats: ReturnType<typeof formatUserStatsForProfile> | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to get user statistics from cached leaderboard data
 * @param userAddress - The user's wallet address
 * @returns User statistics and loading state
 */
export function useUserStats(userAddress: string | null | undefined): UseUserStatsReturn {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  // Function to extract stats from cache
  const extractStatsFromCache = useCallback(async () => {
    if (!userAddress) return null;

    const cachedData = getCachedLeaderboardData();
    const localWorkouts = await getLocalWorkouts();

    if (cachedData || localWorkouts.length > 0) {
      const pushupLeaderboard = cachedData?.pushups || [];
      const squatLeaderboard = cachedData?.squats || [];
      return extractUserStats(userAddress, pushupLeaderboard, squatLeaderboard, localWorkouts);
    }

    return null;
  }, [userAddress]);

  const fetchUserStats = useCallback(async () => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!userAddress) {
      setUserStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // First, try to get data from existing cache
    const cachedStats = await extractStatsFromCache();
    if (requestId !== requestIdRef.current) return;
    if (cachedStats) {
      setUserStats(cachedStats);
      setIsLoading(false);
      return;
    }

    // If no cache available, don't fetch - let the leaderboard component handle it
    // Just wait and poll for cache to be populated
    let attempts = 0;
    const maxAttempts = 10; // 10 seconds max wait

    const pollForCache = async () => {
      if (requestId !== requestIdRef.current) return;
      attempts++;
      const stats = await extractStatsFromCache();
      if (requestId !== requestIdRef.current) return;

      if (stats) {
        setUserStats(stats);
        setIsLoading(false);
      } else if (attempts < maxAttempts) {
        pollTimerRef.current = setTimeout(pollForCache, 1000); // Check every second
      } else {
        setUserStats(null);
        setIsLoading(false);
      }
    };

    // Start polling after a short delay
    pollTimerRef.current = setTimeout(pollForCache, 500);
  }, [userAddress, extractStatsFromCache]);

  // Listen for updates only once wallet identity exists. Anonymous Ring 0
  // should stay quiet and should not subscribe to stats synchronization.
  useEffect(() => {
    if (!userAddress || typeof window === 'undefined') return;

    const handleUpdate = async () => {
      const stats = await extractStatsFromCache();
      if (stats) {
        setUserStats(stats);
        setIsLoading(false);
      }
    };

    window.addEventListener('leaderboardCacheUpdated', handleUpdate);

    const service = getDataSyncService();
    const unsubscribeWorkouts = service.subscribe(WORKOUT_KEYS.ALL, handleUpdate);

    return () => {
      window.removeEventListener('leaderboardCacheUpdated', handleUpdate);
      unsubscribeWorkouts();
    };
  }, [userAddress, extractStatsFromCache]);

  // Initial fetch; cancel stale polling when identity changes or the component unmounts.
  useEffect(() => {
    fetchUserStats();

    return () => {
      requestIdRef.current += 1;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [fetchUserStats]);

  // Format stats for display
  const formattedStats = userStats ? formatUserStatsForProfile(userStats) : null;

  return {
    userStats,
    formattedStats,
    isLoading,
    error,
    refetch: fetchUserStats,
  };
}

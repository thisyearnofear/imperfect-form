/**
 * Custom hook to fetch and manage user statistics from leaderboard data
 * Reuses the same data fetching logic as the leaderboard component
 */

import { useState, useEffect, useCallback } from 'react';
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
    console.log('🔍 fetchUserStats called with userAddress:', userAddress);

    if (!userAddress) {
      console.log('❌ No userAddress provided, setting stats to null');
      setUserStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // First, try to get data from existing cache
    const cachedStats = await extractStatsFromCache();
    if (cachedStats) {
      console.log('📦 Using cached leaderboard data for user stats');
      setUserStats(cachedStats);
      setIsLoading(false);
      return;
    }

    // If no cache available, don't fetch - let the leaderboard component handle it
    // Just wait and poll for cache to be populated
    console.log('⏳ No cache available, waiting for leaderboard to populate...');

    let attempts = 0;
    const maxAttempts = 10; // 10 seconds max wait

    const pollForCache = async () => {
      attempts++;
      const stats = await extractStatsFromCache();

      if (stats) {
        console.log('📦 Found cached data after polling');
        setUserStats(stats);
        setIsLoading(false);
      } else if (attempts < maxAttempts) {
        setTimeout(pollForCache, 1000); // Check every second
      } else {
        console.log('❌ No cached data found after polling, showing fallback');
        setUserStats(null);
        setIsLoading(false);
      }
    };

    // Start polling after a short delay
    setTimeout(pollForCache, 500);
  }, [userAddress, extractStatsFromCache]);

  // Listen for updates via custom events and DataSyncService
  useEffect(() => {
    const handleUpdate = async () => {
      console.log('🔄 Data updated, refreshing user stats');
      const stats = await extractStatsFromCache();
      if (stats) {
        setUserStats(stats);
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('leaderboardCacheUpdated', handleUpdate);

      // Also subscribe to local workout updates
      const service = getDataSyncService();
      const unsubscribeWorkouts = service.subscribe(WORKOUT_KEYS.ALL, handleUpdate);

      return () => {
        window.removeEventListener('leaderboardCacheUpdated', handleUpdate);
        unsubscribeWorkouts();
      };
    }
  }, [extractStatsFromCache]);

  // Initial fetch
  useEffect(() => {
    fetchUserStats();
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

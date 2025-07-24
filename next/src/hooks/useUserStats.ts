/**
 * Custom hook to fetch and manage user statistics from leaderboard data
 * Reuses the same data fetching logic as the leaderboard component
 */

import { useState, useEffect, useCallback } from 'react';
import { Score } from '@/types';
import { extractUserStats, formatUserStatsForProfile, UserStats } from '@/utils/userStatsExtractor';

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

  const fetchUserStats = useCallback(async () => {
    console.log('🔍 fetchUserStats called with userAddress:', userAddress);

    if (!userAddress) {
      console.log('❌ No userAddress provided, setting stats to null');
      setUserStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Try to get data from leaderboard cache first
      if (typeof window !== "undefined") {
        const cachedData = localStorage.getItem("leaderboardCache");
        const cacheTimestamp = localStorage.getItem("leaderboardCacheTimestamp");
        
        if (cachedData && cacheTimestamp) {
          const cacheAge = Date.now() - parseInt(cacheTimestamp);
          const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
          
          if (cacheAge < CACHE_DURATION) {
            try {
              const parsedData = JSON.parse(cachedData);
              const pushupLeaderboard: Score[] = parsedData.pushups || [];
              const squatLeaderboard: Score[] = parsedData.squats || [];
              
              const stats = extractUserStats(userAddress, pushupLeaderboard, squatLeaderboard);
              setUserStats(stats);
              setIsLoading(false);
              return;
            } catch (parseError) {
              console.warn('Failed to parse cached leaderboard data:', parseError);
            }
          }
        }
      }

      // If no cache or cache is stale, try to fetch data directly
      console.log('No fresh cached data available, fetching leaderboard data for user stats');

      try {
        // Import and use the leaderboard data utility
        const { getLeaderboard } = await import('@/utils/leaderboardData');
        const leaderboardData = await getLeaderboard();

        if (leaderboardData) {
          const pushupLeaderboard = leaderboardData.pushups || [];
          const squatLeaderboard = leaderboardData.squats || [];

          const stats = extractUserStats(userAddress, pushupLeaderboard, squatLeaderboard);
          setUserStats(stats);

          // Cache the data for future use
          if (typeof window !== "undefined") {
            localStorage.setItem("leaderboardCache", JSON.stringify(leaderboardData));
            localStorage.setItem("leaderboardCacheTimestamp", Date.now().toString());
          }

          console.log('Successfully fetched and cached user stats:', stats);
          return;
        }
      } catch (fetchError) {
        console.error('Failed to fetch leaderboard data for user stats:', fetchError);
      }

      setUserStats(null);
      
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setError('Failed to load user statistics');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Listen for leaderboard cache updates
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'leaderboardCache' && e.newValue) {
        // Leaderboard cache was updated, refetch user stats
        fetchUserStats();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [fetchUserStats]);

  // Initial fetch
  useEffect(() => {
    fetchUserStats();
  }, [fetchUserStats]);

  // Clear cache on mount to ensure fresh data for debugging
  useEffect(() => {
    if (typeof window !== "undefined" && userAddress) {
      console.log('🗑️ Clearing cache for fresh user stats');
      localStorage.removeItem("leaderboardCache");
      localStorage.removeItem("leaderboardCacheTimestamp");
    }
  }, [userAddress]);

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

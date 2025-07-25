/**
 * Shared utilities for leaderboard cache management
 * Centralizes cache logic to maintain DRY principles
 */

import { Score } from '@/types';
import { FarcasterProfile } from '@/utils/neynarResolver';

export const CACHE_KEYS = {
  LEADERBOARD_DATA: 'leaderboardCache',
  LEADERBOARD_TIMESTAMP: 'leaderboardCacheTimestamp',
} as const;

export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface LeaderboardCacheData {
  pushups: Score[];
  squats: Score[];
  displayNames: Record<string, string>;
  farcasterProfiles?: Record<string, FarcasterProfile | null>;
}

/**
 * Get cached leaderboard data if it's still fresh
 */
export function getCachedLeaderboardData(): LeaderboardCacheData | null {
  if (typeof window === "undefined") return null;

  try {
    const cachedData = localStorage.getItem(CACHE_KEYS.LEADERBOARD_DATA);
    const cacheTimestamp = localStorage.getItem(CACHE_KEYS.LEADERBOARD_TIMESTAMP);
    
    if (cachedData && cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      
      if (cacheAge < CACHE_DURATION) {
        return JSON.parse(cachedData);
      }
    }
  } catch (error) {
    console.warn('Failed to get cached leaderboard data:', error);
  }
  
  return null;
}

/**
 * Cache leaderboard data and dispatch update event
 */
export function cacheLeaderboardData(data: LeaderboardCacheData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(CACHE_KEYS.LEADERBOARD_DATA, JSON.stringify(data));
    localStorage.setItem(CACHE_KEYS.LEADERBOARD_TIMESTAMP, Date.now().toString());
    console.log("💾 Cached leaderboard data");
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('leaderboardCacheUpdated'));
  } catch (error) {
    console.error("Error caching leaderboard data:", error);
  }
}

/**
 * Clear leaderboard cache
 */
export function clearLeaderboardCache(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CACHE_KEYS.LEADERBOARD_DATA);
    localStorage.removeItem(CACHE_KEYS.LEADERBOARD_TIMESTAMP);
    console.log("🗑️ Cleared leaderboard cache");
  } catch (error) {
    console.error("Error clearing leaderboard cache:", error);
  }
}

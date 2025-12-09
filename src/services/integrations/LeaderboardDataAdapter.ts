/**
 * LeaderboardDataAdapter - Real integration of existing leaderboard patterns
 *
 * Bridges current leaderboard data sources and cache to the unified DataSyncService.
 * No duplication - reuses existing fetching logic and offline fallbacks.
 */

import { getDataSyncService, createDataKey, type DataSource } from '@/services/DataSyncService';
import { getOfflineDataStore } from '@/services/OfflineDataStore';
import {
  getCachedLeaderboardData,
  cacheLeaderboardData,
  clearLeaderboardCache,
} from '@/utils/leaderboardCache';
import { getLeaderboard } from '@/utils/leaderboardData';
import { getLegacyScores } from '@/utils/simpleLegacyPreservation';
import { Score } from '@/types';

export interface EnhancedLeaderboardData {
  pushups: Score[];
  squats: Score[];
  legacy?: Score[];
  timestamp: number;
}

// Data keys - single source of truth
export const LEADERBOARD_KEYS = {
  PUSHUPS: createDataKey('leaderboard:pushups'),
  SQUATS: createDataKey('leaderboard:squats'),
  FULL: createDataKey('leaderboard:full'),
  LEGACY: createDataKey('leaderboard:legacy'),
} as const;

const LEADERBOARD_TTL = 5 * 60 * 1000; // 5 minutes (matches existing cache)
const LEGACY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Initialize and register all leaderboard data sources
 * Call this once at app startup (e.g., in layout.tsx or _app.tsx)
 */
export async function initializeLeaderboardSources(): Promise<void> {
  const service = getDataSyncService();
  const offlineStore = getOfflineDataStore();

  // Register pushups leaderboard
  service.register<Score[]>(LEADERBOARD_KEYS.PUSHUPS, {
    fetch: async (signal) => {
      try {
        // Try existing cache first (reuse current pattern)
        const cached = getCachedLeaderboardData();
        if (cached?.pushups) return cached.pushups;

        // Fetch fresh data
        const data = await getLeaderboard();

        // Cache using existing mechanism (to not break other code)
        cacheLeaderboardData(data);

        // Also persist offline
        await offlineStore.set('leaderboard:pushups', data.pushups);

        return data.pushups;
      } catch (error) {
        // Fallback to offline cache
        const offline = await offlineStore.get<Score[]>('leaderboard:pushups');
        if (offline) return offline;
        throw error;
      }
    },
  });

  // Register squats leaderboard
  service.register<Score[]>(LEADERBOARD_KEYS.SQUATS, {
    fetch: async (signal) => {
      try {
        const cached = getCachedLeaderboardData();
        if (cached?.squats) return cached.squats;

        const data = await getLeaderboard();
        cacheLeaderboardData(data);
        await offlineStore.set('leaderboard:squats', data.squats);

        return data.squats;
      } catch (error) {
        const offline = await offlineStore.get<Score[]>('leaderboard:squats');
        if (offline) return offline;
        throw error;
      }
    },
  });

  // Register full leaderboard (both types)
  service.register<EnhancedLeaderboardData>(LEADERBOARD_KEYS.FULL, {
    fetch: async (signal) => {
      try {
        const cached = getCachedLeaderboardData();
        if (cached) {
          return {
            pushups: cached.pushups || [],
            squats: cached.squats || [],
            timestamp: Date.now(),
          };
        }

        const data = await getLeaderboard();
        cacheLeaderboardData(data);

        const fullData: EnhancedLeaderboardData = {
          pushups: data.pushups || [],
          squats: data.squats || [],
          timestamp: Date.now(),
        };

        await offlineStore.set('leaderboard:full', fullData);
        return fullData;
      } catch (error) {
        const offline = await offlineStore.get<EnhancedLeaderboardData>('leaderboard:full');
        if (offline) return offline;
        throw error;
      }
    },
  });

  // Register legacy leaderboard
  service.register<Score[]>(LEADERBOARD_KEYS.LEGACY, {
    fetch: async (signal) => {
      try {
        const legacy = await getLegacyScores();
        await offlineStore.set('leaderboard:legacy', legacy);
        return legacy;
      } catch (error) {
        const offline = await offlineStore.get<Score[]>('leaderboard:legacy');
        if (offline) return offline;
        throw error;
      }
    },
  });
}

/**
 * Invalidate all leaderboard caches
 * Call this after a user submits a score
 */
export function invalidateAllLeaderboards(): void {
  const service = getDataSyncService();

  // Invalidate all leaderboard keys
  service.invalidate(LEADERBOARD_KEYS.PUSHUPS);
  service.invalidate(LEADERBOARD_KEYS.SQUATS);
  service.invalidate(LEADERBOARD_KEYS.FULL);

  // Also clear the legacy localStorage cache (existing pattern)
  clearLeaderboardCache();
}

/**
 * Invalidate a specific leaderboard type
 */
export function invalidateLeaderboard(type: 'pushups' | 'squats' | 'full' | 'legacy'): void {
  const service = getDataSyncService();
  const keys = {
    pushups: LEADERBOARD_KEYS.PUSHUPS,
    squats: LEADERBOARD_KEYS.SQUATS,
    full: LEADERBOARD_KEYS.FULL,
    legacy: LEADERBOARD_KEYS.LEGACY,
  };

  service.invalidate(keys[type]);

  // If invalidating main leaderboard, also clear the legacy cache
  if (type !== 'legacy') {
    clearLeaderboardCache();
  }
}

/**
 * Get the DataSync service instance (for advanced usage)
 */
export function getLeaderboardSyncService() {
  return getDataSyncService();
}

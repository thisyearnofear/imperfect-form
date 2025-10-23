/**
 * Enhanced Leaderboard Hook
 *
 * Automatically combines current scores with legacy scores
 * No manual management - just use this instead of regular leaderboard data
 */

import { useState, useEffect, useMemo } from 'react';
import {
  getLegacyScores,
  hasLegacyScores,
  getUserLegacyTotal,
} from '@/utils/simpleLegacyPreservation';
import type { Score } from '@/types';

interface EnhancedScore extends Score {
  isLegacy?: boolean;
  isPioneer?: boolean;
  legacyTotal?: number;
}

interface UseEnhancedLeaderboardProps {
  currentPushups: Score[];
  currentSquats: Score[];
  chainId?: number;
}

export function useEnhancedLeaderboard({
  currentPushups,
  currentSquats,
  chainId,
}: UseEnhancedLeaderboardProps) {
  const [legacyScores, setLegacyScores] = useState<any[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(true);

  // Load legacy scores once
  useEffect(() => {
    const loadLegacy = async () => {
      try {
        const legacy = await getLegacyScores();
        setLegacyScores(legacy);
      } catch (error) {
        console.warn('Could not load legacy scores:', error);
      } finally {
        setLegacyLoading(false);
      }
    };

    loadLegacy();
  }, []);

  // Enhanced leaderboards with legacy data
  const enhancedLeaderboards = useMemo(() => {
    if (legacyLoading) {
      return {
        pushups: currentPushups,
        squats: currentSquats,
        loading: true,
      };
    }

    // Filter legacy scores by chain if specified
    const relevantLegacy = chainId
      ? legacyScores.filter((score) => score.chainId === chainId)
      : legacyScores;

    // Convert legacy to pushup/squat format
    const legacyPushups = relevantLegacy
      .filter((score) => score.pushups > 0)
      .map((score) => ({
        user: score.user,
        score: score.pushups,
        network: score.network || 'polygon', // default to polygon if not specified
        timestamp: score.timestamp,
        isLegacy: true,
      }));

    const legacySquats = relevantLegacy
      .filter((score) => score.squats > 0)
      .map((score) => ({
        user: score.user,
        score: score.squats,
        network: score.network || 'polygon', // default to polygon if not specified
        timestamp: score.timestamp,
        isLegacy: true,
      }));

    // Enhance current scores with pioneer status
    const enhancedPushups: EnhancedScore[] = [
      ...currentPushups.map((score) => ({
        ...score,
        isPioneer: hasLegacyScores(score.user, legacyScores),
        legacyTotal: getUserLegacyTotal(score.user, legacyScores),
      })),
      ...legacyPushups,
    ].sort((a, b) => b.score - a.score);

    const enhancedSquats: EnhancedScore[] = [
      ...currentSquats.map((score) => ({
        ...score,
        isPioneer: hasLegacyScores(score.user, legacyScores),
        legacyTotal: getUserLegacyTotal(score.user, legacyScores),
      })),
      ...legacySquats,
    ].sort((a, b) => b.score - a.score);

    return {
      pushups: enhancedPushups,
      squats: enhancedSquats,
      loading: false,
    };
  }, [currentPushups, currentSquats, legacyScores, legacyLoading, chainId]);

  // Helper functions
  const isPioneerUser = (userAddress: string) => {
    return hasLegacyScores(userAddress, legacyScores);
  };

  const getLegacyTotal = (userAddress: string) => {
    return getUserLegacyTotal(userAddress, legacyScores);
  };

  const getLegacyStats = () => {
    const uniqueUsers = [...new Set(legacyScores.map((score) => score.user))];
    const totalPushups = legacyScores.reduce((sum, score) => sum + score.pushups, 0);
    const totalSquats = legacyScores.reduce((sum, score) => sum + score.squats, 0);

    return {
      totalUsers: uniqueUsers.length,
      totalPushups,
      totalSquats,
      totalScore: totalPushups + totalSquats,
    };
  };

  return {
    // Enhanced leaderboards (drop-in replacement)
    pushupLeaderboard: enhancedLeaderboards.pushups,
    squatLeaderboard: enhancedLeaderboards.squats,
    loading: enhancedLeaderboards.loading,

    // Helper functions
    isPioneerUser,
    getLegacyTotal,
    getLegacyStats,

    // Raw legacy data if needed
    legacyScores,
    legacyLoading,
  };
}

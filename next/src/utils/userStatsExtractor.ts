/**
 * Utility to extract user-specific stats from leaderboard data
 * Reuses the same data source as the leaderboard for consistency
 */

import { Score } from "@/types";

export interface UserStats {
  totalSessions: number;
  bestPushups: number;
  bestSquats: number;
  currentStreak: number;
  activeChains: string[];
  totalScore: number;
  pushupsRank: number | null;
  squatsRank: number | null;
}

/**
 * Extract user-specific statistics from leaderboard data
 * @param userAddress - The user's wallet address
 * @param pushupLeaderboard - Array of pushup scores from leaderboard
 * @param squatLeaderboard - Array of squat scores from leaderboard
 * @returns UserStats object with calculated statistics
 */
export function extractUserStats(
  userAddress: string,
  pushupLeaderboard: Score[],
  squatLeaderboard: Score[]
): UserStats {
  if (!userAddress) {
    return {
      totalSessions: 0,
      bestPushups: 0,
      bestSquats: 0,
      currentStreak: 0,
      activeChains: [],
      totalScore: 0,
      pushupsRank: null,
      squatsRank: null,
    };
  }

  // Normalize address for comparison
  const normalizedAddress = userAddress.toLowerCase();

  console.log(`🔍 Looking for user stats for address: ${normalizedAddress}`);
  console.log(`📋 Available addresses in pushup leaderboard:`, pushupLeaderboard.map(s => s.user.toLowerCase()));
  console.log(`📋 Available addresses in squat leaderboard:`, squatLeaderboard.map(s => s.user.toLowerCase()));

  // Find user's scores across all networks
  const userPushupScores = pushupLeaderboard.filter(
    (score) => score.user.toLowerCase() === normalizedAddress
  );
  const userSquatScores = squatLeaderboard.filter(
    (score) => score.user.toLowerCase() === normalizedAddress
  );

  // Calculate best scores across all chains
  const bestPushups = userPushupScores.length > 0
    ? Math.max(...userPushupScores.map(s => s.score))
    : 0;

  const bestSquats = userSquatScores.length > 0
    ? Math.max(...userSquatScores.map(s => s.score))
    : 0;

  // Calculate total sessions (count unique workout submissions)
  // Each entry represents a workout session, so total unique entries
  const allUserScores = [...userPushupScores, ...userSquatScores];
  const totalSessions = allUserScores.length;

  console.log(`📊 User ${userAddress} stats:`, {
    userPushupScores: userPushupScores.map(s => `${s.score} on ${s.network}`),
    userSquatScores: userSquatScores.map(s => `${s.score} on ${s.network}`),
    bestPushups,
    bestSquats,
    totalSessions
  });

  // Get active chains
  const activeChains = Array.from(
    new Set(allUserScores.map(score => score.network))
  );

  // Calculate total score (best pushups + best squats)
  const totalScore = bestPushups + bestSquats;

  // Calculate rankings based on best scores
  // Group by user and get their best scores for ranking
  const pushupsByUser = new Map<string, number>();
  pushupLeaderboard.forEach(score => {
    const addr = score.user.toLowerCase();
    const currentBest = pushupsByUser.get(addr) || 0;
    if (score.score > currentBest) {
      pushupsByUser.set(addr, score.score);
    }
  });

  const squatsByUser = new Map<string, number>();
  squatLeaderboard.forEach(score => {
    const addr = score.user.toLowerCase();
    const currentBest = squatsByUser.get(addr) || 0;
    if (score.score > currentBest) {
      squatsByUser.set(addr, score.score);
    }
  });

  // Calculate rankings based on best scores
  const pushupsRank = bestPushups > 0
    ? Array.from(pushupsByUser.entries())
        .sort((a, b) => b[1] - a[1])
        .findIndex(([addr]) => addr === normalizedAddress) + 1
    : null;

  const squatsRank = bestSquats > 0
    ? Array.from(squatsByUser.entries())
        .sort((a, b) => b[1] - a[1])
        .findIndex(([addr]) => addr === normalizedAddress) + 1
    : null;

  console.log(`🏆 User rankings:`, {
    pushupsRank: pushupsRank ? `#${pushupsRank}` : 'N/A',
    squatsRank: squatsRank ? `#${squatsRank}` : 'N/A',
    bestPushups,
    bestSquats
  });

  // TODO: Calculate streak from workout history
  // For now, estimate based on number of sessions
  const currentStreak = Math.min(totalSessions, 7); // Cap at 7 days for now

  return {
    totalSessions,
    bestPushups,
    bestSquats,
    currentStreak,
    activeChains,
    totalScore,
    pushupsRank,
    squatsRank,
  };
}

/**
 * Format user stats for display in the profile
 */
export function formatUserStatsForProfile(stats: UserStats) {
  const { bestPushups, bestSquats, totalSessions, currentStreak, pushupsRank, squatsRank } = stats;

  // Determine best exercise type and overall best rank
  const bestExercise = bestPushups >= bestSquats ? 'pushups' : 'squats';
  const bestScore = Math.max(bestPushups, bestSquats);

  // Use the better ranking (lower number = better rank)
  let bestRank = null;
  if (pushupsRank && squatsRank) {
    bestRank = Math.min(pushupsRank, squatsRank);
  } else if (pushupsRank) {
    bestRank = pushupsRank;
  } else if (squatsRank) {
    bestRank = squatsRank;
  }

  return {
    workouts: `${totalSessions} session${totalSessions !== 1 ? 's' : ''}`,
    bestScore: bestScore > 0
      ? `${bestScore} ${bestExercise.slice(0, -1)}${bestScore !== 1 ? 's' : ''}`
      : 'No workouts',
    streak: `${currentStreak} day${currentStreak !== 1 ? 's' : ''}`,
    summary: totalSessions > 0 && bestRank
      ? `Rank #${bestRank} • ${stats.activeChains.length} chain${stats.activeChains.length !== 1 ? 's' : ''}`
      : totalSessions > 0
        ? `${stats.activeChains.length} chain${stats.activeChains.length !== 1 ? 's' : ''} active`
        : 'Start your first workout!'
  };
}

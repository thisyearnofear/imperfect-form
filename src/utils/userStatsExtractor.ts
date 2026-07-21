/**
 * Utility to extract user-specific stats from leaderboard data
 * Reuses the same data source as the leaderboard for consistency
 */

import { Score } from '@/types';
import { LocalWorkout } from '@/types/workout';

export interface UserStats {
  totalSessions: number;
  bestPushups: number;
  bestSquats: number;
  currentStreak: number;
  activeChains: string[];
  totalScore: number;
  pushupsRank: number | null;
  squatsRank: number | null;
  daysSinceLastWorkout?: number | null;
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
  squatLeaderboard: Score[],
  localWorkouts: LocalWorkout[] = []
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

  // Convert local workouts to Score format for merging
  const localScores: Score[] = localWorkouts
    .filter((w) => !w.userAddress || w.userAddress.toLowerCase() === normalizedAddress)
    .map((w) => ({
      user: normalizedAddress,
      score: w.reps,
      network: w.network || 'celo',
      timestamp: Math.floor(w.timestamp / 1000), // Leaderboard uses seconds
    }));

  // Merge and deduplicate scores by timestamp and score
  // We prioritize leaderboard scores if timestamps match
  const mergeScores = (leaderboard: Score[], local: Score[], type: 'pushups' | 'squats') => {
    const userLeaderboard = leaderboard.filter((s) => s.user.toLowerCase() === normalizedAddress);
    const userLocal = local.filter((s) => {
      // Find matching workout in localWorkouts to check type
      const original = localWorkouts.find(
        (lw) => lw.reps === s.score && Math.floor(lw.timestamp / 1000) === s.timestamp
      );
      return original?.type === type;
    });

    const combined = [...userLeaderboard];

    userLocal.forEach((l) => {
      const alreadyExists = userLeaderboard.some(
        (lb) => Math.abs((lb.timestamp || 0) - (l.timestamp || 0)) < 60 && lb.score === l.score
      );
      if (!alreadyExists) {
        combined.push(l);
      }
    });

    return combined;
  };

  const userPushupScores = mergeScores(pushupLeaderboard, localScores, 'pushups');
  const userSquatScores = mergeScores(squatLeaderboard, localScores, 'squats');

  // Calculate best scores across all sources
  const bestPushups =
    userPushupScores.length > 0 ? Math.max(...userPushupScores.map((s) => s.score)) : 0;

  const bestSquats =
    userSquatScores.length > 0 ? Math.max(...userSquatScores.map((s) => s.score)) : 0;

  // Calculate total sessions
  const allUserScores = [...userPushupScores, ...userSquatScores];
  const totalSessions = allUserScores.length;

  console.log(`📊 User ${userAddress} stats (merged):`, {
    bestPushups,
    bestSquats,
    totalSessions,
    localCount: localWorkouts.length,
  });

  // Get active chains
  const activeChains = Array.from(new Set(allUserScores.map((score) => score.network)));

  // Calculate total score
  const totalScore = bestPushups + bestSquats;

  // Rankings stay based on on-chain leaderboard only (for fairness)
  const pushupsByUser = new Map<string, number>();
  pushupLeaderboard.forEach((score) => {
    const addr = score.user.toLowerCase();
    const currentBest = pushupsByUser.get(addr) || 0;
    if (score.score > currentBest) {
      pushupsByUser.set(addr, score.score);
    }
  });

  const squatsByUser = new Map<string, number>();
  squatLeaderboard.forEach((score) => {
    const addr = score.user.toLowerCase();
    const currentBest = squatsByUser.get(addr) || 0;
    if (score.score > currentBest) {
      squatsByUser.set(addr, score.score);
    }
  });

  const pushupsRank =
    bestPushups > 0
      ? Array.from(pushupsByUser.entries())
          .sort((a, b) => b[1] - a[1])
          .findIndex(([addr]) => addr === normalizedAddress) + 1
      : null;

  const squatsRank =
    bestSquats > 0
      ? Array.from(squatsByUser.entries())
          .sort((a, b) => b[1] - a[1])
          .findIndex(([addr]) => addr === normalizedAddress) + 1
      : null;

  // Calculate streak and days since last workout using merged data
  const currentStreak = calculateWorkoutStreak(allUserScores);
  const daysSinceLastWorkout = calculateDaysSinceLastWorkout(allUserScores);

  return {
    totalSessions,
    bestPushups,
    bestSquats,
    currentStreak,
    activeChains,
    totalScore,
    pushupsRank: pushupsRank || null,
    squatsRank: squatsRank || null,
    daysSinceLastWorkout,
  };
}

/**
 * Calculate days since last workout for motivational messaging
 */
function calculateDaysSinceLastWorkout(userScores: Score[]): number | null {
  if (userScores.length === 0) return null;

  const scoresWithTimestamps = userScores.filter(
    (score) => score.timestamp != null && score.timestamp > 0
  );

  if (scoresWithTimestamps.length === 0) return null;

  // Find most recent workout
  const mostRecentTimestamp = Math.max(...scoresWithTimestamps.map((s) => s.timestamp || 0));
  const mostRecentDate = new Date(mostRecentTimestamp * 1000);
  const today = new Date();

  const timeDiff = today.getTime() - mostRecentDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  return daysDiff;
}

/**
 * Generate motivational text based on user activity patterns
 */
function generateMotivationalText(
  streak: number,
  totalSessions: number,
  daysSinceLastWorkout: number | null
): { streakText: string; summaryText: string } {
  // New user (no workouts)
  if (totalSessions === 0) {
    return {
      streakText: 'Start your journey! 💪',
      summaryText: 'Your first workout awaits!',
    };
  }

  // Handle case where we have no timestamp data (streak will be 0, daysSince will be null)
  // UX FIX: Don't show total count as a streak. Be honest about status.
  if (daysSinceLastWorkout === null && streak === 0) {
    return {
      streakText: 'Active',
      summaryText: 'Keep building your fitness habit!',
    };
  }

  // Active streak (worked out recently)
  if (streak > 0) {
    const streakEmoji = streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '💪';
    return {
      streakText: `${streak} Day${streak !== 1 ? 's' : ''} ${streakEmoji}`,
      summaryText: 'Keep the momentum going!',
    };
  }

  // Inactive user - show days since last workout with motivation
  if (daysSinceLastWorkout !== null && daysSinceLastWorkout >= 1) {
    const motivationalTexts = getMotivationalMessage(daysSinceLastWorkout, totalSessions);
    return {
      streakText: motivationalTexts.streakText,
      summaryText: motivationalTexts.summaryText,
    };
  }

  // Fallback for edge cases (0 streak, 0 sessions, or unknown state)
  return {
    streakText: 'Start Today!',
    summaryText: 'Time for your next workout!',
  };
}

/**
 * Get contextual motivational messages based on inactivity period
 */
function getMotivationalMessage(
  daysSince: number,
  totalSessions: number
): { streakText: string; summaryText: string } {
  const isExperienced = totalSessions >= 5;

  if (daysSince === 1) {
    return {
      streakText: '1 day away',
      summaryText: 'Time to get back in there! 💪',
    };
  }

  if (daysSince <= 3) {
    return {
      streakText: `${daysSince} days away`,
      summaryText: isExperienced ? 'Your muscles are ready! 🚀' : "Let's jump back in! ⚡",
    };
  }

  if (daysSince <= 7) {
    return {
      streakText: `${daysSince} days away`,
      summaryText: isExperienced ? 'We miss you! 🔥' : 'Your comeback starts now! 💫',
    };
  }

  if (daysSince <= 14) {
    return {
      streakText: `${daysSince} days away`,
      summaryText: isExperienced ? 'Fitness is calling! 📞' : 'Fresh start time! 🌅',
    };
  }

  if (daysSince <= 30) {
    return {
      streakText: `${daysSince} days away`,
      summaryText: isExperienced ? "Let's rebuild! 🏗️" : 'Rediscover your potential! 🗝️',
    };
  }

  // More than 30 days
  return {
    streakText: `${daysSince} days away`,
    summaryText: isExperienced
      ? 'Welcome back, warrior! 👑'
      : 'Every expert was once a beginner! 🎯',
  };
}

/**
 * Calculate current workout streak based on timestamps
 * ENHANCEMENT: Proper streak calculation from workout history
 * FALLBACK: Returns estimation if timestamps not available
 */
function calculateWorkoutStreak(userScores: Score[]): number {
  if (userScores.length === 0) return 0;

  console.log('🕐 calculateWorkoutStreak called with scores:', {
    totalScores: userScores.length,
    scores: userScores.map((s) => ({
      score: s.score,
      network: s.network,
      timestamp: s.timestamp,
      date: s.timestamp ? new Date(s.timestamp * 1000).toISOString() : 'no timestamp',
    })),
  });

  console.log('🔍 Raw userScores input:', userScores);
  console.log('🔍 First score detailed:', userScores[0]);
  console.log('🔍 Second score detailed:', userScores[1]);

  console.log('🔍 Checking for timestamp fields in first score:', {
    timestamp: userScores[0]?.timestamp,
    allKeys: Object.keys(userScores[0] || {}),
  });

  // Check if timestamps are available
  const scoresWithTimestamps = userScores.filter(
    (score) => score.timestamp != null && score.timestamp > 0
  );

  console.log('📅 Timestamp analysis:', {
    totalScores: userScores.length,
    scoresWithTimestamps: scoresWithTimestamps.length,
    missingTimestamps: userScores.length - scoresWithTimestamps.length,
  });

  if (scoresWithTimestamps.length === 0) {
    // No timestamps available - don't show fake streaks
    console.log('⚠️ No timestamps available, cannot calculate real streaks');
    return 0; // Return 0 streak instead of fake estimation
  }

  // Sort scores by timestamp (newest first)
  const sortedScores = scoresWithTimestamps.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Get unique workout days (in YYYY-MM-DD format)
  const workoutDays = new Set<string>();
  sortedScores.forEach((score) => {
    if (score.timestamp) {
      const date = new Date(score.timestamp * 1000);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      workoutDays.add(dayKey);
    }
  });

  const uniqueDays = Array.from(workoutDays).sort().reverse(); // Most recent first

  if (uniqueDays.length === 0) return Math.min(userScores.length, 7); // Fallback

  // Check if the most recent workout was today or yesterday
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  const mostRecentDay = uniqueDays[0];

  console.log('🗓️ Streak validation check:', {
    today: todayKey,
    yesterday: yesterdayKey,
    mostRecentWorkout: mostRecentDay,
    uniqueWorkoutDays: uniqueDays,
    isRecentEnoughForStreak: mostRecentDay === todayKey || mostRecentDay === yesterdayKey,
    shouldHaveStreak: mostRecentDay === todayKey || mostRecentDay === yesterdayKey,
  });

  // If the most recent workout isn't today or yesterday, streak is 0
  if (mostRecentDay !== todayKey && mostRecentDay !== yesterdayKey) {
    console.log('💔 Streak broken - most recent workout was not today or yesterday');
    return 0;
  }

  // Calculate consecutive days
  let streak = 1;
  let currentDate = new Date(mostRecentDay);

  for (let i = 1; i < uniqueDays.length; i++) {
    const previousDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    const expectedDayKey = previousDate.toISOString().split('T')[0];

    if (uniqueDays[i] === expectedDayKey) {
      streak++;
      currentDate = previousDate;
    } else {
      break;
    }
  }

  const finalStreak = Math.min(streak, 30); // Cap at 30 days for reasonable limits

  console.log('🔥 Final streak calculation:', {
    calculatedStreak: streak,
    finalStreak: finalStreak,
    consecutiveDays: uniqueDays.slice(0, streak),
  });

  return finalStreak;
}

/**
 * Format user stats for display in the profile
 */
export function formatUserStatsForProfile(stats: UserStats) {
  const {
    bestPushups,
    bestSquats,
    totalSessions,
    currentStreak,
    pushupsRank: _pushupsRank,
    squatsRank: _squatsRank,
    daysSinceLastWorkout,
  } = stats;

  // Determine best exercise type and overall best rank
  const bestExercise = bestPushups >= bestSquats ? 'pushups' : 'squats';
  const bestScore = Math.max(bestPushups, bestSquats);

  // Generate motivational streak/activity text
  const { streakText, summaryText } = generateMotivationalText(
    currentStreak,
    totalSessions,
    daysSinceLastWorkout ?? null
  );

  const result = {
    // UX IMPROVEMENT: Concise "3" instead of "3 sessions"
    workouts: totalSessions.toString(),
    bestScore:
      bestScore > 0
        ? // UX IMPROVEMENT: "21 Pushups" (kept as is, good balance)
          `${bestScore} ${bestExercise.slice(0, -1)}${bestScore !== 1 ? 's' : ''}`
        : '-',
    // UX IMPROVEMENT: Ensure this is always time-based or action-oriented
    streak: streakText,
    summary: summaryText,
  };

  return result;
}

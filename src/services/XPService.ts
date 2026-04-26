/**
 * XPService - Handles XP calculation, leveling logic, and Personal Best detection
 *
 * This service drives user retention by providing a sense of progression
 * and achievement, especially for freemium users.
 */

import { LocalWorkout } from '@/types/workout';

export interface XpProgress {
  totalXp: number;
  currentLevel: number;
  xpToNextLevel: number;
  progressToNextLevel: number; // 0 to 1
  levelMinXp: number;
  levelMaxXp: number;
}

export interface PersonalBests {
  pushups: number;
  squats: number;
}

export const XP_CONSTANTS = {
  XP_PER_REP: 10,
  XP_PER_WORKOUT: 50,
  XP_PER_PB: 100,
  LEVEL_BASE_XP: 1000,
};

class XPServiceImpl {
  /**
   * Calculate XP for a set of workouts
   */
  calculateTotalXp(workouts: LocalWorkout[]): number {
    let totalXp = 0;
    const pbs = { pushups: 0, squats: 0 };

    // Sort workouts by timestamp to detect PBs in order
    const sortedWorkouts = [...workouts].sort((a, b) => a.timestamp - b.timestamp);

    for (const workout of sortedWorkouts) {
      // Base XP from reps
      totalXp += workout.reps * XP_CONSTANTS.XP_PER_REP;

      // Completion bonus
      totalXp += XP_CONSTANTS.XP_PER_WORKOUT;

      // PB bonus
      if (workout.type === 'pushups' && workout.reps > pbs.pushups) {
        if (pbs.pushups > 0) totalXp += XP_CONSTANTS.XP_PER_PB;
        pbs.pushups = workout.reps;
      } else if (workout.type === 'squats' && workout.reps > pbs.squats) {
        if (pbs.squats > 0) totalXp += XP_CONSTANTS.XP_PER_PB;
        pbs.squats = workout.reps;
      }
    }

    return totalXp;
  }

  /**
   * Calculate Level progress from total XP
   * Formula: XP = 500 * L * (L-1)
   */
  getXpProgress(totalXp: number): XpProgress {
    // L = (1 + sqrt(1 + 8 * totalXp / 500)) / 2
    const level = Math.floor((1 + Math.sqrt(1 + (8 * totalXp) / 500)) / 2);

    const currentLevelMinXp = 500 * level * (level - 1);
    const nextLevelMinXp = 500 * (level + 1) * level;

    const xpInCurrentLevel = totalXp - currentLevelMinXp;
    const xpNeededForNextLevel = nextLevelMinXp - currentLevelMinXp;
    const progress = Math.min(xpInCurrentLevel / xpNeededForNextLevel, 0.999);

    return {
      totalXp,
      currentLevel: level,
      xpToNextLevel: nextLevelMinXp - totalXp,
      progressToNextLevel: progress,
      levelMinXp: currentLevelMinXp,
      levelMaxXp: nextLevelMinXp,
    };
  }

  /**
   * Detect Personal Bests from workouts
   */
  getPersonalBests(workouts: LocalWorkout[]): PersonalBests {
    const pbs = { pushups: 0, squats: 0 };

    for (const workout of workouts) {
      if (workout.type === 'pushups') {
        pbs.pushups = Math.max(pbs.pushups, workout.reps);
      } else if (workout.type === 'squats') {
        pbs.squats = Math.max(pbs.squats, workout.reps);
      }
    }

    return pbs;
  }
}

export const xpService = new XPServiceImpl();
export default xpService;

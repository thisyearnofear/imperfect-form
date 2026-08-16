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
  pullups: number;
  jumps: number;
  curls: number;
}

export const XP_CONSTANTS = {
  XP_PER_REP: 10,
  XP_PER_WORKOUT: 50,
  XP_PER_PB: 100,
  LEVEL_BASE_XP: 1000,
  XP_PER_QUEST: 100, // Default reward if not specified
  STREAK_3_MULTIPLIER: 1.2,
  STREAK_7_MULTIPLIER: 1.5,
  // Form-quality multiplier clamps (0.5×–1.5×). The score loop must pull
  // the same direction as the coaching loop: sloppy volume can no longer
  // out-earn clean reps. Workouts without a form grade (modes without
  // per-rep scoring yet) stay at 1.0×.
  FORM_MULTIPLIER_FLOOR: 0.5,
  FORM_MULTIPLIER_CEIL: 1.5,
};

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  multiplier: number;
}

class XPServiceImpl {
  /**
   * Form-quality multiplier for a workout's rep XP: 0.5×–1.5× from the
   * average per-rep form score (0–100). Ungraded workouts return 1 — the
   * multiplier never punishes a mode the engine can't score yet.
   */
  private formMultiplierFor(workout: LocalWorkout): number {
    const avg = workout.formScoreAvg;
    if (typeof avg !== 'number' || !Number.isFinite(avg) || avg <= 0) return 1;
    const scaled =
      XP_CONSTANTS.FORM_MULTIPLIER_FLOOR +
      (Math.min(Math.max(avg, 0), 100) / 100) *
        (XP_CONSTANTS.FORM_MULTIPLIER_CEIL - XP_CONSTANTS.FORM_MULTIPLIER_FLOOR);
    return scaled;
  }

  /**
   * Calculate XP for a set of workouts
   */
  calculateTotalXp(workouts: LocalWorkout[], questXp: number = 0): number {
    let totalXp = questXp;
    // PB detection covers every exercise the app tracks — curl and pull-up
    // personal bests pay the same bonus push-ups always did.
    const pbs: PersonalBests = { pushups: 0, squats: 0, pullups: 0, jumps: 0, curls: 0 };

    // Sort workouts by timestamp to detect PBs and streaks in order
    const sortedWorkouts = [...workouts].sort((a, b) => a.timestamp - b.timestamp);

    // To calculate streaks as we go
    const workoutsByDay: { [key: string]: boolean } = {};

    for (let i = 0; i < sortedWorkouts.length; i++) {
      const workout = sortedWorkouts[i];
      const day = new Date(workout.timestamp).toLocaleDateString();
      workoutsByDay[day] = true;

      // Calculate streak multiplier for THIS workout
      const multiplier = this.getMultiplierForDate(workout.timestamp, sortedWorkouts.slice(0, i));

      // Rep XP is graded by form quality; the completion bonus stays flat —
      // showing up is rewarded, sloppiness just stops out-earning control.
      const workoutXp =
        Math.round(workout.reps * XP_CONSTANTS.XP_PER_REP * this.formMultiplierFor(workout)) +
        XP_CONSTANTS.XP_PER_WORKOUT;

      // Apply multiplier
      totalXp += Math.floor(workoutXp * multiplier);

      // PB bonus (PBs are not multiplied)
      const type = workout.type as keyof PersonalBests;
      if (type in pbs && workout.reps > pbs[type]) {
        if (pbs[type] > 0) totalXp += XP_CONSTANTS.XP_PER_PB;
        pbs[type] = workout.reps;
      }
    }

    return totalXp;
  }

  /**
   * Get multiplier for a specific date based on previous workouts
   */
  private getMultiplierForDate(timestamp: number, previousWorkouts: LocalWorkout[]): number {
    const streak = this.getStreakAtTimestamp(timestamp, previousWorkouts);
    if (streak >= 7) return XP_CONSTANTS.STREAK_7_MULTIPLIER;
    if (streak >= 3) return XP_CONSTANTS.STREAK_3_MULTIPLIER;
    return 1;
  }

  /**
   * Calculate streak at a specific timestamp
   */
  private getStreakAtTimestamp(timestamp: number, previousWorkouts: LocalWorkout[]): number {
    const uniqueDays = new Set<string>();
    uniqueDays.add(new Date(timestamp).toLocaleDateString());

    for (const w of previousWorkouts) {
      uniqueDays.add(new Date(w.timestamp).toLocaleDateString());
    }

    const days = Array.from(uniqueDays).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    const targetDay = new Date(timestamp).toLocaleDateString();

    let currentStreak = 0;
    const checkDate = new Date(targetDay);

    // Start checking from targetDay backwards
    for (let i = 0; i < days.length; i++) {
      const dayStr = days[i];
      if (new Date(dayStr).getTime() > new Date(targetDay).getTime()) continue;

      if (dayStr === checkDate.toLocaleDateString()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (new Date(dayStr).getTime() < checkDate.getTime()) {
        // Gap found
        break;
      }
    }

    return currentStreak;
  }

  /**
   * Get current streak information
   */
  getStreakInfo(workouts: LocalWorkout[]): StreakInfo {
    if (workouts.length === 0) {
      return { currentStreak: 0, bestStreak: 0, multiplier: 1 };
    }

    const uniqueDays = new Set<string>();
    for (const w of workouts) {
      uniqueDays.add(new Date(w.timestamp).toLocaleDateString());
    }

    const days = Array.from(uniqueDays).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    let currentStreak = 0;
    if (days[0] === today || days[0] === yesterday) {
      const checkDate = new Date(days[0]);
      for (const day of days) {
        if (day === checkDate.toLocaleDateString()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Best streak
    let bestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;
    const sortedDays = Array.from(uniqueDays).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    for (const dayStr of sortedDays) {
      const currentDate = new Date(dayStr);
      if (!lastDate) {
        tempStreak = 1;
      } else {
        const diff = currentDate.getTime() - lastDate.getTime();
        if (diff <= 86400000 * 1.5) {
          // Allow for some timezone/timing wiggle room, but roughly 1 day
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      lastDate = currentDate;
      bestStreak = Math.max(bestStreak, tempStreak);
    }

    let multiplier = 1;
    if (currentStreak >= 7) multiplier = XP_CONSTANTS.STREAK_7_MULTIPLIER;
    else if (currentStreak >= 3) multiplier = XP_CONSTANTS.STREAK_3_MULTIPLIER;

    return { currentStreak, bestStreak, multiplier };
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
    const pbs: PersonalBests = { pushups: 0, squats: 0, pullups: 0, jumps: 0, curls: 0 };

    for (const workout of workouts) {
      const type = workout.type as keyof PersonalBests;
      if (type in pbs) {
        pbs[type] = Math.max(pbs[type], workout.reps);
      }
    }

    return pbs;
  }
}

export const xpService = new XPServiceImpl();
export default xpService;

/**
 * AchievementService - Handles milestone tracking and achievement unlocking
 *
 * This service rewards users for reaching specific milestones,
 * encouraging long-term engagement.
 */

import { LocalWorkout } from '@/types/workout';
import { getOfflineDataStore } from './OfflineDataStore';
import { xpService } from './XPService';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_workout',
    name: 'First Workout',
    description: 'Completed your first workout session!',
    icon: '🚀',
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Exercised for 3 consecutive days!',
    icon: '🔥',
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Exercised for a full week! You are on fire!',
    icon: '👑',
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Reached 100 total reps across all workouts!',
    icon: '💯',
  },
  {
    id: 'powerhouse',
    name: 'Powerhouse',
    description: 'Completed 50 reps in a single session!',
    icon: '💪',
  },
];

class AchievementServiceImpl {
  private STORAGE_KEY = 'user_achievements';

  /**
   * Get all unlocked achievements
   */
  async getUnlockedAchievements(): Promise<Achievement[]> {
    const offlineStore = getOfflineDataStore();
    const unlockedIds = (await offlineStore.get<string[]>(this.STORAGE_KEY)) || [];

    return ACHIEVEMENTS.map((a) => {
      const unlockedAt = unlockedIds.find((id) => id === a.id);
      return unlockedAt ? { ...a, unlockedAt: Date.now() } : a; // Note: We don't store the exact time currently, just that it's unlocked
    }).filter((a) => unlockedIds.includes(a.id));
  }

  /**
   * Check for new achievements after a workout
   */
  async checkAchievements(workouts: LocalWorkout[]): Promise<Achievement[]> {
    const offlineStore = getOfflineDataStore();
    const unlockedIds = (await offlineStore.get<string[]>(this.STORAGE_KEY)) || [];
    const newlyUnlocked: Achievement[] = [];

    const streakInfo = xpService.getStreakInfo(workouts);
    const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0);
    const maxRepsSingle = workouts.reduce((max, w) => Math.max(max, w.reps), 0);

    const checkAndUnlock = (id: string) => {
      if (!unlockedIds.includes(id)) {
        unlockedIds.push(id);
        const achievement = ACHIEVEMENTS.find((a) => a.id === id);
        if (achievement) newlyUnlocked.push(achievement);
      }
    };

    // 1. First Workout
    if (workouts.length >= 1) {
      checkAndUnlock('first_workout');
    }

    // 2. Streaks
    if (streakInfo.currentStreak >= 3) {
      checkAndUnlock('streak_3');
    }
    if (streakInfo.currentStreak >= 7) {
      checkAndUnlock('streak_7');
    }

    // 3. Centurion
    if (totalReps >= 100) {
      checkAndUnlock('centurion');
    }

    // 4. Powerhouse
    if (maxRepsSingle >= 50) {
      checkAndUnlock('powerhouse');
    }

    if (newlyUnlocked.length > 0) {
      await offlineStore.set(this.STORAGE_KEY, unlockedIds);
    }

    return newlyUnlocked;
  }
}

export const achievementService = new AchievementServiceImpl();
export default achievementService;

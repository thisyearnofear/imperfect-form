'use client';

import { useState, useEffect, useCallback } from 'react';
import { achievementService, Achievement } from '@/services/AchievementService';
import { getLocalWorkouts } from '@/services/integrations/WorkoutDataAdapter';
import { LocalWorkout } from '@/types/workout';

export function useAchievements() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAchievements = useCallback(async () => {
    setIsLoading(true);
    try {
      const unlocked = await achievementService.getUnlockedAchievements();
      setUnlockedAchievements(unlocked);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkNewAchievements = useCallback(
    async (workouts?: LocalWorkout[]) => {
      try {
        const allWorkouts = workouts || (await getLocalWorkouts());
        const newlyUnlocked = await achievementService.checkAchievements(allWorkouts);
        if (newlyUnlocked.length > 0) {
          await refreshAchievements();
        }
        return newlyUnlocked;
      } catch (error) {
        console.error('Failed to check achievements:', error);
        return [];
      }
    },
    [refreshAchievements]
  );

  useEffect(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  return {
    unlockedAchievements,
    isLoading,
    refreshAchievements,
    checkNewAchievements,
  };
}

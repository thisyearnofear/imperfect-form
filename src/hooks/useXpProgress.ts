import { useState, useEffect, useMemo } from 'react';
import { xpService, XpProgress, PersonalBests } from '@/services/XPService';
import { getLocalWorkouts, WORKOUT_KEYS } from '@/services/integrations/WorkoutDataAdapter';
import { getDataSyncService } from '@/services/DataSyncService';
import { LocalWorkout } from '@/types/workout';

export const useXpProgress = () => {
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = async () => {
    setLoading(true);
    try {
      const data = await getLocalWorkouts();
      setWorkouts(data);
    } catch (error) {
      console.error('Failed to fetch workouts for XP calculation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();

    // Subscribe to workout changes
    const service = getDataSyncService();
    const unsubscribe = service.subscribe(WORKOUT_KEYS.ALL, (data: LocalWorkout[]) => {
      setWorkouts(data);
    });

    return () => unsubscribe();
  }, []);

  const progress = useMemo(() => {
    const totalXp = xpService.calculateTotalXp(workouts);
    return xpService.getXpProgress(totalXp);
  }, [workouts]);

  const pbs = useMemo(() => {
    return xpService.getPersonalBests(workouts);
  }, [workouts]);

  return {
    workouts,
    progress,
    pbs,
    loading,
    refresh: fetchWorkouts,
  };
};

/**
 * WorkoutDataAdapter - Handles local persistence of workout sessions
 *
 * This adapter enables the freemium model by allowing workouts to be
 * saved locally immediately, with optional on-chain syncing later.
 */

import { getDataSyncService, createDataKey } from '@/services/DataSyncService';
import { getOfflineDataStore } from '@/services/OfflineDataStore';
import { LocalWorkout } from '@/types/workout';

// Data keys for workout-related data
export const WORKOUT_KEYS = {
  ALL: createDataKey('workouts:all'),
} as const;

/**
 * Initialize and register workout data sources
 */
export async function initializeWorkoutSources(): Promise<void> {
  const service = getDataSyncService();
  const offlineStore = getOfflineDataStore();

  // Register the all workouts data source
  service.register<LocalWorkout[]>(WORKOUT_KEYS.ALL, {
    fetch: async () => {
      try {
        const workouts = await offlineStore.get<LocalWorkout[]>('workouts:all');
        return workouts || [];
      } catch (error) {
        console.error('Failed to fetch local workouts:', error);
        return [];
      }
    },
    mutate: async (workout: LocalWorkout) => {
      try {
        const workouts = (await offlineStore.get<LocalWorkout[]>('workouts:all')) || [];

        // Update existing or add new workout
        const index = workouts.findIndex((w) => w.id === workout.id);
        if (index >= 0) {
          workouts[index] = { ...workouts[index], ...workout };
        } else {
          workouts.push(workout);
        }

        // Sort by timestamp descending (newest first)
        workouts.sort((a, b) => b.timestamp - a.timestamp);

        await offlineStore.set('workouts:all', workouts);
        return workouts;
      } catch (error) {
        console.error('Failed to save local workout:', error);
        throw error;
      }
    },
  });
}

/**
 * Save a workout session locally
 */
export async function saveLocalWorkout(workout: LocalWorkout): Promise<void> {
  const service = getDataSyncService();
  await service.mutate(WORKOUT_KEYS.ALL, workout, {
    optimistic: await getLocalWorkouts().then((current) => {
      const index = current.findIndex((w) => w.id === workout.id);
      if (index >= 0) {
        const updated = [...current];
        updated[index] = { ...updated[index], ...workout };
        return updated;
      }
      return [workout, ...current];
    }),
  });
}

/**
 * Get all local workouts
 */
export async function getLocalWorkouts(): Promise<LocalWorkout[]> {
  const service = getDataSyncService();
  try {
    return await service.fetch<LocalWorkout[]>(WORKOUT_KEYS.ALL);
  } catch (error) {
    return [];
  }
}

/**
 * Mark a specific workout as synced on-chain
 */
export async function markWorkoutSynced(id: string, txHash: string, network?: any): Promise<void> {
  const workouts = await getLocalWorkouts();
  const workout = workouts.find((w) => w.id === id);
  if (workout) {
    await saveLocalWorkout({
      ...workout,
      synced: true,
      txHash,
      network: network || workout.network,
    });
  }
}

/**
 * Invalidate workout cache to trigger re-renders
 */
export function invalidateWorkouts(): void {
  const service = getDataSyncService();
  service.invalidate(WORKOUT_KEYS.ALL);
}

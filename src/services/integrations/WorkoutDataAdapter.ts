/**
 * WorkoutDataAdapter - Handles local persistence of workout sessions
 *
 * This adapter enables the freemium model by allowing workouts to be
 * saved locally immediately, with optional on-chain syncing later.
 */

import { getDataSyncService, createDataKey } from '@/services/DataSyncService';
import { getOfflineDataStore } from '@/services/OfflineDataStore';
import { LocalWorkout, SessionSnapshot } from '@/types/workout';

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
 * Save a workout trace separately
 */
export async function saveWorkoutTrace(workoutId: string, trace: SessionSnapshot[]): Promise<void> {
  const offlineStore = getOfflineDataStore();
  await offlineStore.set(`trace:${workoutId}`, trace);

  // Update the workout record to indicate it has a trace
  const workouts = await getLocalWorkouts();
  const workout = workouts.find((w) => w.id === workoutId);
  if (workout) {
    await saveLocalWorkout({
      ...workout,
      hasTrace: true,
    });
  }
}

/**
 * Get a workout trace
 */
export async function getWorkoutTrace(workoutId: string): Promise<SessionSnapshot[] | null> {
  const offlineStore = getOfflineDataStore();
  return await offlineStore.get<SessionSnapshot[]>(`trace:${workoutId}`);
}

/**
 * Get the personal best workout for a user and mode
 */
export async function getPersonalBestWorkout(
  userAddress: string | undefined,
  mode: import('@/utils/biomechanics').ExerciseMode
): Promise<LocalWorkout | null> {
  const workouts = await getLocalWorkouts();

  // Filter by mode and userAddress if provided
  const relevantWorkouts = workouts.filter((w) => {
    const modeMatch = w.type === mode;
    const addressMatch = !userAddress || w.userAddress === userAddress;
    return modeMatch && addressMatch;
  });

  if (relevantWorkouts.length === 0) return null;

  // Find the one with max reps
  return relevantWorkouts.reduce((prev, current) => (prev.reps > current.reps ? prev : current));
}

/**
 * One-time merge of guest-era workouts into a newly connected wallet address.
 * Safe to call repeatedly - once migrated, no workouts match the guest ID.
 */
export async function migrateGuestWorkouts(address: string): Promise<number> {
  const { getGuestId } = await import('../guestIdentity');
  const guestId = getGuestId();
  if (!address || address === guestId) return 0;

  const workouts = await getLocalWorkouts();
  const guestWorkouts = workouts.filter((w) => w.userAddress === guestId);
  for (const workout of guestWorkouts) {
    await saveLocalWorkout({ ...workout, userAddress: address });
  }
  if (guestWorkouts.length > 0) {
    console.log(`🔗 Merged ${guestWorkouts.length} guest workout(s) into ${address}`);
  }
  return guestWorkouts.length;
}

/**
 * Invalidate workout cache to trigger re-renders
 */
export function invalidateWorkouts(): void {
  const service = getDataSyncService();
  service.invalidate(WORKOUT_KEYS.ALL);
}

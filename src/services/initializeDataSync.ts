/**
 * Initialize DataSync - Called at app startup
 *
 * Sets up all data sources and ensures DataSyncService is ready
 * Call this in your app layout or _app.tsx before rendering components
 */

import { initializeLeaderboardSources } from '@/services/integrations/LeaderboardDataAdapter';
import { initializeWorkoutSources } from '@/services/integrations/WorkoutDataAdapter';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('DataSyncInit');

let initialized = false;

export async function initializeDataSync(): Promise<void> {
  if (initialized) {
    logger.debug('DataSync already initialized');
    return;
  }

  try {
    logger.info('Initializing DataSync services...');

    // Initialize leaderboard data sources
    await initializeLeaderboardSources();
    logger.info('✅ Leaderboard data sources initialized');

    // Initialize workout data sources
    await initializeWorkoutSources();
    logger.info('✅ Workout data sources initialized');

    // TODO: Add more data sources as they're integrated
    // - User stats
    // - Profile data
    // - Wallet data
    // - etc.

    initialized = true;
    logger.info('✅ DataSync initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize DataSync', error);
    // Don't throw - let app continue with degraded functionality
    // Data sources will handle their own errors
  }
}

export function isDataSyncInitialized(): boolean {
  return initialized;
}

/**
 * Centralized service exports for better organization
 * CONSOLIDATION: Simplified, focused on core data & platform services
 */

export { walletDetectionService } from './WalletDetectionService';
export { getMemoryClient } from './memoryApi';
export { getDataSyncService, createDataKey } from './DataSyncService';
export { getOfflineDataStore } from './OfflineDataStore';

// Export service types
export type {
  DataKey,
  DataSource,
  SyncOptions,
  MutationOptions,
  SubscriptionOptions,
  CacheEntry,
} from './DataSyncService';

export type { StoredData, SyncRecord } from './OfflineDataStore';

export type { IdentityNode, IdentityGraph, SocialProfile } from './memoryApi';

// Re-export types for convenience
export type {
  NetworkConfig,
  ScoreSubmissionParams,
  ScoreSubmissionResult,
  UserScore,
} from '../types/contracts';

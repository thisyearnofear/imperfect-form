/**
 * Centralized service exports for better organization
 * CONSOLIDATION: Simplified after removing ContractService and WalletService
 */

export { walletDetectionService } from './WalletDetectionService';

// Re-export types for convenience
export type {
  NetworkConfig,
  ScoreSubmissionParams,
  ScoreSubmissionResult,
  UserScore,
} from '../types/contracts';

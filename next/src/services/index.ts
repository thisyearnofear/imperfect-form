/**
 * Centralized service exports for better organization
 */

export { ContractService, contractService } from './ContractService';
export { WalletService, walletService } from './WalletService';

// Re-export types for convenience
export type {
  NetworkConfig,
  ScoreSubmissionParams,
  ScoreSubmissionResult,
  UserScore,
  ContractServiceState,
  TransactionOptions,
  ContractCallResult
} from '../types/contracts';
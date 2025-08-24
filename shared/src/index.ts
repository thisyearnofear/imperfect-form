/**
 * Shared library exports
 */

// Types
export type {
  NetworkConfig,
  UserScore,
  LeaderboardEntry,
  TransactionResult,
  WalletConnection
} from './types';

// Validation
export {
  ScoreSchema,
  AddressSchema,
  ChainIdSchema,
  NetworkConfigSchema,
  validateScore,
  validateAddress,
  validateChainId
} from './utils/validation';
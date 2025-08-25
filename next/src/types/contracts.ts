/**
 * Contract-related type definitions for better type safety
 */

export interface NetworkConfig {
  chainId: number;
  name: string;
  contractAddress: string;
  abi: any[];
  rpcUrl?: string;
  blockExplorer?: string;
}

export interface ScoreSubmissionParams {
  pushups: number;
  squats: number;
  contractAddress: string;
  networkName: string;
}

export interface ScoreSubmissionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  processingType?: 'direct' | 'wagmi' | 'fallback';
  useSpendLimit?: boolean;
}

export interface UserScore {
  pushups: number;
  squats: number;
  totalScore?: number;
  lastUpdated?: Date;
}

export interface ContractServiceState {
  isInitialized: boolean;
  userAddress: string | null;
  currentNetwork: NetworkConfig | null;
  lastError: string | null;
}

export interface TransactionOptions {
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  value?: bigint;
}

export interface ContractCallResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;
}

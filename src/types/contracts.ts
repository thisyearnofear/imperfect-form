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

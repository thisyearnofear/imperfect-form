/**
 * Shared types across the monorepo
 */

export interface NetworkConfig {
  chainId: number;
  name: string;
  contractAddress: string;
  abi: any[];
  rpcUrl?: string;
  blockExplorer?: string;
}

export interface UserScore {
  pushups: number;
  squats: number;
  totalScore?: number;
  lastUpdated?: Date;
}

export interface LeaderboardEntry {
  address: string;
  pushups: number;
  squats: number;
  totalScore: number;
  rank: number;
  isVerified?: boolean;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  gasUsed?: bigint;
}

export interface WalletConnection {
  address: string;
  chainId: number;
  isConnected: boolean;
  provider?: any;
}
/**
 * Simple Legacy Data Preservation
 *
 * Automatically fetches and preserves legacy scores in the frontend
 * No manual management required - just works seamlessly
 */

import { ethers } from 'ethers';

// Legacy contract addresses (old contracts that are now legacy)
const LEGACY_ADDRESSES = {
  42220: {
    // Celo
    standard: '0xB0cbC7325EbC744CcB14211CA74C5a764928F273',
    verified: '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03',
  },
  137: '0xc783d6E12560dc251F5067A62426A5f3b45b6888', // Polygon (legacy)
  8453: '0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B', // Base (legacy)
  10143: '0x653d41Fba630381aA44d8598a4b35Ce257924d65', // Monad (legacy)
};

const RPC_URLS = {
  42220: 'https://forno.celo.org',
  137: 'https://polygon-rpc.com',
  8453: 'https://mainnet.base.org',
  10143: 'https://testnet-rpc.monad.xyz',
};

// Simple ABI for getting leaderboard data
const SIMPLE_ABI = [
  {
    inputs: [],
    name: 'getLeaderboard',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'pushups', type: 'uint256' },
          { internalType: 'uint256', name: 'squats', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct Score[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

interface LegacyScore {
  user: string;
  pushups: number;
  squats: number;
  timestamp: number;
  chainId: number;
  isLegacy: true;
}

/**
 * Fetch legacy scores from a single contract
 */
async function fetchLegacyFromContract(
  contractAddress: string,
  chainId: number
): Promise<LegacyScore[]> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URLS[chainId as keyof typeof RPC_URLS]);
    const contract = new ethers.Contract(contractAddress, SIMPLE_ABI, provider);

    const leaderboard = await contract.getLeaderboard();

    return leaderboard.map((score: any) => ({
      user: score.user,
      pushups: Number(score.pushups),
      squats: Number(score.squats),
      timestamp: Number(score.timestamp),
      chainId,
      isLegacy: true as const,
    }));
  } catch (error) {
    console.warn(`Could not fetch legacy data from ${contractAddress}:`, error);
    return [];
  }
}

/**
 * Get all legacy scores automatically
 */
export async function getAllLegacyScores(): Promise<LegacyScore[]> {
  const allScores: LegacyScore[] = [];

  // Fetch from all legacy contracts in parallel
  const promises = [
    // Celo standard
    fetchLegacyFromContract(LEGACY_ADDRESSES[42220].standard, 42220),
    // Celo verified
    fetchLegacyFromContract(LEGACY_ADDRESSES[42220].verified, 42220),
    // Polygon
    fetchLegacyFromContract(LEGACY_ADDRESSES[137], 137),
    // Base
    fetchLegacyFromContract(LEGACY_ADDRESSES[8453], 8453),
    // Monad
    fetchLegacyFromContract(LEGACY_ADDRESSES[10143], 10143),
  ];

  const results = await Promise.allSettled(promises);

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allScores.push(...result.value);
    }
  });

  return allScores;
}

/**
 * Check if user has legacy scores
 */
export function hasLegacyScores(userAddress: string, legacyScores: LegacyScore[]): boolean {
  return legacyScores.some((score) => score.user.toLowerCase() === userAddress.toLowerCase());
}

/**
 * Get user's legacy total
 */
export function getUserLegacyTotal(userAddress: string, legacyScores: LegacyScore[]): number {
  return legacyScores
    .filter((score) => score.user.toLowerCase() === userAddress.toLowerCase())
    .reduce((total, score) => total + score.pushups + score.squats, 0);
}

/**
 * Simple cache for legacy data (24 hour expiry)
 */
const CACHE_KEY = 'fitness-legacy-scores';
const CACHE_TIMESTAMP_KEY = 'fitness-legacy-timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function getCachedLegacyScores(): LegacyScore[] | null {
  try {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp || Date.now() - parseInt(timestamp) > CACHE_DURATION) {
      return null;
    }

    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function cacheLegacyScores(scores: LegacyScore[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(scores));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch {
    // Ignore cache errors
  }
}

/**
 * Main function to get legacy scores with caching
 */
export async function getLegacyScores(): Promise<LegacyScore[]> {
  // Try cache first
  const cached = getCachedLegacyScores();
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const scores = await getAllLegacyScores();

  // Cache for next time
  cacheLegacyScores(scores);

  return scores;
}

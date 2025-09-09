'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { verifiedFitnessLeaderboardABI } from '@/constants/contracts';
import { SELF_PROTOCOL_CONFIG } from '@/config/self-protocol';

const VERIFIED_FITNESS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT;

export interface UseVerifiedCountReturn {
  count: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch the number of verified users for social proof
 * Used in verification prompts to show "Join X verified athletes"
 */
export function useVerifiedCount(): UseVerifiedCountReturn {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerifiedCount = async () => {
    if (!VERIFIED_FITNESS_CONTRACT_ADDRESS) {
      setError('Contract address not configured');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create provider for Celo Mainnet
      const provider = new ethers.JsonRpcProvider(SELF_PROTOCOL_CONFIG.network.rpcUrl);

      // Create contract instance
      const contract = new ethers.Contract(
        VERIFIED_FITNESS_CONTRACT_ADDRESS,
        verifiedFitnessLeaderboardABI,
        provider
      );

      // Fetch the verified leaderboard
      const leaderboardData = await contract.getLeaderboard();

      // Count unique verified users
      const verifiedCount = Array.isArray(leaderboardData) ? leaderboardData.length : 0;

      setCount(verifiedCount);
    } catch (err) {
      console.error('Failed to fetch verified count:', err);
      setError('Failed to load verified count');
      setCount(0); // Fallback to 0
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifiedCount();
  }, []);

  const refetch = () => {
    fetchVerifiedCount();
  };

  return {
    count,
    isLoading,
    error,
    refetch,
  };
}

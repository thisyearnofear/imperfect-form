import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { SELF_PROTOCOL_CONTRACT_ADDRESS } from '@/constants/contracts';

// Self Protocol contract ABI - just the function we need
const SELF_PROTOCOL_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'isVerifiedHuman',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * Hook to check verification status for multiple users
 * Used for displaying verification badges in leaderboards
 */
export const useBatchVerificationStatus = (addresses: string[]) => {
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const checkBatchVerificationStatus = useCallback(async () => {
    if (!addresses || addresses.length === 0) {
      setVerificationStatuses({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Connect to Celo Alfajores testnet (where Self Protocol is deployed)
      const provider = new ethers.JsonRpcProvider('https://alfajores-forno.celo-testnet.org');

      // Create contract instance
      const contract = new ethers.Contract(
        SELF_PROTOCOL_CONTRACT_ADDRESS,
        SELF_PROTOCOL_ABI,
        provider
      );

      // Check verification status for each address
      const statusPromises = addresses.map(async (address) => {
        try {
          const verified = await contract.isVerifiedHuman(address);
          return { address, verified };
        } catch (error) {
          console.error(`Error checking verification for ${address}:`, error);
          return { address, verified: false };
        }
      });

      const results = await Promise.all(statusPromises);

      // Convert results to a record
      const statusRecord: Record<string, boolean> = {};
      results.forEach(({ address, verified }) => {
        statusRecord[address] = verified;
      });

      setVerificationStatuses(statusRecord);
      console.log('Batch verification check completed:', statusRecord);
    } catch (error) {
      console.error('Error in batch verification check:', error);
      setVerificationStatuses({});
    } finally {
      setIsLoading(false);
    }
  }, [addresses]);

  useEffect(() => {
    checkBatchVerificationStatus();
  }, [checkBatchVerificationStatus]);

  return {
    verificationStatuses,
    isLoading,
    refetch: checkBatchVerificationStatus,
  };
};

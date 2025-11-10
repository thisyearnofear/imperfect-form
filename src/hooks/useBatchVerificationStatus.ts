import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  VERIFIED_FITNESS_CONTRACT_ADDRESS,
  verifiedFitnessContractABI,
} from '@/constants/contracts';
import { batchContractCalls, logContractError } from '@/utils/contractErrorHandling';

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
      // Connect to Celo Mainnet (where Self Protocol is deployed)
      const provider = new ethers.JsonRpcProvider('https://forno.celo.org');

      // Create contract instance
      const contract = new ethers.Contract(
        VERIFIED_FITNESS_CONTRACT_ADDRESS,
        verifiedFitnessContractABI,
        provider
      );

      // Check verification status for each address using resilient batch calls
      const contractCalls = addresses.map((address) => () => contract.isUserVerified(address));

      const results = await batchContractCalls(contractCalls, {
        maxConcurrent: 3, // Limit concurrent calls to avoid rate limiting
        continueOnError: true,
        onError: (error, index) => {
          const address = addresses[index];
          logContractError(error, {
            contractAddress: VERIFIED_FITNESS_CONTRACT_ADDRESS,
            functionName: 'isUserVerified',
            userAddress: address,
            chainId: 42220, // Celo mainnet
          });
        },
      });

      // Convert results to a record
      const statusRecord: Record<string, boolean> = {};
      results.forEach((verified, index) => {
        const address = addresses[index];
        statusRecord[address] = Boolean(verified); // Handle null results gracefully
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

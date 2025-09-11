import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import {
  VERIFIED_FITNESS_CONTRACT_ADDRESS,
  verifiedFitnessContractABI,
} from '@/constants/contracts';
import { chainSupportsSelfProtocol } from '@/utils/chainSwitching';

/**
 * Hook to check if current user is verified through Self Protocol
 * Connects to the live contract on Celo Alfajores
 */
export const useVerificationStatus = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { address, chainId } = useAccount();

  const checkVerificationStatus = useCallback(async () => {
    if (!address) {
      setIsVerified(false);
      setIsLoading(false);
      return;
    }

    // Only check verification on supported networks
    if (!chainId || !chainSupportsSelfProtocol(chainId)) {
      setIsVerified(false);
      setIsLoading(false);
      console.log(`Self Protocol not supported on chain ${chainId}, skipping verification check`);
      return;
    }

    try {
      // Connect to Celo Mainnet (where Self Protocol is deployed)
      const provider = new ethers.JsonRpcProvider('https://forno.celo.org');

      // Create contract instance
      const contract = new ethers.Contract(
        VERIFIED_FITNESS_CONTRACT_ADDRESS,
        verifiedFitnessContractABI,
        provider
      );

      // Check if user is verified
      const verified = await contract.isVerifiedHuman(address);
      setIsVerified(verified);

      console.log(`Verification status for ${address} on Celo Mainnet: ${verified}`);
    } catch (error) {
      console.error('Error checking verification status:', error);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId]);

  useEffect(() => {
    checkVerificationStatus();
  }, [checkVerificationStatus]);

  return {
    isVerified,
    isLoading,
    refetch: checkVerificationStatus,
  };
};

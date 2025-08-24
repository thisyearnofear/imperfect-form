import { useState, useCallback, useEffect } from 'react';
import { contractService } from '@/services/ContractService';
import toast from 'react-hot-toast';

export interface UseContractServiceReturn {
  isInitialized: boolean;
  isInitializing: boolean;
  userAddress: string | null;
  initialize: (connectedAddress?: string) => Promise<boolean>;
  submitScore: (
    pushups: number,
    squats: number,
    contractAddress: string,
    networkName: string
  ) => Promise<boolean>;
  getUserScore: (contractAddress: string) => Promise<{ pushups: number; squats: number } | null>;
  reset: () => void;
  error: string | null;
}

/**
 * React hook for contract service integration
 * Provides state management and error handling
 */
export function useContractService(): UseContractServiceReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize the contract service
  const initialize = useCallback(async (connectedAddress?: string): Promise<boolean> => {
    if (isInitializing) return false;
    
    setIsInitializing(true);
    setError(null);

    try {
      await contractService.initialize(connectedAddress);
      setIsInitialized(true);
      setUserAddress(contractService.getUserAddress());
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize contract service';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing]);

  // Submit score with proper error handling
  const submitScore = useCallback(async (
    pushups: number,
    squats: number,
    contractAddress: string,
    networkName: string
  ): Promise<boolean> => {
    if (!isInitialized) {
      toast.error('Contract service not initialized');
      return false;
    }

    setError(null);
    const toastId = toast.loading('Submitting score...');

    try {
      const result = await contractService.submitScore(pushups, squats, contractAddress, networkName);
      
      if (result.success) {
        toast.success('Score submitted successfully!', { id: toastId });
        return true;
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit score';
      setError(errorMessage);
      toast.error(errorMessage, { id: toastId });
      return false;
    }
  }, [isInitialized]);

  // Get user score
  const getUserScore = useCallback(async (contractAddress: string) => {
    if (!isInitialized) {
      return null;
    }

    try {
      return await contractService.getUserScore(contractAddress);
    } catch (err) {
      console.error('Failed to get user score:', err);
      return null;
    }
  }, [isInitialized]);

  // Reset service
  const reset = useCallback(() => {
    contractService.reset();
    setIsInitialized(false);
    setUserAddress(null);
    setError(null);
  }, []);

  // Auto-initialize on mount if conditions are met
  useEffect(() => {
    // Only auto-initialize if we have a connected wallet context
    // This should be triggered by the parent component when wallet connects
  }, []);

  return {
    isInitialized,
    isInitializing,
    userAddress,
    initialize,
    submitScore,
    getUserScore,
    reset,
    error
  };
}
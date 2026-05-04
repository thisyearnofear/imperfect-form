'use client';

import { useState, useEffect, useCallback } from 'react';
import { achievementService, Achievement } from '@/services/AchievementService';
import { getLocalWorkouts } from '@/services/integrations/WorkoutDataAdapter';
import { LocalWorkout } from '@/types/workout';
import { usePlatform } from '@/contexts/PlatformContext';
import { mintAchievementDirect, getValidatedProvider } from '@/utils/directSubmission';
import { getContractAddress } from '@/config/contract-addresses';
import { useVerificationStatus } from '@/components/verification/hooks/useVerificationStatus';
import toast from 'react-hot-toast';

export function useAchievements() {
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState<string | null>(null);

  const { wallet, platform, farcasterProvider } = usePlatform();
  const { isVerified } = useVerificationStatus();

  const refreshAchievements = useCallback(async () => {
    setIsLoading(true);
    try {
      const unlocked = await achievementService.getUnlockedAchievements();
      setUnlockedAchievements(unlocked);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkNewAchievements = useCallback(
    async (workouts?: LocalWorkout[]) => {
      try {
        const allWorkouts = workouts || (await getLocalWorkouts());
        const newlyUnlocked = await achievementService.checkAchievements(allWorkouts);
        if (newlyUnlocked.length > 0) {
          await refreshAchievements();
        }
        return newlyUnlocked;
      } catch (error) {
        console.error('Failed to check achievements:', error);
        return [];
      }
    },
    [refreshAchievements]
  );

  const mintAchievement = useCallback(
    async (achievementId: string, chainId: number) => {
      if (!isVerified) {
        toast.error('Self Protocol human verification required to mint achievements');
        return;
      }

      const provider = getValidatedProvider(platform, farcasterProvider, wallet);
      if (!provider) {
        toast.error('Wallet not connected or provider not available');
        return;
      }

      const contractAddress = getContractAddress(chainId, 'achievements');
      if (!contractAddress) {
        toast.error('Achievement minting not supported on this chain');
        return;
      }

      setIsMinting(achievementId);
      try {
        const result = await mintAchievementDirect(
          provider,
          achievementId,
          contractAddress,
          chainId
        );

        if (result.success && result.transactionHash) {
          await achievementService.markAsMinted(
            achievementId,
            result.transactionHash,
            chainId === 8453 ? 'base' : 'celo'
          );
          await refreshAchievements();
          toast.success('Achievement minted successfully!');
        } else {
          toast.error(result.error || 'Failed to mint achievement');
        }
      } catch (error) {
        console.error('Minting error:', error);
        toast.error('An unexpected error occurred while minting');
      } finally {
        setIsMinting(null);
      }
    },
    [isVerified, platform, farcasterProvider, wallet, refreshAchievements]
  );

  useEffect(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  return {
    unlockedAchievements,
    isLoading,
    isMinting,
    refreshAchievements,
    checkNewAchievements,
    mintAchievement,
  };
}

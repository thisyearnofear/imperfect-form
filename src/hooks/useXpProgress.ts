import { useState, useEffect, useMemo } from 'react';
import { xpService } from '@/services/XPService';
import { questService } from '@/services/QuestService';
import { getLocalWorkouts, WORKOUT_KEYS } from '@/services/integrations/WorkoutDataAdapter';
import { getDataSyncService, createDataKey } from '@/services/DataSyncService';
import { LocalWorkout } from '@/types/workout';
import { toast } from 'react-hot-toast';

export const useXpProgress = () => {
  const [workouts, setWorkouts] = useState<LocalWorkout[]>([]);
  const [questXp, setQuestXp] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [workoutData, questXpData] = await Promise.all([
        getLocalWorkouts(),
        questService.getTotalQuestXp(),
      ]);
      setWorkouts(workoutData);
      setQuestXp(questXpData);
    } catch (error) {
      console.error('Failed to fetch data for XP calculation:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to workout changes
    const service = getDataSyncService();
    const unsubscribe = service.subscribe(WORKOUT_KEYS.ALL, async (data: LocalWorkout[]) => {
      setWorkouts(data);
      // Also refresh quest XP as it might have changed
      const qXp = await questService.getTotalQuestXp();
      setQuestXp(qXp);
    });

    // Subscribe to quest completion changes
    const unsubscribeQuests = service.subscribe(createDataKey('quests_completed'), async () => {
      const qXp = await questService.getTotalQuestXp();
      setQuestXp(qXp);
    });

    return () => {
      unsubscribe();
      unsubscribeQuests();
    };
  }, []);

  const progress = useMemo(() => {
    const totalXp = xpService.calculateTotalXp(workouts, questXp);
    return xpService.getXpProgress(totalXp);
  }, [workouts, questXp]);

  // Level up detection
  useEffect(() => {
    if (loading) return;

    const lastSeenLevel = localStorage.getItem('last_seen_level');
    const currentLevel = progress.currentLevel;

    if (lastSeenLevel && parseInt(lastSeenLevel) < currentLevel) {
      toast.success(`LEVEL UP! You reached Level ${currentLevel}!`, {
        icon: '🚀',
        duration: 5000,
        style: {
          background: '#000',
          color: '#fff',
          border: '2px solid #FFD700',
        },
      });

      // Additional unlocks feedback
      if (currentLevel === 3) {
        toast.success('UNLOCKED: Ghost Mode!', { icon: '👻' });
      } else if (currentLevel === 5) {
        toast.success('UNLOCKED: On-chain Sync!', { icon: '🔗' });
      }
    }

    localStorage.setItem('last_seen_level', currentLevel.toString());
  }, [progress.currentLevel, loading]);

  const pbs = useMemo(() => {
    return xpService.getPersonalBests(workouts);
  }, [workouts]);

  return {
    workouts,
    progress,
    pbs,
    loading,
    refresh: fetchData,
  };
};

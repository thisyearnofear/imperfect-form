import { useState, useEffect, useMemo } from 'react';
import { questService, DailyQuestState } from '@/services/QuestService';
import { useXpProgress } from './useXpProgress';

export const useQuests = () => {
  const { workouts, loading: workoutsLoading } = useXpProgress();
  const [questState, setQuestState] = useState<DailyQuestState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuestStatus = async () => {
    if (workoutsLoading) return;

    try {
      const state = await questService.getDailyQuestStatus(workouts);
      setQuestState(state);
    } catch (error) {
      console.error('Failed to fetch quest status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workouts, workoutsLoading]);

  const quests = useMemo(() => {
    return questService.getQuestsForDate(new Date());
  }, []);

  const questsWithStatus = useMemo(() => {
    if (!questState) return [];

    return quests.map((q) => {
      const status = questState.statuses.find((s) => s.id === q.id);
      return {
        ...q,
        progress: status?.progress || 0,
        completed: status?.completed || false,
        completedAt: status?.completedAt,
      };
    });
  }, [quests, questState]);

  return {
    quests: questsWithStatus,
    loading: loading || workoutsLoading,
    refresh: fetchQuestStatus,
  };
};

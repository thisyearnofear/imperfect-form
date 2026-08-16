import { LocalWorkout } from '@/types/workout';
import { getOfflineDataStore } from './OfflineDataStore';
import { getDataSyncService } from './DataSyncService';

export interface Quest {
  id: string;
  title: string;
  description: string;
  target: number;
  type: 'pushups' | 'squats' | 'curls' | 'total';
  xpReward: number;
}

export interface QuestStatus {
  id: string;
  progress: number;
  completed: boolean;
  completedAt?: number;
}

export interface DailyQuestState {
  date: string; // YYYY-MM-DD
  statuses: QuestStatus[];
}

const QUESTS: Omit<Quest, 'id'>[] = [
  {
    title: 'Daily Dozen',
    description: 'Complete 12 pushups total today.',
    target: 12,
    type: 'pushups',
    xpReward: 100,
  },
  {
    title: 'Curl Cadence',
    description: 'Complete 15 curls total today.',
    target: 15,
    type: 'curls',
    xpReward: 150,
  },
  {
    title: 'Leg Day Starter',
    description: 'Complete 20 squats total today.',
    target: 20,
    type: 'squats',
    xpReward: 150,
  },
  {
    title: 'Consistency King',
    description: 'Perform 50 total reps today.',
    target: 50,
    type: 'total',
    xpReward: 200,
  },
  {
    title: 'Pushup Pro',
    description: 'Complete 30 pushups total today.',
    target: 30,
    type: 'pushups',
    xpReward: 250,
  },
  {
    title: 'Perfect Line',
    description: 'Complete 25 graded curls total today.',
    target: 25,
    type: 'curls',
    xpReward: 250,
  },
  {
    title: 'Squat Master',
    description: 'Complete 40 squats total today.',
    target: 40,
    type: 'squats',
    xpReward: 300,
  },
];

class QuestServiceImpl {
  private readonly STORAGE_KEY = 'daily_quests';

  /**
   * Get quests for a specific date
   */
  getQuestsForDate(date: Date): Quest[] {
    const dateString = date.toISOString().split('T')[0];
    // Deterministic selection based on date string
    const seed = this.hashString(dateString);

    const selectedQuests: Quest[] = [];
    const availableQuests = [...QUESTS];

    for (let i = 0; i < 3; i++) {
      const index = (seed + i) % availableQuests.length;
      const quest = availableQuests[index];
      selectedQuests.push({
        ...quest,
        id: `${dateString}-${index}`,
      });
      availableQuests.splice(index, 1);
    }

    return selectedQuests;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Calculate progress for quests based on today's workouts
   */
  async getDailyQuestStatus(workouts: LocalWorkout[]): Promise<DailyQuestState> {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const quests = this.getQuestsForDate(today);

    const offlineStore = getOfflineDataStore();
    const savedState = await offlineStore.get<DailyQuestState>(this.STORAGE_KEY);

    // If it's a new day, reset state
    if (!savedState || savedState.date !== dateString) {
      const newState: DailyQuestState = {
        date: dateString,
        statuses: quests.map((q) => ({
          id: q.id,
          progress: 0,
          completed: false,
        })),
      };
      await offlineStore.set(this.STORAGE_KEY, newState);
      return this.calculateProgress(newState, quests, workouts);
    }

    return this.calculateProgress(savedState, quests, workouts);
  }

  private calculateProgress(
    state: DailyQuestState,
    quests: Quest[],
    workouts: LocalWorkout[]
  ): DailyQuestState {
    const today = new Date().toISOString().split('T')[0];
    const todaysWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.timestamp).toISOString().split('T')[0];
      return workoutDate === today;
    });

    const updatedStatuses = state.statuses.map((status) => {
      const quest = quests.find((q) => q.id === status.id);
      if (!quest) return status;

      let progress = 0;
      if (quest.type === 'total') {
        progress = todaysWorkouts.reduce((sum, w) => sum + w.reps, 0);
      } else {
        progress = todaysWorkouts
          .filter((w) => w.type === quest.type)
          .reduce((sum, w) => sum + w.reps, 0);
      }

      const completed = progress >= quest.target;
      const completedAt = completed && !status.completed ? Date.now() : status.completedAt;

      if (completed && !status.completed) {
        this.markQuestCompleted(status.id);
      }

      return {
        ...status,
        progress: Math.min(progress, quest.target),
        completed,
        completedAt,
      };
    });

    const newState = {
      ...state,
      statuses: updatedStatuses,
    };

    // Save if changed
    if (JSON.stringify(newState) !== JSON.stringify(state)) {
      getOfflineDataStore().set(this.STORAGE_KEY, newState);
    }

    return newState;
  }

  private async markQuestCompleted(questId: string) {
    const offlineStore = getOfflineDataStore();
    const history = (await offlineStore.get<Record<string, number>>('quest_history')) || {};
    if (!history[questId]) {
      const quests = this.getQuestsForDate(new Date());
      const quest = quests.find((q) => q.id === questId);
      history[questId] = quest?.xpReward || 100;
      await offlineStore.set('quest_history', history);

      // Notify about quest completion to refresh XP
      getDataSyncService().notify('quests_completed', history);

      // Arcade tactile confirm — gated inside playUiCue
      try {
        const { playUiCue } = await import('@/lib/uiSound');
        playUiCue('success', { register: 'arcade' });
      } catch {
        // Fail silent
      }
    }
  }

  async getTotalQuestXp(): Promise<number> {
    const offlineStore = getOfflineDataStore();
    const history = (await offlineStore.get<Record<string, number>>('quest_history')) || {};
    return Object.values(history).reduce((sum, xp) => sum + xp, 0);
  }
}

export const questService = new QuestServiceImpl();
export default questService;

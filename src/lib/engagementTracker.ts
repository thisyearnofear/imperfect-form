// Enhanced engagement tracking for Farcaster Mini App
// Tracks user interactions, retention, and app usage patterns

export interface EngagementEvent {
  fid?: number;
  anonymousId?: string;
  eventType: EngagementEventType;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export type EngagementEventType =
  | 'mini_app_added'
  | 'mini_app_removed'
  | 'notifications_enabled'
  | 'notifications_disabled'
  | 'workout_completed'
  | 'score_submitted'
  | 'leaderboard_viewed'
  | 'app_launched'
  | 'app_shared'
  | 'challenge_opened'
  | 'challenge_started'
  | 'challenge_completed'
  | 'challenge_replied'
  | 'challenge_shared'
  | 'assessment_card_shared'
  | 'assessment_challenge_opened'
  | 'assessment_started'
  | 'assessment_completed'
  | 'assessment_replied'
  | 'chain_switched'
  | 'wallet_connected'
  | 'pose_detection_started'
  | 'pose_detection_failed'
  | 'transaction_initiated'
  | 'transaction_completed'
  | 'transaction_failed';

export interface UserEngagementStats {
  fid: number;
  firstSeen: Date;
  lastSeen: Date;
  totalSessions: number;
  totalWorkouts: number;
  totalScoresSubmitted: number;
  averageWorkoutDuration: number;
  preferredChains: string[];
  notificationsEnabled: boolean;
  miniAppAdded: boolean;
  retentionDays: number;
}

export interface EngagementAnalytics {
  totalUsers: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
  engagement: {
    averageSessionsPerUser: number;
    averageWorkoutsPerUser: number;
    conversionRate: number; // users who complete workouts vs just browse
  };
  notifications: {
    enabledUsers: number;
    disabledUsers: number;
    enablementRate: number;
  };
  miniApp: {
    addedUsers: number;
    removedUsers: number;
    additionRate: number;
  };
  assessmentFunnel: Record<
    | 'assessment_card_shared'
    | 'assessment_challenge_opened'
    | 'assessment_started'
    | 'assessment_completed'
    | 'assessment_replied',
    number
  >;
  topChains: Array<{ chain: string; users: number; percentage: number }>;
}

// In-memory storage for demo (replace with database in production)
const engagementEvents = new Map<string, EngagementEvent[]>();
const userStats = new Map<number, UserEngagementStats>();

function eventKey(event: EngagementEvent): string {
  return event.fid ? `fid:${event.fid}` : `anon:${event.anonymousId ?? 'unknown'}`;
}

export class EngagementTracker {
  /**
   * Track a user engagement event
   */
  static async trackEvent(event: EngagementEvent): Promise<void> {
    const { fid } = event;

    // Store the event under a privacy-safe anonymous or Farcaster key.
    const key = eventKey(event);
    const userEvents = engagementEvents.get(key) || [];
    userEvents.push(event);
    engagementEvents.set(key, userEvents);

    // Population stats remain attributed only to Farcaster users.
    if (fid) await this.updateUserStats(fid, event);

    console.log(`📊 Tracked engagement: ${event.eventType} for ${key}`);
  }

  /**
   * Update user statistics based on event
   */
  private static async updateUserStats(fid: number, event: EngagementEvent): Promise<void> {
    let stats = userStats.get(fid);

    if (!stats) {
      // First time seeing this user
      stats = {
        fid,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        totalSessions: 0,
        totalWorkouts: 0,
        totalScoresSubmitted: 0,
        averageWorkoutDuration: 0,
        preferredChains: [],
        notificationsEnabled: false,
        miniAppAdded: false,
        retentionDays: 0,
      };
    }

    // Update last seen
    stats.lastSeen = event.timestamp;

    // Update retention days
    const daysDiff = Math.floor(
      (event.timestamp.getTime() - stats.firstSeen.getTime()) / (1000 * 60 * 60 * 24)
    );
    stats.retentionDays = Math.max(stats.retentionDays, daysDiff);

    // Handle specific event types
    switch (event.eventType) {
      case 'app_launched':
        stats.totalSessions++;
        break;

      case 'workout_completed':
        stats.totalWorkouts++;
        if (event.metadata.duration && typeof event.metadata.duration === 'number') {
          // Update average workout duration
          const totalDuration = stats.averageWorkoutDuration * (stats.totalWorkouts - 1);
          stats.averageWorkoutDuration =
            (totalDuration + event.metadata.duration) / stats.totalWorkouts;
        }
        break;

      case 'score_submitted':
        stats.totalScoresSubmitted++;
        if (event.metadata.chain && typeof event.metadata.chain === 'string') {
          // Track preferred chains
          if (!stats.preferredChains.includes(event.metadata.chain)) {
            stats.preferredChains.push(event.metadata.chain);
          }
        }
        break;

      case 'mini_app_added':
        stats.miniAppAdded = true;
        break;

      case 'mini_app_removed':
        stats.miniAppAdded = false;
        break;

      case 'notifications_enabled':
        stats.notificationsEnabled = true;
        break;

      case 'notifications_disabled':
        stats.notificationsEnabled = false;
        break;
    }

    userStats.set(fid, stats);
  }

  /**
   * Get user engagement statistics
   */
  static async getUserStats(fid: number): Promise<UserEngagementStats | null> {
    return userStats.get(fid) || null;
  }

  /**
   * Get all user events
   */
  static async getUserEvents(fid: number): Promise<EngagementEvent[]> {
    return engagementEvents.get(`fid:${fid}`) || [];
  }

  /**
   * Get comprehensive analytics
   */
  static async getAnalytics(): Promise<EngagementAnalytics> {
    const allStats = Array.from(userStats.values());
    const now = new Date();

    // Calculate active users
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyActive = allStats.filter((s) => s.lastSeen >= oneDayAgo).length;
    const weeklyActive = allStats.filter((s) => s.lastSeen >= oneWeekAgo).length;
    const monthlyActive = allStats.filter((s) => s.lastSeen >= oneMonthAgo).length;

    // Calculate retention
    const day1Retention =
      allStats.filter((s) => s.retentionDays >= 1).length / Math.max(allStats.length, 1);
    const day7Retention =
      allStats.filter((s) => s.retentionDays >= 7).length / Math.max(allStats.length, 1);
    const day30Retention =
      allStats.filter((s) => s.retentionDays >= 30).length / Math.max(allStats.length, 1);

    // Calculate engagement metrics
    const totalSessions = allStats.reduce((sum, s) => sum + s.totalSessions, 0);
    const totalWorkouts = allStats.reduce((sum, s) => sum + s.totalWorkouts, 0);
    const usersWithWorkouts = allStats.filter((s) => s.totalWorkouts > 0).length;

    // Calculate notification metrics
    const notificationEnabledUsers = allStats.filter((s) => s.notificationsEnabled).length;
    const notificationDisabledUsers = allStats.length - notificationEnabledUsers;

    // Calculate mini app metrics
    const miniAppAddedUsers = allStats.filter((s) => s.miniAppAdded).length;
    const miniAppRemovedUsers = allStats.length - miniAppAddedUsers;

    const assessmentEventTypes = [
      'assessment_card_shared',
      'assessment_challenge_opened',
      'assessment_started',
      'assessment_completed',
      'assessment_replied',
    ] as const;
    const assessmentFunnel = Object.fromEntries(
      assessmentEventTypes.map((eventType) => [eventType, 0])
    ) as EngagementAnalytics['assessmentFunnel'];
    for (const events of engagementEvents.values()) {
      for (const event of events) {
        if (event.eventType in assessmentFunnel) {
          const eventType = event.eventType as keyof typeof assessmentFunnel;
          assessmentFunnel[eventType] += 1;
        }
      }
    }

    // Calculate top chains
    const chainCounts = new Map<string, number>();
    allStats.forEach((stats) => {
      stats.preferredChains.forEach((chain) => {
        chainCounts.set(chain, (chainCounts.get(chain) || 0) + 1);
      });
    });

    const topChains = Array.from(chainCounts.entries())
      .map(([chain, users]) => ({
        chain,
        users,
        percentage: (users / Math.max(allStats.length, 1)) * 100,
      }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 5);

    return {
      totalUsers: allStats.length,
      activeUsers: {
        daily: dailyActive,
        weekly: weeklyActive,
        monthly: monthlyActive,
      },
      retention: {
        day1: day1Retention,
        day7: day7Retention,
        day30: day30Retention,
      },
      engagement: {
        averageSessionsPerUser: totalSessions / Math.max(allStats.length, 1),
        averageWorkoutsPerUser: totalWorkouts / Math.max(allStats.length, 1),
        conversionRate: usersWithWorkouts / Math.max(allStats.length, 1),
      },
      notifications: {
        enabledUsers: notificationEnabledUsers,
        disabledUsers: notificationDisabledUsers,
        enablementRate: notificationEnabledUsers / Math.max(allStats.length, 1),
      },
      miniApp: {
        addedUsers: miniAppAddedUsers,
        removedUsers: miniAppRemovedUsers,
        additionRate: miniAppAddedUsers / Math.max(allStats.length, 1),
      },
      assessmentFunnel,
      topChains,
    };
  }

  /**
   * Get recent events across all users
   */
  static async getRecentEvents(limit: number = 50): Promise<EngagementEvent[]> {
    const allEvents: EngagementEvent[] = [];

    for (const events of engagementEvents.values()) {
      allEvents.push(...events);
    }

    return allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
  }

  /**
   * Export data for analysis (CSV format)
   */
  static async exportData(): Promise<string> {
    const allStats = Array.from(userStats.values());

    const headers = [
      'fid',
      'firstSeen',
      'lastSeen',
      'totalSessions',
      'totalWorkouts',
      'totalScoresSubmitted',
      'averageWorkoutDuration',
      'preferredChains',
      'notificationsEnabled',
      'miniAppAdded',
      'retentionDays',
    ];

    const rows = allStats.map((stats) => [
      stats.fid,
      stats.firstSeen.toISOString(),
      stats.lastSeen.toISOString(),
      stats.totalSessions,
      stats.totalWorkouts,
      stats.totalScoresSubmitted,
      stats.averageWorkoutDuration.toFixed(2),
      stats.preferredChains.join(';'),
      stats.notificationsEnabled,
      stats.miniAppAdded,
      stats.retentionDays,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

export default EngagementTracker;

// Notification system for Farcaster Mini App
// Follows official Farcaster 2025 standards

interface NotificationToken {
  fid: number;
  token: string;
  url: string;
  createdAt: Date;
  isActive: boolean;
}

interface NotificationRequest {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
  tokens: string[];
}

interface NotificationResponse {
  successfulTokens: string[];
  invalidTokens: string[];
  rateLimitedTokens: string[];
}

// In-memory storage for demo (replace with database in production)
const notificationTokens = new Map<number, NotificationToken>();

export class NotificationManager {
  /**
   * Save notification token for a user (called from webhook)
   */
  static async saveNotificationToken(
    fid: number,
    notificationDetails: { url: string; token: string }
  ): Promise<void> {
    const tokenData: NotificationToken = {
      fid,
      token: notificationDetails.token,
      url: notificationDetails.url,
      createdAt: new Date(),
      isActive: true,
    };

    notificationTokens.set(fid, tokenData);
    
    console.log(`🔔 Saved notification token for FID ${fid}`);
  }

  /**
   * Remove notification tokens for a user
   */
  static async removeNotificationTokens(fid: number): Promise<void> {
    notificationTokens.delete(fid);
    console.log(`🔔 Removed notification tokens for FID ${fid}`);
  }

  /**
   * Disable notification tokens for a user
   */
  static async disableNotificationTokens(fid: number): Promise<void> {
    const token = notificationTokens.get(fid);
    if (token) {
      token.isActive = false;
      notificationTokens.set(fid, token);
    }
    console.log(`🔔 Disabled notification tokens for FID ${fid}`);
  }

  /**
   * Get active notification tokens for specific users
   */
  static async getNotificationTokens(fids: number[]): Promise<NotificationToken[]> {
    const tokens: NotificationToken[] = [];
    
    for (const fid of fids) {
      const token = notificationTokens.get(fid);
      if (token && token.isActive) {
        tokens.push(token);
      }
    }
    
    return tokens;
  }

  /**
   * Get all active notification tokens
   */
  static async getAllActiveTokens(): Promise<NotificationToken[]> {
    return Array.from(notificationTokens.values()).filter(token => token.isActive);
  }

  /**
   * Send notification to specific users
   * Follows Farcaster 2025 notification API standards
   */
  static async sendNotification(
    fids: number[],
    notification: {
      notificationId: string;
      title: string;
      body: string;
      targetUrl?: string;
    }
  ): Promise<{ success: boolean; results?: NotificationResponse }> {
    try {
      const tokens = await this.getNotificationTokens(fids);
      
      if (tokens.length === 0) {
        console.log('🔔 No active notification tokens found');
        return { success: false };
      }

      // Group tokens by URL (different Farcaster clients may have different URLs)
      const tokensByUrl = new Map<string, string[]>();
      
      for (const token of tokens) {
        const existing = tokensByUrl.get(token.url) || [];
        existing.push(token.token);
        tokensByUrl.set(token.url, existing);
      }

      const allResults: NotificationResponse = {
        successfulTokens: [],
        invalidTokens: [],
        rateLimitedTokens: [],
      };

      // Send to each URL group
      for (const [url, tokenList] of tokensByUrl) {
        const request: NotificationRequest = {
          notificationId: notification.notificationId,
          title: notification.title,
          body: notification.body,
          targetUrl: notification.targetUrl || 'https://imperfectform.fun',
          tokens: tokenList,
        };

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          });

          if (response.ok) {
            const result: NotificationResponse = await response.json();
            
            // Merge results
            allResults.successfulTokens.push(...result.successfulTokens);
            allResults.invalidTokens.push(...result.invalidTokens);
            allResults.rateLimitedTokens.push(...result.rateLimitedTokens);

            console.log(`🔔 Notification sent to ${result.successfulTokens.length} users via ${url}`);
          } else {
            console.error(`🔔 Failed to send notification via ${url}:`, response.status);
          }
        } catch (error) {
          console.error(`🔔 Error sending notification via ${url}:`, error);
        }
      }

      return { success: true, results: allResults };
    } catch (error) {
      console.error('🔔 Error in sendNotification:', error);
      return { success: false };
    }
  }

  /**
   * Send notification to all active users
   */
  static async broadcastNotification(notification: {
    notificationId: string;
    title: string;
    body: string;
    targetUrl?: string;
  }): Promise<{ success: boolean; results?: NotificationResponse }> {
    const allTokens = await this.getAllActiveTokens();
    const fids = allTokens.map(token => token.fid);
    
    return this.sendNotification(fids, notification);
  }

  /**
   * Send workout achievement notification
   */
  static async sendWorkoutAchievement(
    fid: number,
    achievement: {
      reps: number;
      exerciseMode: string;
      timeSpent: string;
    }
  ): Promise<boolean> {
    const notificationId = `workout-${fid}-${Date.now()}`;
    const title = '🏆 Workout Complete!';
    const body = `${achievement.reps} ${achievement.exerciseMode} in ${achievement.timeSpent}`;
    const targetUrl = `https://imperfectform.fun?notification=${notificationId}`;

    const result = await this.sendNotification([fid], {
      notificationId,
      title,
      body,
      targetUrl,
    });

    return result.success;
  }

  /**
   * Send daily motivation notification
   */
  static async sendDailyMotivation(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const notificationId = `daily-motivation-${today}`;
    
    const motivations = [
      'Time to crush those fitness goals! 💪',
      'Your body can do it. Your mind just needs to catch up! 🧠',
      'Every rep counts towards your onchain legacy! 🏆',
      'Ready to earn some fitness rewards? 🎯',
    ];
    
    const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
    
    const result = await this.broadcastNotification({
      notificationId,
      title: '🔥 Daily Motivation',
      body: randomMotivation,
      targetUrl: 'https://imperfectform.fun',
    });

    return result.success;
  }

  /**
   * Get notification statistics
   */
  static async getStats(): Promise<{
    totalUsers: number;
    activeTokens: number;
    inactiveTokens: number;
  }> {
    const allTokens = Array.from(notificationTokens.values());
    
    return {
      totalUsers: allTokens.length,
      activeTokens: allTokens.filter(t => t.isActive).length,
      inactiveTokens: allTokens.filter(t => !t.isActive).length,
    };
  }
}

export default NotificationManager;

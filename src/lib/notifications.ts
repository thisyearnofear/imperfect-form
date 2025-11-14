// Notification system for Farcaster Mini App
// Follows official Farcaster 2025 standards

import * as fs from 'fs';
import * as path from 'path';

interface NotificationToken {
  fid: number;
  token: string;
  url: string;
  createdAt: Date;
  isActive: boolean;
}

interface MiniAppStatus {
  fid: number;
  miniAppAdded: boolean;
  addedAt?: string; // Store as ISO string for JSON serialization
  removedAt?: string; // Store as ISO string for JSON serialization
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

// File-based storage for mini app statuses
const MINIAPP_STATUS_FILE = path.join(process.cwd(), 'data', 'miniapp-status.json');

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(MINIAPP_STATUS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load mini app statuses from file
function loadMiniAppStatuses(): Map<number, MiniAppStatus> {
  ensureDataDir();

  try {
    if (fs.existsSync(MINIAPP_STATUS_FILE)) {
      const data = fs.readFileSync(MINIAPP_STATUS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Convert object back to Map
      return new Map(
        Object.entries(parsed).map(([fid, status]) => [parseInt(fid, 10), status as MiniAppStatus])
      );
    }
  } catch (error) {
    console.error('Error loading mini app statuses:', error);
  }

  return new Map();
}

// Save mini app statuses to file
function saveMiniAppStatuses(map: Map<number, MiniAppStatus>): void {
  ensureDataDir();

  try {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(MINIAPP_STATUS_FILE, JSON.stringify(obj, null, 2));
  } catch (error) {
    console.error('Error saving mini app statuses:', error);
  }
}

// In-memory storage for notification tokens (kept in memory for performance)
const notificationTokens = new Map<number, NotificationToken>();

// Load mini app statuses from file on startup
const miniAppStatuses = loadMiniAppStatuses();

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
    return Array.from(notificationTokens.values()).filter((token) => token.isActive);
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

            console.log(
              `🔔 Notification sent to ${result.successfulTokens.length} users via ${url}`
            );
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
    const fids = allTokens.map((token) => token.fid);

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
      activeTokens: allTokens.filter((t) => t.isActive).length,
      inactiveTokens: allTokens.filter((t) => !t.isActive).length,
    };
  }

  /**
   * Mark mini app as added for a user
   */
  static async setMiniAppAdded(fid: number): Promise<void> {
    miniAppStatuses.set(fid, {
      fid,
      miniAppAdded: true,
      addedAt: new Date().toISOString(),
    });
    saveMiniAppStatuses(miniAppStatuses);
    console.log(`✨ Marked mini app as added for FID ${fid}`);
  }

  /**
   * Mark mini app as removed for a user
   */
  static async setMiniAppRemoved(fid: number): Promise<void> {
    const existing = miniAppStatuses.get(fid);
    miniAppStatuses.set(fid, {
      fid,
      miniAppAdded: false,
      addedAt: existing?.addedAt,
      removedAt: new Date().toISOString(),
    });
    saveMiniAppStatuses(miniAppStatuses);
    console.log(`✨ Marked mini app as removed for FID ${fid}`);
  }

  /**
   * Check if user has added the mini app
   */
  static async isMiniAppAdded(fid: number): Promise<boolean> {
    const status = miniAppStatuses.get(fid);
    return status?.miniAppAdded ?? false;
  }

  /**
   * Get mini app status for a user
   */
  static async getMiniAppStatus(fid: number): Promise<MiniAppStatus | null> {
    return miniAppStatuses.get(fid) ?? null;
  }
}

export default NotificationManager;

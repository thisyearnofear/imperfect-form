// Simple server-side logger for utility functions
const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[FarcasterNotifications] ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[FarcasterNotifications] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[FarcasterNotifications] ${message}`, error);
  },
};

// Helper function to send notifications to Farcaster users
export async function sendNotification(
  notificationUrl: string,
  token: string,
  notification: {
    notificationId: string;
    title: string;
    body: string;
    targetUrl: string;
  }
) {
  try {
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...notification,
        tokens: [token],
      }),
    });

    if (!response.ok) {
      throw new Error(`Notification failed: ${response.status}`);
    }

    const result = await response.json();
    logger.info('🎭 Notification sent successfully', result);

    return result;
  } catch (error) {
    logger.error('🎭 Failed to send notification', error);
    throw error;
  }
}

// Helper function to send batch notifications
export async function sendBatchNotification(
  notificationUrl: string,
  tokens: string[],
  notification: {
    notificationId: string;
    title: string;
    body: string;
    targetUrl: string;
  }
) {
  try {
    // Split tokens into batches of 100 (Farcaster limit)
    const batches = [];
    for (let i = 0; i < tokens.length; i += 100) {
      batches.push(tokens.slice(i, i + 100));
    }

    const results = [];
    for (const batch of batches) {
      const response = await fetch(notificationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...notification,
          tokens: batch,
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch notification failed: ${response.status}`);
      }

      const result = await response.json();
      results.push(result);
    }

    logger.info('🎭 Batch notifications sent successfully', {
      batches: batches.length,
      totalTokens: tokens.length,
    });

    return results;
  } catch (error) {
    logger.error('🎭 Failed to send batch notifications', error);
    throw error;
  }
}

// Helper function to create workout achievement notification
export function createWorkoutNotification(
  reps: number,
  exerciseMode: string,
  timeSpent: string,
  username?: string
): {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
} {
  const notificationId = `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const title = username ? `${username} crushed a workout!` : 'Workout completed!';
  const body = `${reps} ${exerciseMode} in ${timeSpent} - Join the challenge!`;
  const targetUrl = `https://imperfectform.fun?utm_source=notification&utm_medium=farcaster&utm_campaign=workout_achievement`;

  return {
    notificationId,
    title,
    body,
    targetUrl,
  };
}

// Helper function to create daily reminder notification
export function createDailyReminderNotification(): {
  notificationId: string;
  title: string;
  body: string;
  targetUrl: string;
} {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const notificationId = `daily-reminder-${today}`;
  const title = '💪 Time for your daily workout!';
  const body = 'Keep your streak going - start a quick fitness challenge now!';
  const targetUrl = `https://imperfectform.fun?utm_source=notification&utm_medium=farcaster&utm_campaign=daily_reminder`;

  return {
    notificationId,
    title,
    body,
    targetUrl,
  };
}

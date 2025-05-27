import { NextRequest, NextResponse } from 'next/server';
import NotificationManager from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'workout_achievement':
        return await handleWorkoutAchievement(data);
      
      case 'daily_motivation':
        return await handleDailyMotivation();
      
      case 'custom':
        return await handleCustomNotification(data);
      
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('🔔 Notification API error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

async function handleWorkoutAchievement(data: {
  fid: number;
  reps: number;
  exerciseMode: string;
  timeSpent: string;
}) {
  const success = await NotificationManager.sendWorkoutAchievement(
    data.fid,
    {
      reps: data.reps,
      exerciseMode: data.exerciseMode,
      timeSpent: data.timeSpent,
    }
  );

  return NextResponse.json({ success });
}

async function handleDailyMotivation() {
  const success = await NotificationManager.sendDailyMotivation();
  return NextResponse.json({ success });
}

async function handleCustomNotification(data: {
  fids?: number[];
  broadcast?: boolean;
  notificationId: string;
  title: string;
  body: string;
  targetUrl?: string;
}) {
  let result;
  
  if (data.broadcast) {
    result = await NotificationManager.broadcastNotification({
      notificationId: data.notificationId,
      title: data.title,
      body: data.body,
      targetUrl: data.targetUrl,
    });
  } else if (data.fids && data.fids.length > 0) {
    result = await NotificationManager.sendNotification(data.fids, {
      notificationId: data.notificationId,
      title: data.title,
      body: data.body,
      targetUrl: data.targetUrl,
    });
  } else {
    return NextResponse.json(
      { error: 'Must specify either fids or broadcast=true' },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}

// GET endpoint for notification stats
export async function GET() {
  try {
    const stats = await NotificationManager.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('🔔 Failed to get notification stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}

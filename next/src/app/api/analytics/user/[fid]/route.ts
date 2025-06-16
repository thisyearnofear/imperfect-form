import { NextRequest, NextResponse } from 'next/server';
import EngagementTracker from '@/lib/engagementTracker';

// Simple authentication check (replace with proper auth in production)
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.ANALYTICS_API_KEY;
  
  if (!apiKey) {
    console.warn('ANALYTICS_API_KEY not set - allowing access for development');
    return true; // Allow in development
  }
  
  return authHeader === `Bearer ${apiKey}`;
}

/**
 * GET /api/analytics/user/[fid]
 * Returns engagement data for a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fid: string } }
) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const fid = parseInt(params.fid);
    
    if (isNaN(fid)) {
      return NextResponse.json(
        { error: 'Invalid FID' },
        { status: 400 }
      );
    }

    const [userStats, userEvents] = await Promise.all([
      EngagementTracker.getUserStats(fid),
      EngagementTracker.getUserEvents(fid),
    ]);

    if (!userStats) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate additional insights
    const eventsByType = userEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentEvents = userEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      data: {
        stats: userStats,
        eventCounts: eventsByType,
        recentEvents,
        totalEvents: userEvents.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('📊 User analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to get user analytics' },
      { status: 500 }
    );
  }
}

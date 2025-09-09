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
 * GET /api/analytics/engagement
 * Returns comprehensive engagement analytics
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const analytics = await EngagementTracker.getAnalytics();

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('📊 Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}

/**
 * POST /api/analytics/engagement
 * Track a custom engagement event
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fid, eventType, metadata = {} } = body;

    if (!fid || !eventType) {
      return NextResponse.json({ error: 'fid and eventType are required' }, { status: 400 });
    }

    await EngagementTracker.trackEvent({
      fid,
      eventType,
      timestamp: new Date(),
      metadata,
    });

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error) {
    console.error('📊 Track event API error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

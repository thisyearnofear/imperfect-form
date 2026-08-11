import { NextRequest, NextResponse } from 'next/server';
import EngagementTracker from '@/lib/engagementTracker';
import { durableEventProperties, flushDurableEvents, trackDurableEvent } from '@/lib/posthogSink';

const VALID_EVENT_TYPES = new Set([
  'mini_app_added',
  'mini_app_removed',
  'notifications_enabled',
  'notifications_disabled',
  'workout_completed',
  'score_submitted',
  'leaderboard_viewed',
  'app_launched',
  'app_shared',
  'challenge_opened',
  'challenge_started',
  'challenge_completed',
  'challenge_replied',
  'challenge_shared',
  'assessment_card_shared',
  'assessment_challenge_opened',
  'assessment_started',
  'assessment_completed',
  'assessment_replied',
  'chain_switched',
  'wallet_connected',
  'pose_detection_started',
  'pose_detection_failed',
  'transaction_initiated',
  'transaction_completed',
  'transaction_failed',
]);

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
    const { fid, anonymousId, eventType, metadata: rawMetadata } = body;
    // Coerce hostile/non-object metadata so the tracker and the durable sink
    // never see a null or array where an object is expected.
    const metadata: Record<string, unknown> =
      rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
        ? rawMetadata
        : {};

    if ((!fid && !anonymousId) || !eventType) {
      return NextResponse.json(
        { error: 'fid or anonymousId and eventType are required' },
        { status: 400 }
      );
    }
    if (!VALID_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 });
    }
    if (
      anonymousId &&
      (typeof anonymousId !== 'string' || !/^anon-|^[0-9a-f-]{20,}$/i.test(anonymousId))
    ) {
      return NextResponse.json({ error: 'Invalid anonymous analytics id' }, { status: 400 });
    }

    const eventTypeValue = eventType as string;
    await EngagementTracker.trackEvent({
      ...(fid ? { fid } : {}),
      ...(anonymousId ? { anonymousId } : {}),
      eventType,
      timestamp: new Date(),
      metadata,
    });

    // Durable sink: aggregate metadata only; no camera frames or wallet data.
    // durableEventProperties is the allowlist boundary — challengeId and status
    // pass through so PostHog can stitch one card's open → start → complete →
    // reply journey; everything else in the payload is dropped here.
    const distinctId = fid ? String(fid) : anonymousId;
    await trackDurableEvent({
      distinctId,
      eventType: eventTypeValue,
      properties: durableEventProperties(metadata),
    });
    await flushDurableEvents();

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully',
    });
  } catch (error) {
    console.error('📊 Track event API error:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
}

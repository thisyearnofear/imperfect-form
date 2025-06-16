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
 * GET /api/analytics/export
 * Export engagement data as CSV
 */
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const csvData = await EngagementTracker.exportData();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `engagement-data-${timestamp}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('📊 Export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/export?format=json
 * Export recent events as JSON
 */
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { limit = 100, format = 'json' } = body;

    const recentEvents = await EngagementTracker.getRecentEvents(limit);

    if (format === 'csv') {
      const headers = ['fid', 'eventType', 'timestamp', 'metadata'];
      const rows = recentEvents.map(event => [
        event.fid,
        event.eventType,
        event.timestamp.toISOString(),
        JSON.stringify(event.metadata),
      ]);

      const csvData = [headers, ...rows].map(row => row.join(',')).join('\n');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `recent-events-${timestamp}.csv`;

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: recentEvents,
      count: recentEvents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('📊 Export events API error:', error);
    return NextResponse.json(
      { error: 'Failed to export events' },
      { status: 500 }
    );
  }
}

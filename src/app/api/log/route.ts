import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client if environment variables are available
let supabase: any = null;
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

/**
 * API route for receiving logs from the client
 * This displays logs in the server console and optionally stores them for analytics
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Format the log for the console with colors for clarity
    const { level, message, details, context, timestamp, clientInfo } = body;

    // Format the timestamp for readability
    const formattedTime = new Date(timestamp).toLocaleTimeString();

    // Create a device identifier string for easier tracking of which device sent the log
    const deviceIdentifier = `${clientInfo.viewport?.width}x${clientInfo.viewport?.height}${clientInfo.deviceMemory ? ` (${clientInfo.deviceMemory}GB RAM)` : ''}`;

    // Add color to console output based on log level
    let logFn = console.log;
    let logPrefix = '';

    switch (level) {
      case 'error':
        logFn = console.error;
        logPrefix = '\x1b[31m[ERROR]\x1b[0m'; // Red
        break;
      case 'warn':
        logFn = console.warn;
        logPrefix = '\x1b[33m[WARN]\x1b[0m'; // Yellow
        break;
      case 'info':
        logPrefix = '\x1b[36m[INFO]\x1b[0m'; // Cyan
        break;
      case 'debug':
      default:
        logPrefix = '\x1b[90m[DEBUG]\x1b[0m'; // Gray
    }

    // Log with formatted output
    logFn(
      `${logPrefix} ${formattedTime} [${deviceIdentifier}] ${context ? `[${context}] ` : ''}${message}`
    );

    // Log details if present (with indentation for better readability)
    if (details) {
      console.log('\x1b[90m  Details:\x1b[0m', details);
    }

    // Log URL for context (only for errors)
    if (level === 'error' && clientInfo.url) {
      console.log(`\x1b[90m  URL: ${clientInfo.url}\x1b[0m`);
    }

    // Store in database if Supabase is configured
    if (supabase) {
      await storeLogInDatabase({
        level,
        message,
        details,
        context,
        timestamp,
        clientInfo,
        serverTimestamp: new Date().toISOString(),
      });
    }

    // Handle performance reports
    if (details && typeof details === 'object' && 'sessionId' in details) {
      await handlePerformanceReport(details);
    }

    // Handle critical errors
    if (level === 'error' && context === 'PoseDetectionErrorHandler') {
      await handleCriticalError({ level, message, details, context, clientInfo });
    }

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing log:', error);
    return NextResponse.json({ error: 'Failed to process log' }, { status: 500 });
  }
}

/**
 * Store log data in database for analytics
 */
async function storeLogInDatabase(logData: any): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from('app_logs').insert([logData]);
  } catch (error) {
    console.error('Failed to store log in database:', error);
  }
}

/**
 * Handle performance reports for analytics
 */
async function handlePerformanceReport(report: any): Promise<void> {
  if (!supabase) return;

  try {
    await supabase.from('performance_reports').insert([
      {
        sessionId: report.sessionId,
        platform: report.deviceInfo?.platform,
        browser: report.deviceInfo?.browser,
        performanceLevel: report.deviceInfo?.performanceLevel,
        fps: report.metrics?.fps,
        detectionTime: report.metrics?.detectionTime,
        memoryUsage: report.metrics?.memoryUsage,
        errorCount: report.errorCount,
        sessionDuration: report.sessionDuration,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Check for performance issues
    if (report.metrics?.fps < 15 || report.metrics?.detectionTime > 200) {
      await handlePerformanceIssue(report);
    }
  } catch (error) {
    console.error('Failed to handle performance report:', error);
  }
}

/**
 * Handle critical errors that need immediate attention
 */
async function handleCriticalError(logData: any): Promise<void> {
  if (!supabase) return;

  const errorType = logData.details?.type || 'unknown';
  const platform = logData.details?.context?.platform || 'unknown';
  const severity = logData.details?.severity || 'medium';

  // Store critical error for tracking
  try {
    await supabase.from('critical_errors').insert([
      {
        errorType,
        platform,
        severity,
        message: logData.message,
        details: logData.details,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Check for recurring errors
    const { data: recentErrors } = await supabase
      .from('app_logs')
      .select('*')
      .eq('level', 'error')
      .eq('details->>type', errorType)
      .gte('serverTimestamp', new Date(Date.now() - 60000).toISOString())
      .limit(5);

    if (recentErrors && recentErrors.length >= 3) {
      console.error('🚨 CRITICAL ERROR ESCALATION:', {
        type: errorType,
        platform,
        occurrences: recentErrors.length,
        timeframe: '1 minute',
      });
    }
  } catch (error) {
    console.error('Failed to handle critical error:', error);
  }
}

/**
 * Handle performance degradation
 */
async function handlePerformanceIssue(report: any): Promise<void> {
  if (!supabase) return;

  try {
    const { data: issues } = await supabase
      .from('performance_issues')
      .select('*')
      .eq('platform', report.deviceInfo?.platform)
      .eq('resolved', false)
      .limit(1);

    if (!issues || issues.length === 0) {
      await supabase.from('performance_issues').insert([
        {
          platform: report.deviceInfo?.platform,
          browser: report.deviceInfo?.browser,
          issueType: report.metrics?.fps < 15 ? 'low_fps' : 'slow_detection',
          severity: 'medium',
          description: `Performance issue: FPS=${report.metrics?.fps}, Detection Time=${report.metrics?.detectionTime}ms`,
          sessionId: report.sessionId,
          reportedAt: new Date().toISOString(),
        },
      ]);
    } else {
      await supabase
        .from('performance_issues')
        .update({
          occurrences: (issues[0].occurrences || 1) + 1,
          lastOccurrence: new Date().toISOString(),
        })
        .eq('id', issues[0].id);
    }
  } catch (error) {
    console.error('Failed to handle performance issue:', error);
  }
}

/**
 * GET endpoint for retrieving logs (admin only)
 */
export async function GET(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    let query = supabase
      .from('app_logs')
      .select('*')
      .order('serverTimestamp', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    if (level) {
      query = query.eq('level', level);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ logs: data });
  } catch (_error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

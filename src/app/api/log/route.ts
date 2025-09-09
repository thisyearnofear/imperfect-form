import { NextResponse } from 'next/server';

/**
 * API route for receiving logs from the client
 * This displays logs in the server console so you can see mobile device logs
 * without needing to add UI elements to the mobile screen
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

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing log:', error);
    return NextResponse.json({ error: 'Failed to process log' }, { status: 500 });
  }
}

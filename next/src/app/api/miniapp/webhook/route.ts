import { NextRequest, NextResponse } from 'next/server';

// Simple server-side logger for API routes
const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[MiniAppWebhook] ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[MiniAppWebhook] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[MiniAppWebhook] ${message}`, error);
  },
};

// Types for Mini App webhook events
interface NotificationDetails {
  url: string;
  token: string;
}

interface FrameAddedEvent {
  event: 'frame_added';
  notificationDetails?: NotificationDetails;
}

interface FrameRemovedEvent {
  event: 'frame_removed';
}

interface NotificationsEnabledEvent {
  event: 'notifications_enabled';
  notificationDetails: NotificationDetails;
}

interface NotificationsDisabledEvent {
  event: 'notifications_disabled';
}

type WebhookEvent = FrameAddedEvent | FrameRemovedEvent | NotificationsEnabledEvent | NotificationsDisabledEvent;

interface WebhookPayload {
  header: string;
  payload: string;
  signature: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WebhookPayload = await request.json();

    // Log the incoming webhook for debugging
    logger.info('🎭 Mini App webhook received', {
      hasHeader: !!body.header,
      hasPayload: !!body.payload,
      hasSignature: !!body.signature,
    });

    // Decode the payload (base64url encoded)
    const decodedPayload = Buffer.from(body.payload, 'base64url').toString('utf-8');
    const eventData: WebhookEvent = JSON.parse(decodedPayload);

    logger.info('🎭 Mini App event decoded', { event: eventData.event });

    // Handle different event types
    switch (eventData.event) {
      case 'frame_added':
        await handleFrameAdded(eventData);
        break;

      case 'frame_removed':
        await handleFrameRemoved(eventData);
        break;

      case 'notifications_enabled':
        await handleNotificationsEnabled(eventData);
        break;

      case 'notifications_disabled':
        await handleNotificationsDisabled(eventData);
        break;

      default:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger.warn('🎭 Unknown Mini App event type', { event: (eventData as any).event });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('🎭 Mini App webhook error', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleFrameAdded(event: FrameAddedEvent) {
  logger.info('🎭 User added Mini App', {
    hasNotificationDetails: !!event.notificationDetails,
  });

  if (event.notificationDetails) {
    // Store notification token for this user
    // In a real app, you'd save this to your database
    logger.info('🎭 Notification token received', {
      url: event.notificationDetails.url,
      tokenLength: event.notificationDetails.token.length,
    });

    // TODO: Save to database
    // await saveNotificationToken(userFid, event.notificationDetails);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleFrameRemoved(_event: FrameRemovedEvent) {
  logger.info('🎭 User removed Mini App');

  // TODO: Remove notification tokens for this user
  // await removeNotificationTokens(userFid);
}

async function handleNotificationsEnabled(event: NotificationsEnabledEvent) {
  logger.info('🎭 User enabled notifications', {
    url: event.notificationDetails.url,
    tokenLength: event.notificationDetails.token.length,
  });

  // TODO: Save new notification token
  // await saveNotificationToken(userFid, event.notificationDetails);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleNotificationsDisabled(_event: NotificationsDisabledEvent) {
  logger.info('🎭 User disabled notifications');

  // TODO: Mark notification tokens as invalid
  // await disableNotificationTokens(userFid);
}

// Helper function to send notifications (for future use)
// Note: This is moved to a separate utility file to avoid Next.js route export conflicts

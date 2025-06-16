import { NextRequest, NextResponse } from 'next/server';
import NotificationManager from '@/lib/notifications';
import EngagementTracker from '@/lib/engagementTracker';

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

    // Decode the header to get user FID
    const decodedHeader = Buffer.from(body.header, 'base64url').toString('utf-8');
    const headerData = JSON.parse(decodedHeader);
    const userFid = headerData.fid;

    // Decode the payload (base64url encoded)
    const decodedPayload = Buffer.from(body.payload, 'base64url').toString('utf-8');
    const eventData: WebhookEvent = JSON.parse(decodedPayload);

    logger.info('🎭 Mini App event decoded', {
      event: eventData.event,
      userFid
    });

    // Handle different event types
    switch (eventData.event) {
      case 'frame_added':
        await handleFrameAdded(eventData, userFid);
        break;

      case 'frame_removed':
        await handleFrameRemoved(eventData, userFid);
        break;

      case 'notifications_enabled':
        await handleNotificationsEnabled(eventData, userFid);
        break;

      case 'notifications_disabled':
        await handleNotificationsDisabled(eventData, userFid);
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

async function handleFrameAdded(event: FrameAddedEvent, userFid: number) {
  logger.info('🎭 User added Mini App', {
    userFid,
    hasNotificationDetails: !!event.notificationDetails,
  });

  // Track engagement event
  await EngagementTracker.trackEvent({
    fid: userFid,
    eventType: 'mini_app_added',
    timestamp: new Date(),
    metadata: {
      hasNotifications: !!event.notificationDetails,
    },
  });

  if (event.notificationDetails) {
    // Store notification token for this user
    logger.info('🎭 Notification token received', {
      userFid,
      url: event.notificationDetails.url,
      tokenLength: event.notificationDetails.token.length,
    });

    // Save notification token using NotificationManager
    await NotificationManager.saveNotificationToken(userFid, event.notificationDetails);

    // Track notification enablement
    await EngagementTracker.trackEvent({
      fid: userFid,
      eventType: 'notifications_enabled',
      timestamp: new Date(),
      metadata: {
        source: 'mini_app_added',
        url: event.notificationDetails.url,
      },
    });
  }
}

async function handleFrameRemoved(_event: FrameRemovedEvent, userFid: number) {
  logger.info('🎭 User removed Mini App', { userFid });

  // Track engagement event
  await EngagementTracker.trackEvent({
    fid: userFid,
    eventType: 'mini_app_removed',
    timestamp: new Date(),
    metadata: {},
  });

  // Remove notification tokens for this user
  await NotificationManager.removeNotificationTokens(userFid);
}

async function handleNotificationsEnabled(event: NotificationsEnabledEvent, userFid: number) {
  logger.info('🎭 User enabled notifications', {
    userFid,
    url: event.notificationDetails.url,
    tokenLength: event.notificationDetails.token.length,
  });

  // Track engagement event
  await EngagementTracker.trackEvent({
    fid: userFid,
    eventType: 'notifications_enabled',
    timestamp: new Date(),
    metadata: {
      source: 'user_settings',
      url: event.notificationDetails.url,
    },
  });

  // Save new notification token
  await NotificationManager.saveNotificationToken(userFid, event.notificationDetails);
}

async function handleNotificationsDisabled(_event: NotificationsDisabledEvent, userFid: number) {
  logger.info('🎭 User disabled notifications', { userFid });

  // Track engagement event
  await EngagementTracker.trackEvent({
    fid: userFid,
    eventType: 'notifications_disabled',
    timestamp: new Date(),
    metadata: {},
  });

  // Mark notification tokens as invalid
  await NotificationManager.disableNotificationTokens(userFid);
}

// Helper function to send notifications (for future use)
// Note: This is moved to a separate utility file to avoid Next.js route export conflicts

import { NextRequest, NextResponse } from 'next/server';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('MiniAppWebhook');

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

async function handleFrameRemoved(event: FrameRemovedEvent) {
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

async function handleNotificationsDisabled(event: NotificationsDisabledEvent) {
  logger.info('🎭 User disabled notifications');
  
  // TODO: Mark notification tokens as invalid
  // await disableNotificationTokens(userFid);
}

// Helper function to send notifications (for future use)
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

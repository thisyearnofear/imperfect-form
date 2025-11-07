import { createRemoteLogger } from '@/utils/remoteLogger';
import { PlatformUser } from '@/contexts/PlatformContext';
import { NeynarUser } from '@/contexts/NeynarAuthContext';

const logger = createRemoteLogger('FarcasterSharing');

/**
 * Enhanced sharing utilities for Farcaster
 * Provides multiple sharing strategies with graceful fallbacks for all platforms
 */

export interface ShareContent {
  reps: number;
  exerciseMode: string;
  timeSpent: string;
  network?: string;
  imageUrl?: string;
  earnings?: {
    totalEarned: number;
    weeklyEarnings: number;
    dataQueries: number;
  } | null;
}

export interface ShareResult {
  success: boolean;
  method: 'sdk' | 'neynar' | 'fallback';
  error?: string;
}

/**
 * Try to share directly via Farcaster SDK (best experience for mini apps)
 */
export async function shareViaSdk(content: ShareContent): Promise<ShareResult> {
  try {
    const { sdk } = await import('@farcaster/frame-sdk');

    if (!sdk.actions?.composeCast) {
      logger.warn('Farcaster SDK composeCast action not available');
      return { success: false, method: 'sdk', error: 'SDK composeCast not available' };
    }

    const text = generateShareText(content);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://imperfectform.fun';
    const imageUrl =
      content.imageUrl ||
      `${baseUrl}/api/frames/workout/image?reps=${content.reps}&exerciseMode=${content.exerciseMode}&timeSpent=${content.timeSpent}`;

    const result = await sdk.actions.composeCast({
      text,
      embeds: [imageUrl],
      channelKey: content.network, // Use network as channel if available
    });

    if (result?.cast) {
      logger.info('Successfully shared via Farcaster SDK composeCast');
      return { success: true, method: 'sdk' };
    } else {
      logger.warn('User cancelled cast composition');
      return { success: false, method: 'sdk', error: 'User cancelled' };
    }
  } catch (error) {
    logger.error('Failed to share via Farcaster SDK:', error);
    return { success: false, method: 'sdk', error: String(error) };
  }
}

/**
 * Share via Neynar API (requires authentication)
 * Enhanced version with better error handling and custom message support
 */
export async function shareViaNeynar(
  content: ShareContent,
  signerUuid: string
): Promise<ShareResult> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://imperfectform.fun';
    const imageUrl =
      content.imageUrl ||
      `${baseUrl}/api/frames/workout/image?reps=${content.reps}&exerciseMode=${content.exerciseMode}&timeSpent=${content.timeSpent}`;

    // Use the custom share text generation for consistency
    const text = generateShareText(content);

    const response = await fetch('/api/farcaster/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signerUuid,
        text, // Use generated text instead of individual fields
        reps: content.reps,
        exerciseMode: content.exerciseMode,
        timeSpent: content.timeSpent,
        network: content.network,
        imageUrl,
      }),
    });

    const result = await response.json();

    if (result.success) {
      logger.info('Successfully shared via Neynar API');
      return { success: true, method: 'neynar' };
    } else {
      logger.error('Neynar API share failed:', result.error);
      return { success: false, method: 'neynar', error: result.error };
    }
  } catch (error) {
    logger.error('Failed to share via Neynar API:', error);
    return { success: false, method: 'neynar', error: String(error) };
  }
}

/**
 * Fallback to Warpcast compose URL
 */
export function shareViaFallback(content: ShareContent): ShareResult {
  try {
    const text = generateShareText(content);
    const warpcastBaseUrl = 'https://warpcast.com/~/compose?text=';
    const encodedText = encodeURIComponent(text);
    const channelTag = content.network
      ? `&embeds[]=https://warpcast.com/~/channel/${content.network}`
      : '';
    const fullWarpcastUrl = `${warpcastBaseUrl}${encodedText}${channelTag}`;

    window.open(fullWarpcastUrl, '_blank');

    logger.info('Opened fallback Warpcast compose URL');
    return { success: true, method: 'fallback' };
  } catch (error) {
    logger.error('Failed to open fallback share URL:', error);
    return { success: false, method: 'fallback', error: String(error) };
  }
}

/**
 * Smart sharing function that tries multiple methods in order of preference
 * Enhanced to support both legacy and modern Neynar authentication
 */
export async function smartShare(
  content: ShareContent,
  options: {
    isInMiniApp?: boolean;
    user?: PlatformUser | null;
    signerUuid?: string | null;
    neynarUser?: NeynarUser | null;
  } = {}
): Promise<ShareResult> {
  const { isInMiniApp = false, user = null, signerUuid = null, neynarUser = null } = options;

  // Strategy 1: If in mini app with authenticated user, try SDK first
  if (isInMiniApp && user) {
    logger.info('Attempting SDK share for authenticated mini app user');
    const sdkResult = await shareViaSdk(content);
    if (sdkResult.success) {
      return sdkResult;
    }
    logger.warn('SDK share failed, falling back to Neynar');
  }

  // Strategy 2: Try modern Neynar auth first (preferred)
  if (neynarUser?.signer_uuid) {
    logger.info('Attempting Neynar API share with modern auth');
    const neynarResult = await shareViaNeynar(content, neynarUser.signer_uuid);
    if (neynarResult.success) {
      return neynarResult;
    }
    logger.warn('Modern Neynar API share failed, trying legacy auth');
  }

  // Strategy 3: Try legacy signer UUID if available
  if (signerUuid) {
    logger.info('Attempting Neynar API share with legacy signer UUID');
    const neynarResult = await shareViaNeynar(content, signerUuid);
    if (neynarResult.success) {
      return neynarResult;
    }
    logger.warn('Legacy Neynar API share failed, falling back to Warpcast');
  }

  // Strategy 4: Fallback to Warpcast compose URL
  logger.info('Using fallback Warpcast compose URL');
  return shareViaFallback(content);
}

/**
 * Generate share text based on content
 */
function generateShareText(content: ShareContent): string {
  const { reps, exerciseMode, timeSpent, network, earnings } = content;

  let text = `I just completed ${reps} ${exerciseMode} in ${timeSpent} on Imperfect Form! 💪`;

  // Add earnings information if available
  if (earnings && earnings.totalEarned > 0) {
    text += `\n\n💰 Earning $${earnings.totalEarned.toFixed(4)} in $MEM tokens for sharing fitness data with the community!`;
  }

  text += `\n\nCome join the Onchain Olympics!`;

  if (network) {
    text += `\n\n#${network}`;
  }

  return text;
}

/**
 * Get network display name for sharing
 */
export function getNetworkDisplayName(network: string | undefined): string {
  switch (network) {
    case 'polygon':
      return 'Polygon';
    case 'base':
      return 'Base';
    case 'celo':
      return 'Celo';
    case 'monad':
      return 'Monad';
    default:
      return 'Farcaster';
  }
}

/**
 * Check if user is authenticated in mini app context
 */
export function isUserAuthenticatedInMiniApp(
  isInMiniApp: boolean,
  user: PlatformUser | null
): boolean {
  return isInMiniApp && user !== null && (user.fid !== undefined || user.username !== undefined);
}

/**
 * Generates a Twitter share URL
 * @param text The text to share
 * @param url The URL to share (optional)
 * @param hashtags Array of hashtags without the # symbol (optional)
 * @returns The Twitter share URL
 */
export function getTwitterShareUrl(text: string, url?: string, hashtags?: string[]): string {
  const params = new URLSearchParams();
  params.append('text', text);

  if (url) {
    params.append('url', url);
  }

  if (hashtags && hashtags.length > 0) {
    params.append('hashtags', hashtags.join(','));
  }

  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Opens a share URL in a new window
 * @param url The URL to open
 */
export function openShareWindow(url: string): void {
  window.open(url, '_blank', 'width=550,height=420');
}

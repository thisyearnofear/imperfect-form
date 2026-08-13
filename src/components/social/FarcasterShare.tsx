'use client';

import React, { useState, useCallback } from 'react';
import { PlatformUser } from '@/contexts/PlatformContext';
import { useNeynarAuth } from '@/contexts/NeynarAuthContext';
import { smartShare, getNetworkDisplayName, ShareContent } from '@/utils/farcasterSharing';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('FarcasterShare');

interface FarcasterShareProps {
  reps: number;
  exerciseMode: string;
  timeSpent: string;
  network?: string;
  isInMiniApp?: boolean;
  user?: PlatformUser | null;
}

/** Optional Farcaster compose — never a Neynar sign-in wall. Mini-app uses
 *  the native share action; the web path opens Warpcast compose. */
export default function FarcasterShare({
  reps,
  exerciseMode,
  timeSpent,
  network,
  isInMiniApp = false,
  user = null,
}: FarcasterShareProps) {
  const { user: neynarUser } = useNeynarAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [shareCompleted, setShareCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://imperfectform.fun';

  const handleComposeShare = useCallback(() => {
    const text = encodeURIComponent(
      `I just completed ${reps} ${exerciseMode} in ${timeSpent} on Imperfect Form.\n\nhttps://imperfectform.fun`
    );
    window.open(`https://warpcast.com/~/compose?text=${text}`, '_blank', 'noopener,noreferrer');
  }, [reps, exerciseMode, timeSpent]);

  const handleSmartShare = useCallback(async () => {
    if (shareCompleted) return;

    setIsLoading(true);
    setError(null);

    try {
      const shareContent: ShareContent = {
        reps,
        exerciseMode,
        timeSpent,
        network,
        imageUrl: `${baseUrl}/api/frames/workout/image?reps=${reps}&exerciseMode=${exerciseMode}&timeSpent=${timeSpent}`,
      };

      const result = await smartShare(shareContent, {
        isInMiniApp,
        user,
        signerUuid: null,
        neynarUser,
      });

      if (result.success) {
        logger.info(`Share successful via ${result.method}!`);
        setShareCompleted(true);
      } else {
        logger.error(`Share failed via ${result.method}:`, result.error);
        handleComposeShare();
      }
    } catch (shareError) {
      logger.error('Smart share failed:', shareError);
      handleComposeShare();
    } finally {
      setIsLoading(false);
    }
  }, [
    reps,
    exerciseMode,
    timeSpent,
    network,
    baseUrl,
    isInMiniApp,
    user,
    neynarUser,
    shareCompleted,
    handleComposeShare,
  ]);

  return (
    <div className="flex flex-col items-center w-full max-w-[280px] mx-auto pt-1">
      {shareCompleted ? (
        <p className="text-[11px] text-teal-200/70 font-medium tracking-wide">
          Shared{network ? ` to ${getNetworkDisplayName(network)}` : ''}.
        </p>
      ) : (
        <button
          type="button"
          onClick={isInMiniApp ? handleSmartShare : handleComposeShare}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-200/55 hover:text-teal-100/90 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Sharing…' : 'Share to Farcaster'}
        </button>
      )}
      {error ? <p className="mt-1 text-xs text-red-400/80 text-center">{error}</p> : null}
    </div>
  );
}

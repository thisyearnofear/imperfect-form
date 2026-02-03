'use client';

import React, { useState, useCallback } from 'react';
import { PlatformUser } from '@/contexts/PlatformContext';
import { useNeynarAuth } from '@/contexts/NeynarAuthContext';
import { NeynarAuth, useNeynarClientId } from '@/components/auth/NeynarAuth';
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

export default function FarcasterShare({
  reps,
  exerciseMode,
  timeSpent,
  network,
  isInMiniApp = false,
  user = null,
}: FarcasterShareProps) {
  const { user: neynarUser, isAuthenticated } = useNeynarAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [shareCompleted, setShareCompleted] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = useNeynarClientId();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://imperfectform.fun';

  // Enhanced sharing using the smart sharing utility
  const handleSmartShare = useCallback(async () => {
    if (shareCompleted) {
      return; // Prevent multiple calls if already shared
    }

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
        signerUuid: null, // We're using modern auth, so no legacy signer UUID
        neynarUser,
      });

      if (result.success) {
        logger.info(`Share successful via ${result.method}!`);
        setShareCompleted(true);

        // Only show fallback if the method was fallback
        if (result.method === 'fallback') {
          setShowFallback(false); // Hide fallback button since we just used it
        }
      } else {
        logger.error(`Share failed via ${result.method}:`, result.error);
        setError(result.error || 'Share failed');

        // If SDK or Neynar failed, show fallback option
        if (result.method !== 'fallback') {
          setShowFallback(true);
        }
      }
    } catch (error) {
      logger.error('Smart share failed:', error);
      setError('An unexpected error occurred');
      setShowFallback(true);
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
  ]);

  // Fallback to traditional warpcast sharing
  const handleFallbackShare = useCallback(() => {
    const warpcastBaseUrl = 'https://warpcast.com/~/compose?text=';
    const text = encodeURIComponent(
      `I just completed ${reps} ${exerciseMode} in ${timeSpent} on Imperfect Form! 💪\n\nCome join the Onchain Olympics at https://imperfectform.fun`
    );
    const channelTag = network ? `&embeds[]=https://warpcast.com/~/channel/${network}` : '';
    const fullWarpcastUrl = `${warpcastBaseUrl}${text}${channelTag}`;

    window.open(fullWarpcastUrl, '_blank');
    setShowFallback(false);
  }, [reps, exerciseMode, timeSpent, network]);

  const handleAuthSuccess = useCallback(() => {
    logger.info('Authentication successful, user can now share');
    setError(null);
  }, []);

  const handleAuthError = useCallback((error: string) => {
    logger.error('Authentication failed:', error);
    setError('Authentication failed. Please try again.');
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-[280px] mx-auto pt-2">
      {shareCompleted ? (
        <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black py-3 px-8 rounded-full flex items-center mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="tracking-tight uppercase text-sm">Achievement Shared!</span>
          </div>
          <p className="text-[10px] text-green-400/80 font-bold uppercase tracking-wider">
            Broadcasting to {getNetworkDisplayName(network)}
          </p>
        </div>
      ) : (
        <div className="w-full space-y-3">
          {/* Authentication or Share Button */}
          {isAuthenticated ? (
            <button
              onClick={handleSmartShare}
              className={`
                w-full bg-gradient-to-r from-[#fcb131] via-[#f39c12] to-[#fcb131]
                text-black font-black py-4 px-6 rounded-xl flex items-center justify-center
                shadow-[0_4px_20px_rgba(252,177,49,0.2)] hover:shadow-[0_6px_25px_rgba(252,177,49,0.4)]
                active:scale-95 transition-all group overflow-hidden relative
                ${isLoading ? 'opacity-80' : ''}
              `}
              disabled={isLoading || shareCompleted}
            >
              {isLoading && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20 overflow-hidden">
                  <div className="h-full bg-white animate-progress-indefinite" />
                </div>
              )}
              <span className="mr-3 text-sm tracking-tight uppercase">
                {isLoading ? 'Broadcasting...' : 'Share Achievement'}
              </span>
              <div className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 8.8C16.49 10.38 15.84 14.22 15.51 15.99C15.37 16.74 15.09 16.99 14.83 17.02C14.25 17.07 13.81 16.64 13.25 16.27C12.37 15.69 11.87 15.33 11.02 14.77C10.03 14.12 10.67 13.76 11.24 13.18C11.39 13.03 13.95 10.7 14 10.49C14.0069 10.4476 14.0069 10.4043 14 10.362C13.9884 10.3208 13.9679 10.2834 13.94 10.253C13.9068 10.2266 13.8694 10.2068 13.83 10.1943C13.7905 10.1818 13.7489 10.1769 13.708 10.18C13.61 10.18 13.5 10.18 13.39 10.27C13.25 10.38 11.5 11.61 8.12 14.03C7.7 14.3 7.32 14.43 6.98 14.42C6.6 14.41 5.88 14.19 5.35 14C4.7 13.77 4.18 13.64 4.22 13.27C4.24 13.08 4.5 12.89 5 12.7C8.57 11.08 10.9 10 12 9.45C15.19 7.88 15.83 7.65 16.26 7.65C16.36 7.65 16.58 7.67 16.73 7.8C16.84 7.9 16.88 8.05 16.89 8.16C16.9 8.23 16.91 8.43 16.89 8.59L16.64 8.8Z"
                    fill="black"
                  />
                </svg>
              </div>
            </button>
          ) : (
            <div className="flex flex-col items-center space-y-3 w-full bg-white/5 p-4 rounded-xl border border-white/10">
              <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest text-center">
                Identity Required
              </p>
              <NeynarAuth
                clientId={clientId}
                theme="dark"
                className="w-full"
                onSuccess={handleAuthSuccess}
                onError={handleAuthError}
              />
            </div>
          )}

          {/* Error Display */}
          {error && <div className="mt-2 text-sm text-red-400 text-center">{error}</div>}

          {/* Fallback Share Button */}
          {showFallback && (
            <button
              onClick={handleFallbackShare}
              className="mt-2 bg-gray-700 text-white py-2 px-4 rounded-lg flex items-center"
            >
              Manual Share via Warpcast
            </button>
          )}
        </div>
      )}

      {/* Help Text */}
      {!shareCompleted && !isAuthenticated && !isInMiniApp && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Sign in to share with Farcaster
        </div>
      )}
    </div>
  );
}

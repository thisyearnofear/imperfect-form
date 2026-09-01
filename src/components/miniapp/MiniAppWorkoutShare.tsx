'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePlatform, usePlatformFeatures } from '@/contexts/PlatformContext';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('MiniAppWorkoutShare');

interface MiniAppWorkoutShareProps {
  reps: number;
  exerciseMode: string;
  timeSpent: string;
  onShareComplete?: () => void;
  className?: string;
}

export function MiniAppWorkoutShare({
  reps,
  exerciseMode,
  timeSpent,
  onShareComplete,
  className = '',
}: MiniAppWorkoutShareProps) {
  const { platform, user } = usePlatform();
  const { canShare, share } = usePlatformFeatures();
  const isInMiniApp = platform === 'farcaster';
  const canShareContent = canShare;
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleShare = async () => {
    if (!canShareContent) {
      logger.warn('Cannot share: Mini App sharing not available');
      return;
    }

    setIsSharing(true);
    setShareSuccess(false);

    try {
      // Create workout share content with monetization messaging
      const shareContent = {
        text: `Just completed ${reps} ${exerciseMode} in ${timeSpent} on Imperfect Form! 🏋️‍♂️💰

Earning $MEM tokens for sharing my fitness data with the community. Join the movement!`,
        url: 'https://imperfectform.fun',
      };
      const success = await share(shareContent);

      if (success) {
        setShareSuccess(true);
        onShareComplete?.();
        logger.info('🎯 Workout shared successfully via Mini App');

        // Reset success state after 3 seconds
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (error) {
      logger.error('Failed to share workout', error);
    } finally {
      setIsSharing(false);
    }
  };

  // Don't render if not in Mini App or can't share
  if (!isInMiniApp || !canShareContent) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      {/* User info if available */}
      {user && (
        <div className="flex items-center space-x-2 text-sm text-purple-300">
          <Image
            src={user.pfpUrl || '/default-avatar.png'}
            alt={user.displayName || 'User'}
            width={24}
            height={24}
            className="rounded-full"
          />
          <span>Sharing as @{user.username}</span>
        </div>
      )}

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={isSharing || shareSuccess}
        className={`
          flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
          ${
            shareSuccess
              ? 'bg-green-600 text-white'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
          }
          ${isSharing ? 'opacity-75 cursor-not-allowed' : ''}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isSharing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Sharing...</span>
          </>
        ) : shareSuccess ? (
          <>
            <span className="text-lg">✅</span>
            <span>Shared!</span>
          </>
        ) : (
          <>
            <span className="text-lg">🎭</span>
            <span>Share to Farcaster</span>
          </>
        )}
      </button>

      {/* Workout summary */}
      <div className="text-center text-sm text-gray-400">
        <div className="font-bold text-brass">
          {reps} {exerciseMode} in {timeSpent}
        </div>
        <div className="text-xs mt-1">Share your achievement with the Farcaster community!</div>
      </div>
    </div>
  );
}

// Compact version for mobile/inline use
export function CompactMiniAppShare({
  reps,
  exerciseMode,
  timeSpent,
  onShareComplete,
  className = '',
}: MiniAppWorkoutShareProps) {
  const { platform } = usePlatform();
  const { canShare, share } = usePlatformFeatures();
  const isInMiniApp = platform === 'farcaster';
  const canShareContent = canShare;
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!canShareContent) return;

    setIsSharing(true);
    try {
      const shareContent = {
        text: `Just completed ${reps} ${exerciseMode} in ${timeSpent} on Imperfect Form! 🏋️‍♂️`,
        url: 'https://imperfectform.fun',
      };
      const success = await share(shareContent);
      if (success) {
        onShareComplete?.();
      }
    } catch (error) {
      logger.error('Failed to share workout', error);
    } finally {
      setIsSharing(false);
    }
  };

  if (!isInMiniApp || !canShareContent) {
    return null;
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`
        flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700
        text-white rounded-lg text-sm font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isSharing ? (
        <>
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
          <span>Sharing...</span>
        </>
      ) : (
        <>
          <span>🎭</span>
          <span>Share</span>
        </>
      )}
    </button>
  );
}

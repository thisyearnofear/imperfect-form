'use client';

import React from 'react';
import { type EnhancedProfile } from '@/hooks/useEnhancedProfile';

interface ProfileComparisonProps {
  targetProfile?: EnhancedProfile;
  currentProfile?: EnhancedProfile;
}

export const ProfileComparison: React.FC<ProfileComparisonProps> = ({
  targetProfile,
  currentProfile,
}) => {
  // Don't show comparison if either profile is missing
  if (!targetProfile || !currentProfile) {
    return null;
  }

  const targetFollowers =
    (targetProfile.socialStats?.farcasterFollowers || 0) +
    (targetProfile.socialStats?.twitterFollowers || 0) +
    (targetProfile.socialStats?.lensFollowers || 0);

  const currentFollowers =
    (currentProfile.socialStats?.farcasterFollowers || 0) +
    (currentProfile.socialStats?.twitterFollowers || 0) +
    (currentProfile.socialStats?.lensFollowers || 0);

  const diff = targetFollowers - currentFollowers;

  return (
    <div className="profile-instruction pt-2 border-t border-[#fcb131]/20">
      <div className="bg-black/50 rounded p-2 text-xs">
        <span className="button-text start">COMPARISON</span>
        <div className="mt-1 space-y-1">
          <div
            className={`text-xs ${diff > 0 ? 'text-red-300' : diff < 0 ? 'text-green-300' : 'text-yellow-300'}`}
          >
            {diff > 0
              ? `📈 They have ${diff.toLocaleString()} more total followers`
              : diff < 0
                ? `📉 You have ${Math.abs(diff).toLocaleString()} more total followers`
                : `🤝 Equal total followers (${targetFollowers.toLocaleString()})`}
          </div>
        </div>
      </div>
    </div>
  );
};

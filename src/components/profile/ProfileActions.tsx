'use client';

import React from 'react';
import { type EnhancedProfile } from '@/hooks/useEnhancedProfile';

interface ProfileActionsProps {
  profile?: EnhancedProfile;
}

export const ProfileActions: React.FC<ProfileActionsProps> = ({ profile }) => {
  const handleFollow = () => {
    if (!profile) return;
    const farcasterIdentity = profile.identities.find((id) => id.platform === 'farcaster');
    if (farcasterIdentity?.username) {
      window.open(`https://farcaster.xyz/${farcasterIdentity.username}`, '_blank');
    }
  };

  const handleChallenge = () => {
    // Challenge functionality - could integrate with your fitness tracking
    alert('Challenge feature coming soon! 💪');
  };

  // Don't show actions if no profile
  if (!profile) {
    return null;
  }

  return (
    <div className="profile-instruction pt-2">
      <div className="flex gap-2 justify-center">
        <button
          className="bg-[#fcb131]/10 hover:bg-[#fcb131]/20 border border-[#fcb131]/30 rounded px-2 py-1 text-xs transition-all duration-200 transform hover:scale-105"
          onClick={handleFollow}
        >
          Follow 🟣
        </button>
        <button
          className="bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/30 rounded px-2 py-1 text-xs transition-all duration-200 transform hover:scale-105"
          onClick={handleChallenge}
        >
          Challenge 💪
        </button>
      </div>
    </div>
  );
};

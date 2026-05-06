'use client';

import React from 'react';
import { type EnhancedProfile } from '@/hooks/useEnhancedProfile';
import { useUserStats } from '@/hooks/useUserStats';
import { usePlatform } from '@/contexts/PlatformContext';

interface ProfileActionsProps {
  profile?: EnhancedProfile;
}

export const ProfileActions: React.FC<ProfileActionsProps> = ({ profile }) => {
  const { wallet } = usePlatform();
  const { userStats } = useUserStats(wallet?.address);
  const handleFollow = () => {
    if (!profile) return;
    const farcasterIdentity = profile.identities.find((id) => id.platform === 'farcaster');
    // For Farcaster identities, the username is typically stored in the 'id' field
    const username = farcasterIdentity?.username || farcasterIdentity?.id;
    if (username) {
      window.open(`https://farcaster.xyz/${username}`, '_blank');
    }
  };

  const handleChallenge = async () => {
    if (!profile) return;

    const farcasterIdentity = profile.identities.find((id) => id.platform === 'farcaster');
    // For Farcaster identities, the username is typically stored in the 'id' field
    const username = farcasterIdentity?.username || farcasterIdentity?.id;

    if (!username) {
      alert('Unable to find Farcaster username for challenge');
      return;
    }

    // Enhanced challenge text with personal workout stats
    let challengeText = `Hey @${username}, I challenge you to a friendly fitness competition! 💪\n\n`;

    // Add personal stats if available to make the challenge more engaging
    if (userStats && (userStats.bestPushups > 0 || userStats.bestSquats > 0)) {
      const bestScore = Math.max(userStats.bestPushups, userStats.bestSquats);
      const bestExercise = userStats.bestPushups >= userStats.bestSquats ? 'pushups' : 'squats';

      challengeText += `My personal best: ${bestScore} ${bestExercise}! Can you beat that? 🔥\n\n`;

      // Add streak motivation if available
      if (userStats.currentStreak > 0) {
        challengeText += `I'm on a ${userStats.currentStreak} day streak right now! 🚀\n\n`;
      }
    }

    challengeText += `Let's see who can crush more reps on Imperfect Form! Loser sends a tip or donates to charity? 😤\n\nReady to get schooled? 🏆\n\nJoin the challenge at imperfectform.fun`;

    // Use Warpcast compose URL for simplicity (no auth required)
    const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(challengeText)}&embeds[]=https://warpcast.com/~/channel/fitness`;

    window.open(warpcastUrl, '_blank');
  };

  // Don't show actions if no profile
  if (!profile) {
    return null;
  }

  return (
    <div className="profile-instruction pt-2">
      <div className="flex gap-2 justify-center">
        <button
          className="bg-[primary]/10 hover:bg-[primary]/20 border border-[primary]/30 rounded px-2 py-1 text-xs transition-all duration-200 transform hover:scale-105"
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

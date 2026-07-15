import React from 'react';
import Image from 'next/image';
import { shortenAddress } from '@/utils/formatters';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { FarcasterProfile } from '@/utils/neynarResolver';

interface ProfileDisplayProps {
  userAddress: string;
  displayName: string;
  farcasterProfile?: FarcasterProfile | null;
  isVerified?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  showVerification?: boolean;
  className?: string;
}

/**
 * Reusable profile display component for leaderboard entries
 * Consolidates profile picture, name, and verification badge logic
 * Follows DRY principle by centralizing profile display logic
 */
export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  userAddress,
  displayName,
  farcasterProfile,
  isVerified = false,
  onClick,
  size = 'sm',
  showVerification = true,
  className = '',
}) => {
  const profilePicUrl = farcasterProfile?.pfpUrl;
  const isFarcasterUser = !!farcasterProfile;

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Hide image if it fails to load and prevent further errors
    e.currentTarget.style.display = 'none';
    // Remove the profile picture URL to prevent retry
    if (farcasterProfile) {
      farcasterProfile.pfpUrl = undefined;
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Profile Picture or Fallback Avatar */}
      {profilePicUrl ? (
        <Image
          src={profilePicUrl}
          alt="Profile"
          width={size === 'sm' ? 24 : 32}
          height={size === 'sm' ? 24 : 32}
          className={`${sizeClasses[size]} rounded-full border-2 border-white/20 hover:border-primary transition-all duration-200`}
          onError={handleImageError}
          unoptimized={true} // Disable Next.js image optimization for external URLs
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full border-2 border-white/20 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center`}
        >
          <span className="text-primary font-bold text-xs">
            {displayName?.charAt(0)?.toUpperCase() || '👤'}
          </span>
        </div>
      )}

      {/* Display Name */}
      <span
        className={`font-bold cursor-pointer hover:underline transition-all duration-200 transform hover:scale-105 ${
          isFarcasterUser
            ? 'text-purple-600 hover:text-purple-400'
            : 'text-primary hover:text-yellow-300'
        } ${textSizeClasses[size]}`}
        onClick={handleProfileClick}
        title="View profile"
      >
        {displayName || shortenAddress(userAddress)}
      </span>

      {/* Farcaster Indicator */}
      {isFarcasterUser && (
        <span className="text-xs text-purple-500" title="Farcaster user">
          🎭
        </span>
      )}

      {/* Verification Badge */}
      {showVerification && <VerificationBadge isVerified={isVerified} size={size} />}
    </div>
  );
};

export default ProfileDisplay;

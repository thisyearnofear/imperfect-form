'use client';

import React from 'react';
import { type EnhancedProfile } from '@/hooks/useEnhancedProfile';
import { usePlatform } from '@/contexts/PlatformContext';
import { useXpProgress } from '@/hooks/useXpProgress';
import { useAchievements } from '@/hooks/useAchievements';
import { xpService } from '@/services/XPService';
import { ACHIEVEMENTS } from '@/services/AchievementService';
import { AchievementIcon } from '@/components/ui/AchievementIcon';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Handshake,
  MessageCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { XpProgressBar } from './XpProgressBar';
import { ThemeSwitcher } from './ThemeSwitcher';
import { DailyQuests } from './DailyQuests';
import { Roadmap } from './Roadmap';
import { StatCell } from './StatCell';
import { CountUp } from '@/components/ui/CountUp';

interface ProfileDisplayProps {
  profile?: EnhancedProfile;
  loading?: boolean;
  isCurrentUser?: boolean;
}

export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  profile,
  loading = false,
  isCurrentUser = false,
}) => {
  const { wallet, user: farcasterUser } = usePlatform();
  const { progress, pbs, workouts } = useXpProgress();
  const { unlockedAchievements } = useAchievements();

  const streakInfo = React.useMemo(() => xpService.getStreakInfo(workouts), [workouts]);
  const [copied, setCopied] = React.useState(false);

  // Social identity rows — one config entry per platform, rendered by a single
  // studio-card item below (icon, label, follower count, external link).
  const farcasterUsername =
    profile?.identities.find((id) => id.platform === 'farcaster')?.username ||
    farcasterUser?.username;
  const twitterUsername = profile?.identities.find((id) => id.platform === 'twitter')?.username;
  const lensUsername = profile?.identities.find((id) => id.platform === 'lens')?.username;

  const socialRows = [
    farcasterUsername
      ? {
          key: 'farcaster',
          label: 'Farcaster',
          icon: Users,
          url: `https://farcaster.xyz/${farcasterUsername}`,
          followers: `${profile?.socialStats?.farcasterFollowers?.toLocaleString() || '0'} followers`,
        }
      : null,
    twitterUsername
      ? {
          key: 'twitter',
          label: 'Twitter',
          icon: MessageCircle,
          url: `https://x.com/${twitterUsername}`,
          followers: `${profile?.socialStats?.twitterFollowers?.toLocaleString() || '0'} followers`,
        }
      : null,
    lensUsername
      ? {
          key: 'lens',
          label: 'Lens',
          icon: Eye,
          url: `https://hey.xyz/u/${lensUsername}`,
          followers: `${profile?.socialStats?.lensFollowers?.toLocaleString() || '0'} followers`,
        }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row != null);

  // Show loading state while loading — studio skeleton, not the split-flap readout
  if (loading) {
    return (
      <div className="studio-card studio-card__body" aria-busy="true" aria-live="polite">
        <div className="h-3 w-24 rounded animate-pulse bg-[rgba(139,227,212,0.12)]" />
        <div className="h-4 w-44 rounded animate-pulse bg-[rgba(139,227,212,0.08)]" />
        <div className="h-4 w-36 rounded animate-pulse bg-[rgba(139,227,212,0.08)]" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Show profile data when available */}
      {!loading && profile && (
        <>
          {/* XP & stats — studio card. Level/XP read as brass punctuation on the
              private chassis; streaks + PBs are quiet earned rows. */}
          {isCurrentUser && (
            <div className="studio-card studio-card__body mb-6 mt-2">
              <XpProgressBar
                progress={progress.progressToNextLevel}
                currentLevel={progress.currentLevel}
                xpToNextLevel={progress.xpToNextLevel}
              />

              <ThemeSwitcher />

              {/* Personal bests — brass: graded against the ideal */}
              <div className="grid grid-cols-2 gap-4 border-t border-[color:var(--studio-border)] pt-4">
                <StatCell
                  label="Personal Best · Pushups"
                  value={<CountUp to={pbs.pushups} />}
                  unit="reps"
                />
                <StatCell
                  label="Personal Best · Squats"
                  value={<CountUp to={pbs.squats} />}
                  unit="reps"
                />
              </div>

              {/* Streaks — quiet earned rows */}
              <div className="grid grid-cols-2 gap-4 border-t border-[color:var(--studio-border)] pt-4">
                <StatCell
                  label="Current Streak"
                  value={<CountUp to={streakInfo.currentStreak} />}
                  unit="days"
                  valueClassName="text-[var(--studio-paper-soft)]"
                />
                <StatCell
                  label="Best Streak"
                  value={<CountUp to={streakInfo.bestStreak} />}
                  unit="days"
                  valueClassName="text-[var(--studio-paper-soft)]"
                />
              </div>

              {/* Achievements */}
              <div className="border-t border-[color:var(--studio-border)] pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="studio-card__section-title">Achievements</span>
                  <span className="studio-card__badge">
                    {unlockedAchievements.length} / {ACHIEVEMENTS.length}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {ACHIEVEMENTS.map((achievement) => {
                    const isUnlocked = unlockedAchievements.some((a) => a.id === achievement.id);
                    return (
                      <div
                        key={achievement.id}
                        className={`aspect-square rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isUnlocked
                            ? 'border border-[color:var(--sandow-rule-quiet)] bg-[rgba(252,177,49,0.08)] shadow-[0_0_12px_rgba(252,177,49,0.12)]'
                            : 'border border-white/5 bg-white/5 grayscale opacity-30'
                        }`}
                        title={achievement.name + ': ' + achievement.description}
                      >
                        <AchievementIcon
                          icon={achievement.icon}
                          size={20}
                          className={isUnlocked ? 'text-[var(--sandow-brass)]' : 'text-gray-400'}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-between items-center text-[11px] font-mono text-[var(--studio-muted)] uppercase border-t border-[color:var(--studio-border)] pt-4">
                <span>Total Workouts: {workouts.length}</span>
                <span>Total XP: {progress.totalXp}</span>
              </div>
            </div>
          )}

          {isCurrentUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <DailyQuests />
              <Roadmap />
            </div>
          )}

          {/* Identity & social — studio card */}
          <div className="studio-card studio-card__body">
            <p className="studio-card__section-title">Identity & social</p>

            {profile.mutualConnections && profile.mutualConnections.length > 0 && (
              <div className="studio-card__item studio-card__item--success items-center">
                <Handshake size={16} className="shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold">
                  {profile.mutualConnections.length} mutual connections
                </span>
              </div>
            )}

            {/* Wallet — copy address */}
            <div className="studio-card__item items-center">
              <Wallet
                size={16}
                className="shrink-0"
                style={{ color: 'var(--studio-teal-bright)' }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <div className="studio-card__section-title mb-0.5">Wallet</div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      profile.walletInfo?.address ||
                        wallet?.address ||
                        '0x55A5705453Ee82c742274154136Fce8149597058'
                    );
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  }}
                  className="group inline-flex items-center gap-1.5 font-mono text-sm text-[var(--studio-paper-soft)] hover:text-[var(--studio-teal-bright)] transition-colors"
                  title="Copy address"
                >
                  {profile.walletInfo?.address
                    ? `${profile.walletInfo.address.slice(0, 6)}...${profile.walletInfo.address.slice(-4)}`
                    : wallet?.address
                      ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                      : '0x55A5...7058'}
                  {copied ? (
                    <Check
                      size={12}
                      className="text-[var(--studio-teal-bright)]"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy
                      size={12}
                      className="opacity-50 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  )}
                  <span className="sr-only" role="status" aria-live="polite">
                    {copied ? 'Address copied' : ''}
                  </span>
                </button>
              </div>
            </div>

            {/* Linked identities — only rows with a real username */}
            {socialRows.map((row) => {
              const RowIcon = row.icon;
              return (
                <a
                  key={row.key}
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="studio-card__item items-center group transition-colors hover:border-[rgba(117,223,205,0.3)] hover:bg-[rgba(9,33,34,0.85)]"
                >
                  <RowIcon
                    size={16}
                    className="shrink-0"
                    style={{ color: 'var(--studio-teal-bright)' }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="studio-card__section-title mb-0.5">{row.label}</div>
                    <div className="text-sm font-medium text-[var(--studio-paper-soft)]">
                      {row.followers}
                    </div>
                  </div>
                  <ExternalLink
                    size={14}
                    className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  />
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

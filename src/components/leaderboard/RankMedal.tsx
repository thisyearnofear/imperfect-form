'use client';

import React from 'react';
import { Medal, Trophy, type LucideIcon } from 'lucide-react';

const TIERS: { icon: LucideIcon; color: string }[] = [
  { icon: Trophy, color: '#fcb131' }, // gold — brass token
  { icon: Medal, color: '#c8d6d3' }, // silver
  { icon: Medal, color: '#cd7f32' }, // bronze
];

/** Rank marker for leaderboard rows — lucide glyphs tinted by tier, no emoji. */
export const RankMedal: React.FC<{ rank: number; size?: number }> = ({ rank, size = 16 }) => {
  const tier = TIERS[rank];
  if (!tier) {
    return (
      <span className="font-bold tabular-nums" style={{ color: 'var(--studio-muted)' }}>
        {rank + 1}
      </span>
    );
  }
  const Icon = tier.icon;
  return <Icon size={size} style={{ color: tier.color }} aria-hidden="true" />;
};

export default RankMedal;

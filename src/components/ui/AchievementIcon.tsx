'use client';

import React from 'react';
import { Award, Crown, Dumbbell, Flame, Rocket, type LucideIcon } from 'lucide-react';

/** icon-key → lucide glyph. The service stores semantic keys, not emoji. */
const ICON_MAP: Record<string, LucideIcon> = {
  rocket: Rocket,
  flame: Flame,
  crown: Crown,
  award: Award,
  dumbbell: Dumbbell,
};

interface AchievementIconProps {
  icon: string;
  size?: number;
  className?: string;
}

/** Achievement mark — studio lucide glyph keyed off the service icon name. */
export const AchievementIcon: React.FC<AchievementIconProps> = ({ icon, size = 16, className }) => {
  const Icon = ICON_MAP[icon] ?? Award;
  return <Icon size={size} className={className} aria-hidden="true" />;
};

export default AchievementIcon;

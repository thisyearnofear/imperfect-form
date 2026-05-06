import { Score } from '@/types';

/**
 * Shared network color mapping for consistent styling across all leaderboard components
 * Follows the single source of truth principle (DRY)
 */
export const NETWORK_COLORS = {
  polygon: {
    bg: 'bg-purple-500',
    text: 'text-pink-500',
    border: 'border-pink-500',
    bgOpacity: 'bg-pink-500/20',
    borderLeft: 'border-l-3 border-pink-500',
    name: 'Polygon',
  },
  base: {
    bg: 'bg-blue-500',
    text: 'text-blue-500',
    border: 'border-blue-500',
    bgOpacity: 'bg-blue-500/20',
    borderLeft: 'border-l-3 border-blue-500',
    name: 'Base',
  },
  monad: {
    bg: 'bg-yellow-500',
    text: 'text-yellow-500',
    border: 'border-yellow-500',
    bgOpacity: 'bg-yellow-500/20',
    borderLeft: 'border-l-3 border-yellow-500',
    name: 'Monad',
  },
  celo: {
    bg: 'bg-green-500',
    text: 'text-green-500',
    border: 'border-green-500',
    bgOpacity: 'bg-green-500/20',
    borderLeft: 'border-l-3 border-green-500',
    name: 'Celo',
  },
} as const;

export type NetworkType = keyof typeof NETWORK_COLORS;

/**
 * Get network-specific styling classes
 * Consolidated logic for consistent network theming
 */
export const getNetworkStyling = (network: string) => {
  const networkKey = network.toLowerCase() as NetworkType;
  return NETWORK_COLORS[networkKey] || NETWORK_COLORS.base;
};

/**
 * Get medal styling for top 3 positions
 * Consistent medal theming across all leaderboard components
 */
export const getMedalStyle = (position: number) => {
  switch (position) {
    case 0: // Gold
      return {
        medal: '🥇',
        bg: 'bg-primary/20',
        textColor: 'text-primary',
        border: 'border-primary',
        shadow: 'shadow-[0_0_10px_rgba(252,177,49,0.3)]',
      };
    case 1: // Silver
      return {
        medal: '🥈',
        bg: 'bg-gray-400/20',
        textColor: 'text-gray-300',
        border: 'border-gray-400',
        shadow: 'shadow-[0_0_8px_rgba(156,163,175,0.3)]',
      };
    case 2: // Bronze
      return {
        medal: '🥉',
        bg: 'bg-orange-600/20',
        textColor: 'text-orange-400',
        border: 'border-orange-600',
        shadow: 'shadow-[0_0_8px_rgba(234,88,12,0.3)]',
      };
    default:
      return {
        medal: `${position + 1}`,
        bg: '',
        textColor: 'text-white',
        border: 'border-white/20',
        shadow: '',
      };
  }
};

/**
 * Aggregate scores across networks for a user
 * Shared logic for score consolidation
 */
export const aggregateScoresAcrossNetworks = (leaderboard: Score[]) => {
  const combined: Record<string, { totalScore: number; networks: Record<string, number> }> = {};

  leaderboard.forEach((entry) => {
    if (!combined[entry.user]) {
      combined[entry.user] = { totalScore: 0, networks: {} };
    }
    combined[entry.user].totalScore += entry.score;
    if (!combined[entry.user].networks[entry.network]) {
      combined[entry.user].networks[entry.network] = 0;
    }
    combined[entry.user].networks[entry.network] += entry.score;
  });

  return combined;
};

/**
 * Sort aggregated scores by total score (highest first)
 */
export const sortAggregatedScores = (
  aggregated: Record<string, { totalScore: number; networks: Record<string, number> }>
) => {
  return Object.entries(aggregated)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore)
    .map(([user, data]) => ({ user, ...data }));
};

/**
 * Get hover effects for interactive elements
 * Consistent hover styling across leaderboard components
 */
export const getHoverEffects = (isInteractive: boolean = true) => {
  if (!isInteractive) return '';

  return 'transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer';
};

/**
 * Get golden glow effects for premium elements
 */
export const getGoldenGlow = (intensity: 'subtle' | 'medium' | 'strong' = 'medium') => {
  const intensities = {
    subtle: 'shadow-[0_0_5px_rgba(252,177,49,0.3)]',
    medium: 'shadow-[0_0_10px_rgba(252,177,49,0.5)]',
    strong: 'shadow-[0_0_15px_rgba(252,177,49,0.7)]',
  };
  return intensities[intensity];
};

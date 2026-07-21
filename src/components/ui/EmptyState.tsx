'use client';

import React from 'react';
import { LucideIcon, Inbox, AlertCircle, Search, Users, Trophy } from 'lucide-react';
import Button from './Button';

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type EmptyStateVariant =
  | 'default' // Generic empty state
  | 'list' // Empty list/collection
  | 'search' // No search results
  | 'error' // Error occurred
  | 'leaderboard' // No leaderboard entries yet
  | 'achievements' // No achievements yet
  | 'workout' // No workouts recorded
  | 'profile' // No profile data
  | 'custom'; // Custom icon/message

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESET ICONS & MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_STATE_PRESETS: Record<
  EmptyStateVariant,
  { icon: LucideIcon; title: string; description: string }
> = {
  default: {
    icon: Inbox,
    title: 'Nothing here yet',
    description: 'Start by adding some content.',
  },
  list: {
    icon: Inbox,
    title: 'No items found',
    description: 'This list is currently empty.',
  },
  search: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms.',
  },
  error: {
    icon: AlertCircle,
    title: 'Something went wrong',
    description: 'Please try again later.',
  },
  leaderboard: {
    icon: Trophy,
    title: 'Leaderboard is empty',
    description: 'Be the first to submit a score!',
  },
  achievements: {
    icon: Users,
    title: 'No achievements yet',
    description: 'Complete workouts to unlock achievements.',
  },
  workout: {
    icon: Inbox,
    title: 'No workouts yet',
    description: 'Start your first workout to see your progress.',
  },
  profile: {
    icon: Users,
    title: 'Profile not found',
    description: 'This user profile may not exist.',
  },
  custom: {
    icon: Inbox,
    title: '',
    description: '',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'default',
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  const preset = EMPTY_STATE_PRESETS[variant];
  const IconComponent = icon || preset.icon;
  const finalTitle = title || preset.title;
  const finalDescription = description || preset.description;

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
        <IconComponent className="w-8 h-8 text-zinc-500" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-2">{finalTitle}</h3>

      {/* Description */}
      {finalDescription && (
        <p className="text-sm text-zinc-400 max-w-xs mb-6">{finalDescription}</p>
      )}

      {/* Action Button */}
      {action && (
        <Button onClick={action.onClick} variant="primary" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// PRESET EMPTY STATES
// ═══════════════════════════════════════════════════════════════════════════

export const EmptyLeaderboard: React.FC<{ onStartWorkout?: () => void }> = ({ onStartWorkout }) => (
  <EmptyState
    variant="leaderboard"
    action={
      onStartWorkout
        ? {
            label: 'Start Workout',
            onClick: onStartWorkout,
          }
        : undefined
    }
  />
);

export const EmptySearch: React.FC<{ onClearSearch?: () => void }> = ({ onClearSearch }) => (
  <EmptyState
    variant="search"
    title="No results found"
    description="Try different keywords or check your spelling."
    action={
      onClearSearch
        ? {
            label: 'Clear Search',
            onClick: onClearSearch,
          }
        : undefined
    }
  />
);

export const EmptyError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    variant="error"
    title="Something went wrong"
    description="We encountered an unexpected error. Please try again."
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
          }
        : undefined
    }
  />
);

export const EmptyWorkouts: React.FC<{ onStartWorkout?: () => void }> = ({ onStartWorkout }) => (
  <EmptyState
    variant="workout"
    title="No workouts yet"
    description="Complete your first workout to start tracking your progress."
    action={
      onStartWorkout
        ? {
            label: 'Start Workout',
            onClick: onStartWorkout,
          }
        : undefined
    }
  />
);

export default EmptyState;

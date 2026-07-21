'use client';

import React from 'react';
import Spinner from './Spinner';

// ═══════════════════════════════════════════════════════════════════════════
// UNIFIED LOADING STATE
// ═══════════════════════════════════════════════════════════════════════════

export type LoadingVariant = 'spinner' | 'skeleton' | 'progress' | 'pulse';
export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LoadingStateProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  message?: string;
  progress?: number; // 0-100 for progress variant
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'spinner',
  size = 'md',
  message,
  progress,
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const messageSizes = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  if (variant === 'skeleton') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className={`${sizeClasses[size]} bg-gray-700 rounded animate-pulse`} />
        {message && (
          <span className={`${messageSizes[size]} text-gray-400 animate-pulse`}>{message}</span>
        )}
      </div>
    );
  }

  if (variant === 'progress') {
    return (
      <div className="flex flex-col items-center gap-3 w-full max-w-xs">
        <div
          className="w-full h-2 bg-gray-800 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={message ?? 'Loading'}
        >
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
        {message && <span className={`${messageSizes[size]} text-gray-400`}>{message}</span>}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className={`${sizeClasses[size]} rounded-full bg-primary/20 animate-ping`} />
        {message && <span className={`${messageSizes[size]} text-gray-400`}>{message}</span>}
      </div>
    );
  }

  // Default: spinner
  const spinnerSize = size === 'xs' ? 'sm' : size;
  return (
    <div className="flex flex-col items-center gap-3">
      <Spinner size={spinnerSize} />
      {message && <span className={`${messageSizes[size]} text-gray-400`}>{message}</span>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SPECIFIC LOADING COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export interface PageLoadingProps {
  title?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ title = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <LoadingState variant="spinner" size="lg" message={title} />
  </div>
);

export interface ComponentLoadingProps {
  height?: string;
}

export const ComponentLoading: React.FC<ComponentLoadingProps> = ({ height = 'h-32' }) => (
  <div className={`flex items-center justify-center ${height} bg-zinc-900/50 rounded-lg`}>
    <LoadingState variant="pulse" size="md" />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS FOR BACKWARDS COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════

export { default as Spinner } from './Spinner';
export { default as UnifiedLoader } from './UnifiedLoader';

export default LoadingState;

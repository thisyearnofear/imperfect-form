/**
 * Simple Pioneer Badge for Legacy Users
 */

import React from 'react';

interface PioneerBadgeProps {
  size?: 'sm' | 'md';
}

export const PioneerBadge: React.FC<PioneerBadgeProps> = ({ size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium ${sizeClasses}`}
    >
      <svg className="h-3 w-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      Pioneer
    </span>
  );
};

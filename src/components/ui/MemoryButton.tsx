/**
 * Standardized Memory Protocol Button Component
 *
 * Follows the app's design ethos with consistent styling, gradients, borders, and retro font.
 */

import React from 'react';

interface MemoryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

function MemoryButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  ...props
}: MemoryButtonProps) {
  // Base classes - following the app's established patterns
  const baseClasses = [
    'font-bold rounded-lg transition-all duration-200 transform hover:scale-105',
    'shadow-lg border-2 disabled:opacity-50 disabled:cursor-not-allowed',
    'disabled:transform-none disabled:hover:scale-100',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50',
    fullWidth ? 'w-full' : '',
    loading ? 'cursor-wait' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Variant classes - using the app's established color scheme and gradients
  const variantClasses = {
    primary: [
      'bg-gradient-to-r from-primary to-primary-dark text-black',
      'hover:from-primary-dark hover:to-primary border-primary',
      'hover:shadow-primary',
    ].join(' '),
    secondary: [
      'bg-gray-800 text-primary border-primary',
      'hover:bg-primary hover:text-black',
      'hover:shadow-primary-sm',
    ].join(' '),
    success: [
      'bg-gradient-to-r from-green-600 to-green-700 text-white',
      'hover:from-green-700 hover:to-green-600 border-green-500',
      'hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]',
    ].join(' '),
    danger: [
      'bg-gradient-to-r from-red-600 to-red-700 text-white',
      'hover:from-red-700 hover:to-red-600 border-red-500',
      'hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]',
    ].join(' '),
  };

  // Retro font for primary buttons (following app's typography hierarchy)
  const fontStyle =
    variant === 'primary' ? { fontFamily: "'Press Start 2P', monospace", fontSize: '12px' } : {};

  const buttonClasses = [baseClasses, sizeClasses[size], variantClasses[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClasses} style={fontStyle} disabled={disabled || loading} {...props}>
      {loading && (
        <span className="inline-block mr-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        </span>
      )}
      {children}
    </button>
  );
}

// Export the main component
export { MemoryButton };
export default MemoryButton;

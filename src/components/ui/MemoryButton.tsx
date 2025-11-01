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
    'focus:outline-none focus:ring-2 focus:ring-[#fcb131] focus:ring-opacity-50',
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
      'bg-gradient-to-r from-[#fcb131] to-[#f39c12] text-black',
      'hover:from-[#f39c12] hover:to-[#fcb131] border-[#fcb131]',
      'hover:shadow-[0_0_20px_rgba(252,177,49,0.5)]',
    ].join(' '),
    secondary: [
      'bg-gray-800 text-[#fcb131] border-[#fcb131]',
      'hover:bg-[#fcb131] hover:text-black',
      'hover:shadow-[0_0_15px_rgba(252,177,49,0.3)]',
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

// Export the main component and additional styled components for consistency
export { MemoryButton };
export default MemoryButton;

export function MemoryInput({
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-[#fcb131] focus:outline-none focus:ring-1 focus:ring-[#fcb131] transition-colors ${className}`}
      {...props}
    />
  );
}

export function MemoryTextarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-[#fcb131] focus:outline-none focus:ring-1 focus:ring-[#fcb131] transition-colors resize-vertical ${className}`}
      {...props}
    />
  );
}

export function MemorySelect({
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-[#fcb131] focus:outline-none focus:ring-1 focus:ring-[#fcb131] transition-colors ${className}`}
      {...props}
    />
  );
}

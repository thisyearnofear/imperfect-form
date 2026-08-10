'use client';

import React, { forwardRef } from 'react';
import '@/styles/animations.css';

/**
 * CONSOLIDATION: Single unified Button component
 * Replaces: ThemeButton + MemoryButton
 * Features:
 * - Studio-branded defaults (teal primary, no Press Start)
 * - Supports variants: primary, secondary, success, danger
 * - Responsive sizing: sm, md, lg
 * - Loading, disabled, and fullWidth states
 * - Icon + Content support
 * - Accessible focus states
 */

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

// Base styles that apply to all buttons
const BASE_CLASSES =
  'font-bold rounded-lg transition-all duration-200 transform ' +
  'shadow-lg border-2 disabled:opacity-50 disabled:cursor-not-allowed ' +
  'disabled:transform-none disabled:hover:scale-100 ' +
  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black ' +
  'inline-flex items-center justify-center gap-2';

// Size styles
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-3 text-sm',
  lg: 'px-6 py-4 text-base',
};

// Default variant styles (studio chassis: teal primary, brass accents)
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: [
    'bg-teal-600 text-white border-teal-500/60',
    'hover:bg-teal-500 border-teal-400/70',
    'hover:shadow-[0_0_20px_rgba(86,217,195,0.35)] focus:ring-teal-500',
  ].join(' '),
  secondary: [
    'bg-white/5 text-teal-100 border-teal-400/30',
    'hover:bg-white/10 border-teal-400/50',
    'focus:ring-teal-500',
  ].join(' '),
  success: [
    'bg-gradient-to-r from-green-600 to-green-700 text-white',
    'hover:from-green-700 hover:to-green-600 border-green-500',
    'hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] focus:ring-green-500',
  ].join(' '),
  danger: [
    'bg-gradient-to-r from-red-600 to-red-700 text-white',
    'hover:from-red-700 hover:to-red-600 border-red-500',
    'hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] focus:ring-red-500',
  ].join(' '),
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled = false,
      className = '',
      icon,
      children,
      type = 'button',
      onClick,
      style,
      ...props
    },
    ref
  ) => {
    // Build class names
    const buttonClasses = [
      BASE_CLASSES,
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      fullWidth ? 'w-full' : '',
      loading ? 'cursor-wait' : '',
      'btn-press', // Micro-interaction: button press feedback
      'touch-feedback', // Mobile touch feedback
      className,
    ]
      .filter(Boolean)
      .join(' ');

    // Merge styles
    const mergedStyle: React.CSSProperties = {
      ...style,
    };

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        style={mergedStyle}
        disabled={disabled || loading}
        onClick={onClick}
        {...props}
      >
        {loading && (
          <span className="inline-block">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </span>
        )}
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

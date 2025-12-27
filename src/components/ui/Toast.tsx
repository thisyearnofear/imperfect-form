'use client';

import React from 'react';
import { Toast as ToastType } from 'react-hot-toast';

type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastProps {
  t: ToastType;
  variant?: ToastVariant;
  message: string;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

/**
 * Custom Toast component with consistent styling across the app
 * Designed to work with react-hot-toast
 */
export const Toast: React.FC<ToastProps> = ({ t, variant = 'info', message, icon, onDismiss }) => {
  const getVariantStyles = (variant: ToastVariant) => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-green-900/90',
          border: 'border-green-500',
          icon: icon || '✓',
          text: 'text-green-100',
          iconColor: 'text-green-400',
        };
      case 'error':
        return {
          bg: 'bg-red-900/90',
          border: 'border-red-500',
          icon: icon || '✕',
          text: 'text-red-100',
          iconColor: 'text-red-400',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-900/90',
          border: 'border-yellow-500',
          icon: icon || '⚠',
          text: 'text-yellow-100',
          iconColor: 'text-yellow-400',
        };
      case 'loading':
        return {
          bg: 'bg-blue-900/90',
          border: 'border-blue-500',
          icon: icon || '⏳',
          text: 'text-blue-100',
          iconColor: 'text-blue-400',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-900/90',
          border: 'border-blue-500',
          icon: icon || 'ℹ',
          text: 'text-blue-100',
          iconColor: 'text-blue-400',
        };
    }
  };

  const styles = getVariantStyles(variant);

  const handleDismiss = () => {
    onDismiss?.();
  };

  return (
    <div
      className={`
        ${styles.bg}
        border ${styles.border}
        rounded-lg px-4 py-3
        flex items-center gap-3
        backdrop-blur-sm
        shadow-lg
        max-w-sm
        transform transition-all duration-300
        ${t.visible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}
      `}
    >
      {/* Icon */}
      <span className={`flex-shrink-0 text-lg ${styles.iconColor}`}>{styles.icon}</span>

      {/* Message */}
      <span className={`flex-grow text-sm font-medium ${styles.text} text-left`}>{message}</span>

      {/* Close button (only for non-loading toasts) */}
      {variant !== 'loading' && (
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 ml-2 text-lg leading-none ${styles.iconColor} hover:opacity-70 transition-opacity`}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Toast;

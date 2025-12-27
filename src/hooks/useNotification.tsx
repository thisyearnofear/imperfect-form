'use client';

import React from 'react';
import toast, { Toast } from 'react-hot-toast';
import { useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface NotificationOptions {
  duration?: number;
  id?: string;
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  icon?: React.ReactNode;
  ariaLive?: 'polite' | 'assertive';
}

interface NotificationConfig extends NotificationOptions {
  type: NotificationType;
}

/**
 * Unified notification hook for consistent UX across the app
 *
 * Usage:
 *   const notify = useNotification();
 *   notify.success('Operation successful!');
 *   notify.error('Something went wrong');
 *   notify.warning('Are you sure?');
 *   notify.info('Here is some information');
 *   const id = notify.loading('Processing...');
 *   notify.dismiss(id);
 */
export function useNotification() {
  // Get default duration based on type
  const getDefaultDuration = useCallback((type: NotificationType): number => {
    switch (type) {
      case 'success':
        return 3000;
      case 'error':
        return 4000;
      case 'warning':
        return 3500;
      case 'info':
        return 3000;
      case 'loading':
        return Infinity; // Don't auto-dismiss loading
      default:
        return 3000;
    }
  }, []);

  // Main notification function
  const notify = useCallback(
    (message: string, config: NotificationConfig): string => {
      const {
        type,
        duration = getDefaultDuration(type),
        id,
        position = 'top-center',
        icon,
        ariaLive,
      } = config;

      const toastOptions = {
        duration,
        id,
        position: position as Parameters<typeof toast>[2]['position'],
        ariaLive: ariaLive as Parameters<typeof toast>[2]['ariaLive'],
      };

      // Build styled toast message with icon and consistent formatting
      const styledMessage = (
        <div className="flex items-center gap-2">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{message}</span>
        </div>
      );

      switch (type) {
        case 'success':
          return toast.success(styledMessage, toastOptions);
        case 'error':
          return toast.error(styledMessage, toastOptions);
        case 'warning':
          return toast(styledMessage, {
            ...toastOptions,
            icon: icon || '⚠️',
          });
        case 'loading':
          return toast.loading(styledMessage, toastOptions);
        case 'info':
        default:
          return toast(styledMessage, {
            ...toastOptions,
            icon: icon || 'ℹ️',
          });
      }
    },
    [getDefaultDuration]
  );

  // Convenience methods
  const success = useCallback(
    (message: string, options?: NotificationOptions) =>
      notify(message, { type: 'success', ...options }),
    [notify]
  );

  const error = useCallback(
    (message: string, options?: NotificationOptions) =>
      notify(message, { type: 'error', ...options }),
    [notify]
  );

  const warning = useCallback(
    (message: string, options?: NotificationOptions) =>
      notify(message, { type: 'warning', ...options }),
    [notify]
  );

  const info = useCallback(
    (message: string, options?: NotificationOptions) =>
      notify(message, { type: 'info', ...options }),
    [notify]
  );

  const loading = useCallback(
    (message: string, options?: NotificationOptions) =>
      notify(message, { type: 'loading', ...options }),
    [notify]
  );

  const dismiss = useCallback((id?: string) => {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  }, []);

  const promise = useCallback(
    <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      },
      options?: NotificationOptions
    ) => {
      return toast.promise(
        promise,
        {
          loading: messages.loading,
          success: messages.success,
          error: messages.error,
        },
        {
          duration: undefined,
          position: options?.position as Parameters<typeof toast.promise>[2]['position'],
        }
      );
    },
    []
  );

  return {
    notify,
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    promise,
  };
}

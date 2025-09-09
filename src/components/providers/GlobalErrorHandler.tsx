'use client';

import { useEffect } from 'react';

/**
 * GlobalErrorHandler component to catch unhandled promise rejections and errors
 */
export default function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent the default error overlay
      event.preventDefault();

      // Log rejection without crashing the app
      console.warn('Unhandled Promise Rejection:', event.reason);

      // If the reason is an Error object, extract the message
      const errorMessage =
        event.reason instanceof Error ? event.reason.message : String(event.reason);

      console.warn('Error Details:', errorMessage);
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      // Prevent the default error overlay
      event.preventDefault();

      // Log error without crashing the app
      console.warn('Uncaught Error:', event.error || event.message);
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Clean up event listeners
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

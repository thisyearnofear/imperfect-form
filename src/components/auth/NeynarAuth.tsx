'use client';

import React, { useEffect, useRef } from 'react';
import { useNeynarAuth } from '@/contexts/NeynarAuthContext';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('NeynarAuth');

interface NeynarAuthProps {
  clientId: string;
  theme?: 'light' | 'dark';
  className?: string;
  onSuccess?: (user: unknown) => void;
  onError?: (error: string) => void;
}

export function NeynarAuth({
  clientId,
  theme = 'dark',
  className = '',
  onSuccess,
  onError,
}: NeynarAuthProps) {
  const { user, isAuthenticated, signOut } = useNeynarAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  // Load SIWN script
  useEffect(() => {
    if (scriptLoadedRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://neynarxyz.github.io/siwn/raw/1.2.0/index.js';
    script.async = true;

    script.onload = () => {
      logger.info('SIWN script loaded successfully');
      scriptLoadedRef.current = true;
    };

    script.onerror = () => {
      logger.error('Failed to load SIWN script');
      onError?.('Failed to load authentication script');
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [onError]);

  // Set up success callback
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (
        window as unknown as { onNeynarSignInSuccess?: (data: unknown) => void }
      ).onNeynarSignInSuccess = (data: unknown) => {
        logger.info('SIWN success callback triggered');
        onSuccess?.(data);

        // The NeynarAuthContext will handle the actual user state update
        // through its own global callback
      };
    }
  }, [onSuccess]);

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="flex items-center space-x-2">
          {user.pfp_url && (
            <img
              src={user.pfp_url}
              alt={`${user.display_name} profile`}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">{user.display_name}</span>
            <span className="text-xs text-gray-400">@{user.username}</span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={buttonRef}
        className="neynar_signin"
        data-client_id={clientId}
        data-success-callback="onNeynarSignInSuccess"
        data-theme={theme}
      />
    </div>
  );
}

// Compact version for use in modals/smaller spaces
export function CompactNeynarAuth({
  clientId,
  theme = 'dark',
  className = '',
  onSuccess,
  onError,
}: NeynarAuthProps) {
  const { user, isAuthenticated } = useNeynarAuth();

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {user.pfp_url && (
          <img
            src={user.pfp_url}
            alt={`${user.display_name} profile`}
            className="w-6 h-6 rounded-full"
          />
        )}
        <span className="text-sm text-white">@{user.username}</span>
      </div>
    );
  }

  return (
    <NeynarAuth
      clientId={clientId}
      theme={theme}
      className={className}
      onSuccess={onSuccess}
      onError={onError}
    />
  );
}

// Hook to get the optional Neynar client ID from the environment.
// A missing ID disables Neynar sign-in without affecting camera coaching,
// local movement history, or the manual sharing fallback.
export function useNeynarClientId(): string | null {
  return process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID || null;
}

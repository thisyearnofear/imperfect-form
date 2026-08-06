'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { TOGGLE_AUTH_DEBUG_EVENT } from '@/lib/appEvents';

interface AuthDebugPanelProps {
  show?: boolean;
  className?: string;
}

/**
 * Debug panel to show authentication state
 * Only shows in development mode
 */
export default function AuthDebugPanel({ show = false, className = '' }: AuthDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { platform, isReady, wallet, user, error } = usePlatform();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;
    setIsVisible(show || window.localStorage.getItem('DEBUG_AUTH') === 'true');
  }, [show]);

  // Toggle the panel with a keyboard shortcut (Ctrl+Shift+D) or a custom event.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return;

    const togglePanel = () => {
      setIsVisible((prev) => {
        const next = !prev;
        window.localStorage.setItem('DEBUG_AUTH', String(next));
        return next;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === '\\') {
        e.preventDefault();
        togglePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(TOGGLE_AUTH_DEBUG_EVENT, togglePanel);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(TOGGLE_AUTH_DEBUG_EVENT, togglePanel);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development' || !isVisible) return null;

  const getStatusColor = () => {
    if (error) return 'bg-red-900/50 border-red-500';
    if (!isReady) return 'bg-yellow-900/50 border-yellow-500';
    if (wallet.isConnected) return 'bg-green-900/50 border-green-500';
    return 'bg-gray-900/50 border-gray-500';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (!isReady) return 'Initializing';
    if (wallet.isConnecting) return 'Connecting';
    if (wallet.isConnected) return 'Connected';
    return 'Disconnected';
  };

  return (
    <div className={`fixed bottom-4 left-4 z-50 ${className}`}>
      <div className={`p-3 rounded-lg border text-xs font-mono ${getStatusColor()}`}>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold">Auth Status:</span>
            <span
              className={`px-2 py-1 rounded text-xs ${
                wallet.isConnected ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              {getStatusText()}
            </span>
          </div>

          <div>
            <span className="font-bold">Platform:</span> {platform}
          </div>

          {wallet.address && (
            <div>
              <span className="font-bold">Address:</span> {wallet.address.slice(0, 6)}...
              {wallet.address.slice(-4)}
            </div>
          )}

          {wallet.chainId && (
            <div>
              <span className="font-bold">Chain:</span> {wallet.chainId}
            </div>
          )}

          {wallet.provider && (
            <div>
              <span className="font-bold">Provider:</span> {wallet.provider}
            </div>
          )}

          {user && (
            <div>
              <span className="font-bold">User:</span>{' '}
              {user.displayName || user.username || 'Unknown'}
            </div>
          )}

          {error && (
            <div className="text-red-300">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { usePlatform } from '@/contexts/PlatformContext';

interface AuthDebugPanelProps {
  show?: boolean;
  className?: string;
}

/**
 * Debug panel to show authentication state
 * Only shows in development mode
 */
export default function AuthDebugPanel({
  show = process.env.NODE_ENV === 'development',
  className = '',
}: AuthDebugPanelProps) {
  const { platform, isReady, wallet, user, error } = usePlatform();

  if (!show) return null;

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

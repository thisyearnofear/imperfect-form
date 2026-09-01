'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui';
import { usePlatform } from '@/contexts/PlatformContext';
import { isFarcasterMiniApp, isBraveBrowser } from '@/utils/farcasterMiniApp';
import toast from 'react-hot-toast';

interface WalletConnectionTroubleshooterProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  showTitle?: boolean;
  className?: string;
}

/**
 * Wallet Connection Troubleshooter
 *
 * Provides users with multiple connection options when they experience issues:
 * - Automatic detection and fixes for common problems
 * - WalletConnect fallback for difficult environments
 * - Platform-specific guidance and solutions
 * - Clear error explanations and recovery steps
 */
export default function WalletConnectionTroubleshooter({
  onSuccess,
  onCancel,
  showTitle = true,
  className = '',
}: WalletConnectionTroubleshooterProps) {
  const { actions, wallet } = usePlatform();
  const [isAttempting, setIsAttempting] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detect environment for specific guidance
  const isFarcaster = isFarcasterMiniApp();
  const isBrave = isBraveBrowser();
  const hasWalletConnect = !isFarcaster; // WalletConnect is available for non-Farcaster platforms

  // Handle connection attempt
  const attemptConnection = async (method: string, _forceWalletConnect = false) => {
    setIsAttempting(method);

    try {
      let success = false;

      switch (method) {
        case 'auto':
          success = await actions.connect();
          break;
        case 'walletconnect':
          success = await actions.connect('walletConnect');
          break;
        case 'reconnect':
          success = await actions.connect();
          break;
        case 'cleanup':
          // Cleanup handled automatically
          success = await actions.connect();
          break;
        default:
          success = await actions.connect();
      }

      if (success) {
        toast.success(`Connected successfully via ${method}!`);
        onSuccess?.();
      } else {
        toast.error(`${method} connection failed. Try another method.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${method} failed`;
      toast.error(errorMessage);
    } finally {
      setIsAttempting(null);
    }
  };

  // Environment-specific issue detection
  const getEnvironmentIssues = () => {
    const issues = [];

    if (isFarcaster) {
      if (false) {
        // Provider ready check removed
        issues.push({
          type: 'farcaster-provider',
          title: 'Farcaster Wallet Not Ready',
          description: 'Your Farcaster wallet needs to be connected in the main app.',
          solution: 'Open your wallet in the Farcaster app, then return here.',
          severity: 'high',
        });
      }
    }

    if (isBrave) {
      issues.push({
        type: 'brave-privacy',
        title: 'Brave Browser Privacy Settings',
        description: "Brave's privacy features may block wallet connections.",
        solution: 'Try WalletConnect or adjust Brave Shield settings.',
        severity: 'medium',
      });
    }

    if (false) {
      // Session error check removed
      issues.push({
        type: 'session-error',
        title: 'Wallet Session Issue',
        description: 'Your wallet session may be corrupted or expired.',
        solution: 'Clear browser data or try WalletConnect.',
        severity: 'medium',
      });
    }

    return issues;
  };

  const environmentIssues = getEnvironmentIssues();

  return (
    <div className={`bg-black border-2 border-primary rounded-lg p-6 space-y-6 ${className}`}>
      {showTitle && (
        <div className="text-center">
          <h3
            className="text-lg font-bold text-primary mb-2"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            Wallet Connection Issues?
          </h3>
          <p className="text-sm text-primary opacity-80">
            Let's get you connected with the best method for your setup
          </p>
        </div>
      )}

      {/* Current Status */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-primary">Current Status:</span>
          <span
            className={`text-xs px-2 py-1 rounded ${
              wallet.isConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}
          >
            {wallet.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {wallet.address && (
          <p className="text-xs text-gray-400 mb-1">
            Address: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        )}

        {wallet.provider && (
          <p className="text-xs text-gray-400 mb-1">Provider: {wallet.provider}</p>
        )}
      </div>

      {/* Environment Issues */}
      {environmentIssues.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-primary">Detected Issues:</h4>
          {environmentIssues.map((issue, index) => (
            <div
              key={index}
              className={`p-3 rounded border ${
                issue.severity === 'high'
                  ? 'bg-red-900/20 border-red-700'
                  : 'bg-yellow-900/20 border-yellow-700'
              }`}
            >
              <h5 className="text-sm font-semibold text-primary mb-1">{issue.title}</h5>
              <p className="text-xs text-gray-300 mb-2">{issue.description}</p>
              <p className="text-xs text-primary opacity-80">{issue.solution}</p>
            </div>
          ))}
        </div>
      )}

      {/* Connection Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-primary">Try These Solutions:</h4>

        {/* Quick Fix Button */}
        <button
          onClick={() => attemptConnection('auto')}
          disabled={isAttempting !== null}
          className="w-full px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-black font-bold rounded-lg hover:from-primary-dark hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '11px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {isAttempting === 'auto' && <Spinner />}
          <span>🔧 Quick Fix</span>
        </button>

        {/* WalletConnect Option */}
        {hasWalletConnect && (
          <button
            onClick={() => attemptConnection('walletconnect')}
            disabled={isAttempting !== null}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '11px',
            }}
          >
            {isAttempting === 'walletconnect' && <Spinner />}
            <span>🔗 Use WalletConnect</span>
          </button>
        )}

        {/* Platform-specific recommendations */}
        {isFarcaster && (
          <div className="p-3 bg-purple-900/20 border border-purple-700 rounded">
            <h5 className="text-sm font-semibold text-primary mb-2">🎯 Farcaster Users:</h5>
            <p className="text-xs text-gray-300 mb-2">
              Make sure your wallet is connected in the main Farcaster app first.
            </p>
            <button
              onClick={() => attemptConnection('reconnect')}
              disabled={isAttempting !== null}
              className="w-full px-3 py-2 bg-studio-teal-cta text-black rounded text-xs font-semibold hover:bg-studio-teal-bright transition-colors"
            >
              {isAttempting === 'reconnect' && <Spinner className="w-3 h-3" />}
              Retry Farcaster Connection
            </button>
          </div>
        )}

        {isBrave && (
          <div className="p-3 bg-orange-900/20 border border-orange-700 rounded">
            <h5 className="text-sm font-semibold text-primary mb-2">🦁 Brave Browser:</h5>
            <p className="text-xs text-gray-300 mb-2">
              Brave's privacy features can interfere with wallet connections. WalletConnect usually
              works better.
            </p>
            {hasWalletConnect && (
              <button
                onClick={() => attemptConnection('walletconnect')}
                disabled={isAttempting !== null}
                className="w-full px-3 py-2 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700 transition-colors"
              >
                {isAttempting === 'walletconnect' && <Spinner className="w-3 h-3" />}
                Try WalletConnect (Recommended)
              </button>
            )}
          </div>
        )}

        {/* Advanced Options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full text-xs text-primary opacity-60 hover:opacity-80 transition-opacity"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-2 pl-4 border-l-2 border-gray-700">
            <button
              onClick={() => attemptConnection('cleanup')}
              disabled={isAttempting !== null}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded text-xs font-semibold hover:bg-gray-600 transition-colors flex items-center justify-center space-x-2"
            >
              {isAttempting === 'cleanup' && <Spinner className="w-3 h-3" />}
              <span>🧹 Clear Cache & Reconnect</span>
            </button>

            <button
              onClick={() => actions.disconnect()}
              className="w-full px-3 py-2 bg-red-700 text-white rounded text-xs font-semibold hover:bg-red-600 transition-colors"
            >
              🔌 Force Disconnect
            </button>

            <div className="p-2 bg-gray-800 rounded text-xs">
              <p className="text-gray-300 mb-1">Debug Info:</p>
              <p className="text-gray-400">
                Environment: {isFarcaster ? 'Farcaster' : isBrave ? 'Brave' : 'Web'}
              </p>
              <p className="text-gray-400">
                WalletConnect: {hasWalletConnect ? 'Available' : 'Not configured'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(onSuccess || onCancel) && (
        <div className="flex space-x-3 pt-4 border-t border-gray-700">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded font-semibold hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
          )}
          {onSuccess && wallet.isConnected && (
            <button
              onClick={onSuccess}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition-colors text-sm"
            >
              Continue
            </button>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="text-center pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-400">
          Still having issues?{' '}
          <button
            onClick={() => {
              toast.success('Check our troubleshooting guide or contact support!', {
                duration: 4000,
              });
            }}
            className="text-primary hover:underline"
          >
            Get additional help
          </button>
        </p>
      </div>
    </div>
  );
}
